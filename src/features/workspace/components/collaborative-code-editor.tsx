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

/**
 * Replace Y.Text contents. Must only run while CodeMirror/y-collab is unbound,
 * otherwise y-codemirror can throw RangeError when CM doc length ≠ Y length.
 */
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
  const seededRef = useRef(false);
  const initialContentRef = useRef(initialContent);
  const serverUpdatedAtRef = useRef(serverUpdatedAt);
  const onContentChangeRef = useRef(onContentChange);
  const readOnlyRef = useRef(readOnly);
  const acceptRemoteEditsRef = useRef(false);
  const applyingExternalRef = useRef(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(initialContent);
  const [collabExtensions, setCollabExtensions] = useState<Extension[] | null>(
    null,
  );

  initialContentRef.current = initialContent;
  serverUpdatedAtRef.current = serverUpdatedAt;
  onContentChangeRef.current = onContentChange;
  readOnlyRef.current = readOnly;

  const ytextRef = useRef<Y.Text | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  const persistToServerRef = useRef<(content: string) => void>(() => {});
  persistToServerRef.current = (content: string) => {
    pendingContentRef.current = null;

    const known =
      loadFileContentDraft(projectId, filePath)?.content ||
      initialContentRef.current;
    if (!content && known) {
      return;
    }

    void updateContent({
      projectId: projectId as Id<"projects">,
      path: filePath,
      content,
    })
      .then(() => {
        const draft = loadFileContentDraft(projectId, filePath);
        if (draft && draft.content === content) {
          clearFileContentDraft(projectId, filePath, { keepMemory: true });
        }
      })
      .catch(() => {
        saveFileContentDraft(projectId, filePath, content);
      });
  };

  const scheduleServerSave = (content: string) => {
    pendingContentRef.current = content;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      persistToServerRef.current(content);
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

    const known =
      loadFileContentDraft(projectId, filePath)?.content ||
      initialContentRef.current;
    if (!content && known) {
      pendingContentRef.current = known;
      persistToServerRef.current(known);
      return;
    }

    saveFileContentDraft(projectId, filePath, content);
    pendingContentRef.current = content;
    persistToServerRef.current(content);
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
   * Mutate Y.Text only after unbinding CodeMirror so y-collab cannot apply
   * a delete/insert against a desynced empty editor doc.
   */
  const applyExternalToYText = (next: string) => {
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;

    applyingExternalRef.current = true;
    saveFileContentDraft(projectId, filePath, next);
    setValue(next);
    onContentChangeRef.current?.(next);

    // Unmount CM / y-collab first.
    viewRef.current = null;
    setCollabExtensions(null);
    setReady(false);

    queueMicrotask(() => {
      try {
        if (ytextRef.current === ytext && ydocRef.current === ydoc) {
          replaceYText(ydoc, ytext, next);
        }
      } catch (error) {
        console.warn("[collab] failed to apply external content to Y.Text", error);
      } finally {
        applyingExternalRef.current = false;
        if (ytextRef.current === ytext) {
          bindCollabExtensions(ytext);
        }
      }
    });
  };

  useEffect(() => {
    seededRef.current = false;
    acceptRemoteEditsRef.current = false;
    setReady(false);
    setCollabExtensions(null);
    viewRef.current = null;

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
        // y-collab is not bound yet during finishSetup — safe to mutate.
        try {
          replaceYText(ydoc, ytext, seed);
        } catch (error) {
          console.warn("[collab] seed failed", error);
          // Fall back: keep React/draft buffer even if Y.Text rejects.
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
      setValue(text);
      onContentChangeRef.current?.(text);
      acceptRemoteEditsRef.current = true;
      bindCollabExtensions(ytext);
    };

    const onText = () => {
      if (applyingExternalRef.current) return;

      const text = ytext.toString();

      if (!acceptRemoteEditsRef.current) {
        const seed = resolveSeed();
        if (!text && seed) return;
      }

      setValue(text);
      onContentChangeRef.current?.(text);

      if (readOnlyRef.current) return;

      const known =
        loadFileContentDraft(projectId, filePath)?.content ||
        initialContentRef.current;
      if (!text && known) {
        // Never persist an empty Liveblocks pulse over known Convex/AI content.
        return;
      }

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
    // applyExternalToYText / bindCollabExtensions close over room + paths;
    // room/status/file identity is the true dependency set.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [filePath, projectId, room, status]);

  // Push Convex/AI writes into Y.Doc when this file is open.
  useEffect(() => {
    if (readOnly) return;
    if (status !== "connected") return;

    const ytext = ytextRef.current;
    if (!ytext) return;

    const current = ytext.toString();
    const draft = loadFileContentDraft(projectId, filePath);
    if (
      !shouldApplyExternalContent({
        ytextContent: current,
        serverContent: initialContent,
        serverUpdatedAt,
        draft,
      })
    ) {
      // Still surface Convex/AI text in the local fallback editor.
      if (initialContent && initialContent !== value) {
        const preferLocal =
          draft &&
          draft.content !== initialContent &&
          serverUpdatedAt !== undefined &&
          draft.updatedAt > serverUpdatedAt;
        if (!preferLocal && (!value || value === current)) {
          setValue(initialContent);
          onContentChangeRef.current?.(initialContent);
        }
      }
      return;
    }

    applyExternalToYText(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply when server buffer changes
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

  // Always show the buffer while Liveblocks connects — never a blank spinner
  // that hides AI-written Convex content.
  if (status === "connecting" || status === "initial" || !ready) {
    return (
      <div className="relative h-full min-h-0">
        <CodeEditor
          value={displayValue}
          filePath={filePath}
          readOnly={readOnly}
          onChange={
            readOnly
              ? undefined
              : (next) => {
                  setValue(next);
                  onContentChangeRef.current?.(next);
                  saveFileContentDraft(projectId, filePath, next);
                  scheduleServerSave(next);
                }
          }
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
          onChange={
            readOnly
              ? undefined
              : (next) => {
                  setValue(next);
                  onContentChangeRef.current?.(next);
                  saveFileContentDraft(projectId, filePath, next);
                  scheduleServerSave(next);
                }
          }
        />
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-ws-panel/90 px-2 py-1 text-[10px] text-ws-text-muted">
          Reconnecting live collaboration…
        </div>
      </div>
    );
  }

  return (
    <CodeEditor
      value={value}
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
