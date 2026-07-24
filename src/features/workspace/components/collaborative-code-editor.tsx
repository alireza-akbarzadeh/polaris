"use client";

import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { yCollab } from "y-codemirror.next";
import * as Y from "yjs";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CodeEditor } from "@/features/workspace/components/code-editor";
import { LiveblocksFileRoom } from "@/features/workspace/components/liveblocks-file-room";
import {
  clearFileContentDraft,
  loadFileContentDraft,
  resolveSeedContent,
  saveFileContentDraft,
  shouldApplyExternalContent,
  shouldReseedLiveblocks,
} from "@/features/workspace/lib/file-content-drafts";
import {
  collabCursorTheme,
  softCollaboratorColor,
} from "@/features/workspace/lib/collab-cursor-theme";
import { useRoom, useStatus, useUpdateMyPresence } from "@/liveblocks.config";

type CollaborativeCodeEditorProps = {
  projectId: string;
  filePath: string;
  initialContent: string;
  /** Server `updatedAt` — used to decide whether a local draft wins on refresh. */
  serverUpdatedAt?: number;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
};

function replaceYText(ydoc: Y.Doc, ytext: Y.Text, next: string) {
  const current = ytext.toString();
  if (current === next) return;

  ydoc.transact(() => {
    const len = ytext.toString().length;
    if (len > 0) {
      ytext.delete(0, len);
    }
    if (next) {
      ytext.insert(0, next);
    }
  });
}

function LiveblocksCollaborativeEditor({
  projectId,
  filePath,
  initialContent,
  serverUpdatedAt,
  readOnly = false,
  onContentChange,
}: CollaborativeCodeEditorProps) {
  const room = useRoom();
  const status = useStatus();
  const updateMyPresence = useUpdateMyPresence();
  const updateContent = useMutation(api.projectFiles.updateContent);

  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  /** Bumped when AI/Convex content is applied so stale debounced saves are dropped. */
  const saveEpochRef = useRef(0);
  const seededRef = useRef(false);
  const initialContentRef = useRef(initialContent);
  const serverUpdatedAtRef = useRef(serverUpdatedAt);
  const onContentChangeRef = useRef(onContentChange);
  const readOnlyRef = useRef(readOnly);
  const acceptRemoteEditsRef = useRef(false);
  const applyingExternalRef = useRef(false);
  const lastEmptyReseedAtRef = useRef(0);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(initialContent);
  const [collabExtensions, setCollabExtensions] = useState<Extension[] | null>(
    null,
  );

  initialContentRef.current = initialContent;
  serverUpdatedAtRef.current = serverUpdatedAt;
  onContentChangeRef.current = onContentChange;
  readOnlyRef.current = readOnly;

  const knownContent = () =>
    loadFileContentDraft(projectId, filePath)?.content ||
    initialContentRef.current ||
    value;

  const cancelPendingSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingContentRef.current = null;
  };

  const persistToServerRef = useRef<(content: string, epoch: number) => void>(
    () => {},
  );
  persistToServerRef.current = (content: string, epoch: number) => {
    if (epoch !== saveEpochRef.current) return;

    const known = knownContent();
    // Never let an empty buffer wipe a known non-empty file (AI write / draft).
    if (!content && known) return;

    // If draft is newer and differs, a stale autosave lost the race with AI.
    const draft = loadFileContentDraft(projectId, filePath);
    if (
      draft &&
      draft.content &&
      draft.content !== content &&
      Date.now() - draft.updatedAt < 5000 &&
      draft.content.length >= content.length
    ) {
      return;
    }

    pendingContentRef.current = null;

    void updateContent({
      projectId: projectId as Id<"projects">,
      path: filePath,
      content,
    })
      .then(() => {
        if (epoch !== saveEpochRef.current) return;
        const latest = loadFileContentDraft(projectId, filePath);
        if (latest && latest.content === content) {
          clearFileContentDraft(projectId, filePath, { keepMemory: true });
        }
      })
      .catch(() => {
        if (epoch !== saveEpochRef.current) return;
        saveFileContentDraft(projectId, filePath, content);
      });
  };

  const scheduleServerSave = (content: string) => {
    const known = knownContent();
    if (!content && known) return;

    pendingContentRef.current = content;
    const epoch = saveEpochRef.current;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      persistToServerRef.current(content, epoch);
    }, 800);
  };

  const flushPendingSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (readOnlyRef.current) return;

    const fromView = viewRef.current?.state.doc.toString();
    const fromYjs = ytextRef.current?.toString();
    const content =
      fromView ?? fromYjs ?? pendingContentRef.current ?? null;
    if (content === null) return;

    const known = knownContent();
    if (!content && known) {
      persistToServerRef.current(known, saveEpochRef.current);
      return;
    }

    saveFileContentDraft(projectId, filePath, content);
    pendingContentRef.current = content;
    persistToServerRef.current(content, saveEpochRef.current);
  };

  const publishLocal = (text: string) => {
    setValue(text);
    onContentChangeRef.current?.(text);
  };

  const bindCollabExtensions = (ytext: Y.Text) => {
    const provider = getYjsProviderForRoom(room);
    undoManagerRef.current?.destroy();
    const undoManager = new Y.UndoManager(ytext);
    undoManagerRef.current = undoManager;
    setCollabExtensions([
      collabCursorTheme,
      ...(yCollab(ytext, provider.awareness, {
        undoManager: readOnlyRef.current ? false : undoManager,
      }) as Extension[]),
    ]);
    setReady(true);
  };

  /**
   * Apply Convex/AI content into the open editor without blanking the UI.
   * Prefer a CodeMirror replace (y-collab syncs safely) over raw Y.Text mutation.
   */
  const applyExternalContent = (next: string) => {
    if (!next) return;
    if (applyingExternalRef.current) return;

    const currentY = ytextRef.current?.toString() ?? "";
    const currentView = viewRef.current?.state.doc.toString() ?? value;
    if (currentY === next || currentView === next) {
      saveFileContentDraft(projectId, filePath, next);
      publishLocal(next);
      return;
    }

    applyingExternalRef.current = true;
    saveEpochRef.current += 1;
    cancelPendingSave();
    saveFileContentDraft(projectId, filePath, next);
    publishLocal(next);

    const view = viewRef.current;
    if (view && ready) {
      try {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: next,
          },
          userEvent: "external",
        });
      } catch (error) {
        console.warn("[collab] CM external replace failed", error);
        const ytext = ytextRef.current;
        const ydoc = ydocRef.current;
        if (ytext && ydoc) {
          try {
            replaceYText(ydoc, ytext, next);
          } catch (yError) {
            console.warn("[collab] Y.Text external replace failed", yError);
          }
        }
      } finally {
        applyingExternalRef.current = false;
      }
      return;
    }

    // Collab not bound yet — mutate Y.Text directly, then bind.
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (ytext && ydoc) {
      try {
        replaceYText(ydoc, ytext, next);
      } catch (error) {
        console.warn("[collab] Y.Text seed/replace failed", error);
      }
    }
    applyingExternalRef.current = false;
  };

  useEffect(() => {
    seededRef.current = false;
    acceptRemoteEditsRef.current = false;
    setReady(false);
    setCollabExtensions(null);
    viewRef.current = null;
    saveEpochRef.current += 1;
    cancelPendingSave();

    if (status !== "connected") return;

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = ydoc.getText("codemirror");
    ytextRef.current = ytext;
    ydocRef.current = ydoc;

    const self = room.getSelf();
    const userColor = self?.info?.color ?? "#90A4AE";
    const displayName = self?.info?.name?.trim() || "User";
    provider.awareness.setLocalStateField("user", {
      name: displayName.split(" ")[0] ?? displayName,
      color: userColor,
      colorLight: softCollaboratorColor(userColor),
    });

    let onSync: ((isSynced: boolean) => void) | null = null;
    let cancelled = false;

    const resolveSeed = () => {
      const draft = loadFileContentDraft(projectId, filePath);
      return resolveSeedContent(
        initialContentRef.current,
        serverUpdatedAtRef.current,
        draft,
      );
    };

    const seedIfNeeded = () => {
      if (seededRef.current) return;
      const seed = resolveSeed();
      const current = ytext.toString();
      if (shouldReseedLiveblocks(current, seed)) {
        try {
          replaceYText(ydoc, ytext, seed);
        } catch (error) {
          console.warn("[collab] seed failed", error);
        }
        saveFileContentDraft(projectId, filePath, seed);
        if (seed !== initialContentRef.current && !readOnlyRef.current) {
          scheduleServerSave(seed);
        }
      }
      seededRef.current = true;
    };

    const finishSetup = () => {
      if (cancelled) return;
      seedIfNeeded();
      const text = ytext.toString() || resolveSeed();
      publishLocal(text);
      acceptRemoteEditsRef.current = true;
      bindCollabExtensions(ytext);
    };

    const onText = () => {
      if (applyingExternalRef.current) return;

      const text = ytext.toString();
      const seed = resolveSeed();
      const known =
        loadFileContentDraft(projectId, filePath)?.content ||
        initialContentRef.current ||
        seed;

      // Empty Liveblocks pulse must never blank the UI or Convex after AI writes.
      if (!text && known) {
        if (!acceptRemoteEditsRef.current) return;
        const now = Date.now();
        // Avoid a tight reseed loop if Y.Text keeps bouncing empty.
        if (now - lastEmptyReseedAtRef.current < 750) {
          publishLocal(known);
          return;
        }
        lastEmptyReseedAtRef.current = now;
        applyExternalContent(known);
        return;
      }

      if (!acceptRemoteEditsRef.current && !text && seed) return;

      publishLocal(text);

      if (readOnlyRef.current) return;
      if (!text && known) return;

      saveFileContentDraft(projectId, filePath, text);
      scheduleServerSave(text);
    };

    ytext.observe(onText);

    if (provider.synced) {
      finishSetup();
    } else {
      onSync = (isSynced: boolean) => {
        if (!isSynced) return;
        if (onSync) provider.off("sync", onSync);
        finishSetup();
      };
      provider.on("sync", onSync);
    }

    const onPageHide = () => flushPendingSave();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      acceptRemoteEditsRef.current = false;
      if (onSync) provider.off("sync", onSync);
      ytext.unobserve(onText);
      undoManagerRef.current?.destroy();
      undoManagerRef.current = null;
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flushPendingSave();
      ytextRef.current = null;
      ydocRef.current = null;
      setCollabExtensions(null);
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room/file identity
  }, [filePath, projectId, room, status]);

  // Push Convex/AI writes into the open editor.
  useEffect(() => {
    if (readOnly) return;
    if (!initialContent) return;

    const ytext = ytextRef.current;
    const current = ytext?.toString() ?? value;
    const draft = loadFileContentDraft(projectId, filePath);

    if (
      !shouldApplyExternalContent({
        ytextContent: current,
        serverContent: initialContent,
        serverUpdatedAt,
        draft,
      })
    ) {
      // Recover UI if we somehow show empty while Convex/AI has content.
      if (!value && initialContent) {
        publishLocal(initialContent);
      }
      return;
    }

    applyExternalContent(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- server buffer changes
  }, [
    filePath,
    initialContent,
    projectId,
    readOnly,
    serverUpdatedAt,
    status,
  ]);

  useEffect(() => {
    if (!ready || readOnly) return;

    const publish = () => {
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      updateMyPresence({
        cursor: { anchor: sel.anchor, head: sel.head },
      });
    };

    publish();
    const interval = window.setInterval(publish, 500);
    return () => window.clearInterval(interval);
  }, [ready, readOnly, updateMyPresence]);

  const extensions = useMemo(() => collabExtensions ?? [], [collabExtensions]);

  const displayValue =
    value ||
    initialContent ||
    loadFileContentDraft(projectId, filePath)?.content ||
    "";

  const fallbackOnChange = readOnly
    ? undefined
    : (next: string) => {
        if (!next && knownContent()) return;
        publishLocal(next);
        saveFileContentDraft(projectId, filePath, next);
        scheduleServerSave(next);
      };

  if (status === "connecting" || status === "initial" || !ready) {
    return (
      <div className="relative h-full min-h-0">
        <CodeEditor
          value={displayValue}
          filePath={filePath}
          readOnly={readOnly}
          onChange={fallbackOnChange}
        />
        {status === "disconnected" ? null : (
          <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-ws-panel/90 px-2 py-1 text-[10px] text-ws-text-muted">
            Connecting live collaboration…
          </div>
        )}
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="relative h-full min-h-0">
        <CodeEditor
          value={displayValue}
          filePath={filePath}
          readOnly={readOnly}
          onChange={fallbackOnChange}
        />
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-ws-panel/90 px-2 py-1 text-[10px] text-ws-text-muted">
          Reconnecting live collaboration…
        </div>
      </div>
    );
  }

  return (
    <CodeEditor
      value={displayValue}
      filePath={filePath}
      readOnly={readOnly}
      collabExtensions={extensions}
      onChange={undefined}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
    />
  );
}

export function CollaborativeCodeEditor(props: CollaborativeCodeEditorProps) {
  return (
    <LiveblocksFileRoom projectId={props.projectId} filePath={props.filePath}>
      <LiveblocksCollaborativeEditor {...props} />
    </LiveblocksFileRoom>
  );
}
