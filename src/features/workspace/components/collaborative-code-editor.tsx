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
  /** Ignore empty Y.Doc observer pulses until after we finish seeding. */
  const acceptRemoteEditsRef = useRef(false);

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

  const persistToServerRef = useRef<(content: string) => void>(() => {});
  persistToServerRef.current = (content: string) => {
    pendingContentRef.current = null;

    // Never let a fresh empty Liveblocks room wipe a known non-empty file.
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
          // Keep session memory so an empty Liveblocks reconnect can reseed
          // before the Convex query reflects this write.
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
    // Don't clobber a known buffer with an empty editor during teardown.
    if (!content && known) {
      pendingContentRef.current = known;
      persistToServerRef.current(known);
      return;
    }

    // Sync draft immediately so a remount can reseed even if Convex is slow.
    saveFileContentDraft(projectId, filePath, content);
    pendingContentRef.current = content;
    persistToServerRef.current(content);
  };

  useEffect(() => {
    seededRef.current = false;
    acceptRemoteEditsRef.current = false;
    setReady(false);
    setCollabExtensions(null);

    if (status !== "connected") return;

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = ydoc.getText("codemirror");
    ytextRef.current = ytext;
    const undoManager = new Y.UndoManager(ytext);

    const self = room.getSelf();
    const userColor = self?.info?.color ?? "#90A4AE";
    const displayName = self?.info?.name?.trim() || "User";
    provider.awareness.setLocalStateField("user", {
      name: displayName.split(" ")[0] ?? displayName,
      color: userColor,
      colorLight: softCollaboratorColor(userColor),
    });

    let onSync: ((isSynced: boolean) => void) | null = null;

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
        ydoc.transact(() => {
          if (ytext.length > 0) {
            ytext.delete(0, ytext.length);
          }
          ytext.insert(0, seed);
        });
        saveFileContentDraft(projectId, filePath, seed);
        if (seed !== initialContentRef.current && !readOnlyRef.current) {
          scheduleServerSave(seed);
        }
      }
      seededRef.current = true;
    };

    const finishSetup = () => {
      seedIfNeeded();
      const text = ytext.toString();
      setValue(text);
      onContentChangeRef.current?.(text);
      acceptRemoteEditsRef.current = true;
      setCollabExtensions([
        collabCursorTheme,
        ...(yCollab(ytext, provider.awareness, {
          undoManager: readOnlyRef.current ? false : undoManager,
        }) as Extension[]),
      ]);
      setReady(true);
    };

    const onText = () => {
      const text = ytext.toString();

      // While Liveblocks is still connecting/syncing, an empty Y.Doc pulse
      // must not overwrite drafts or schedule a wipe of Convex content.
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
        // Fresh empty room after reconnect — reseed instead of persisting "".
        if (!seededRef.current || shouldReseedLiveblocks(text, known)) {
          seededRef.current = false;
          seedIfNeeded();
        }
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
      acceptRemoteEditsRef.current = false;
      if (onSync) provider.off("sync", onSync);
      ytext.unobserve(onText);
      undoManager.destroy();
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flushPendingSave();
      ytextRef.current = null;
      setCollabExtensions(null);
      setReady(false);
    };
  }, [filePath, projectId, room, status]);

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

  if (status === "connecting" || status === "initial" || !ready) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Connecting live collaboration…
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[13px] text-ws-text-muted">
        Disconnected from live room. Reconnecting…
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
