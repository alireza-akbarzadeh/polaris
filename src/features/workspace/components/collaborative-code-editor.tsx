"use client";

import { getYjsProviderForRoom } from "@liveblocks/yjs";
import type { editor } from "monaco-editor";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CodeEditor } from "@/features/workspace/components/code-editor";
import { LiveblocksFileRoom } from "@/features/workspace/components/liveblocks-file-room";
import { softCollaboratorColor } from "@/features/workspace/lib/collab-cursor-theme";
import {
  clearFileContentDraft,
  loadFileContentDraft,
  resolveSeedContent,
  saveFileContentDraft,
  shouldApplyExternalContent,
  shouldReseedLiveblocks,
} from "@/features/workspace/lib/file-content-drafts";
import { MonacoBinding } from "@/features/workspace/lib/y-monaco-binding";
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

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
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
  const ytextRef = useRef<Y.Text | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const persistToServerRef = useRef<(content: string, epoch: number) => void>(
    () => {},
  );

  const [ready, setReady] = useState(false);
  const [collabReady, setCollabReady] = useState(false);
  const [value, setValue] = useState(initialContent);

  useEffect(() => {
    initialContentRef.current = initialContent;
    serverUpdatedAtRef.current = serverUpdatedAt;
    onContentChangeRef.current = onContentChange;
    readOnlyRef.current = readOnly;
  }, [initialContent, onContentChange, readOnly, serverUpdatedAt]);

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

  useEffect(() => {
    persistToServerRef.current = (content: string, epoch: number) => {
      if (epoch !== saveEpochRef.current) return;

      const known =
        loadFileContentDraft(projectId, filePath)?.content ||
        initialContentRef.current ||
        value;
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
  }, [filePath, projectId, updateContent, value]);

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

    const fromEditor = editorRef.current?.getModel()?.getValue();
    const fromYjs = ytextRef.current?.toString();
    const content =
      fromEditor ?? fromYjs ?? pendingContentRef.current ?? null;
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

  const bindMonaco = (ed: editor.IStandaloneCodeEditor) => {
    const ytext = ytextRef.current;
    const awareness = awarenessRef.current;
    const model = ed.getModel();
    if (!ytext || !awareness || !model) return;

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([ed]),
      awareness,
    );
    setCollabReady(true);
  };

  /**
   * Apply Convex/AI content into the open editor without blanking the UI.
   * Prefer a Monaco model replace (y-monaco syncs safely) over raw Y.Text mutation.
   */
  const applyExternalContent = (next: string) => {
    if (!next) return;
    if (applyingExternalRef.current) return;

    const currentY = ytextRef.current?.toString() ?? "";
    const currentEditor = editorRef.current?.getModel()?.getValue() ?? value;
    if (currentY === next || currentEditor === next) {
      saveFileContentDraft(projectId, filePath, next);
      publishLocal(next);
      return;
    }

    applyingExternalRef.current = true;
    saveEpochRef.current += 1;
    cancelPendingSave();
    saveFileContentDraft(projectId, filePath, next);
    publishLocal(next);

    const ed = editorRef.current;
    const model = ed?.getModel();
    if (ed && model && ready) {
      try {
        const fullRange = model.getFullModelRange();
        ed.executeEdits("polaris-external", [
          { range: fullRange, text: next },
        ]);
      } catch (error) {
        console.warn("[collab] Monaco external replace failed", error);
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
    // Reset collab gate when the room/file identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional lifecycle reset
    setReady(false);
    setCollabReady(false);
    bindingRef.current?.destroy();
    bindingRef.current = null;
    editorRef.current = null;
    saveEpochRef.current += 1;
    cancelPendingSave();

    if (status !== "connected") return;

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    // Keep the historical key so open Liveblocks rooms stay continuous.
    const ytext = ydoc.getText("codemirror");
    ytextRef.current = ytext;
    ydocRef.current = ydoc;
    awarenessRef.current = provider.awareness as unknown as Awareness;

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
      setReady(true);
      if (editorRef.current) {
        bindMonaco(editorRef.current);
      }
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
      bindingRef.current?.destroy();
      bindingRef.current = null;
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flushPendingSave();
      ytextRef.current = null;
      ydocRef.current = null;
      awarenessRef.current = null;
      setReady(false);
      setCollabReady(false);
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- recover empty buffer from server
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
    if (!collabReady || readOnly) return;

    const publish = () => {
      const ed = editorRef.current;
      if (!ed) return;
      const sel = ed.getSelection();
      if (!sel) return;
      const model = ed.getModel();
      if (!model) return;
      const anchor = model.getOffsetAt({
        lineNumber: sel.positionLineNumber,
        column: sel.positionColumn,
      });
      const head = model.getOffsetAt({
        lineNumber: sel.selectionStartLineNumber,
        column: sel.selectionStartColumn,
      });
      updateMyPresence({
        cursor: { anchor, head },
      });
    };

    publish();
    const interval = window.setInterval(publish, 500);
    return () => window.clearInterval(interval);
  }, [collabReady, readOnly, updateMyPresence]);

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

  const connecting =
    status === "connecting" || status === "initial" || !ready;
  const reconnecting = status === "disconnected";

  return (
    <div className="relative h-full min-h-0">
      <CodeEditor
        value={displayValue}
        filePath={filePath}
        readOnly={readOnly}
        collaborative={ready && !reconnecting}
        onChange={ready && !reconnecting ? undefined : fallbackOnChange}
        onCreateEditor={(ed) => {
          editorRef.current = ed;
          if (ready) {
            bindMonaco(ed);
          }
        }}
      />
      {connecting && status !== "disconnected" ? (
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-ws-panel/90 px-2 py-1 text-[10px] text-ws-text-muted">
          Connecting live collaboration…
        </div>
      ) : null}
      {reconnecting ? (
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-ws-panel/90 px-2 py-1 text-[10px] text-ws-text-muted">
          Reconnecting live collaboration…
        </div>
      ) : null}
    </div>
  );
}

export function CollaborativeCodeEditor(props: CollaborativeCodeEditorProps) {
  return (
    <LiveblocksFileRoom projectId={props.projectId} filePath={props.filePath}>
      <LiveblocksCollaborativeEditor {...props} />
    </LiveblocksFileRoom>
  );
}
