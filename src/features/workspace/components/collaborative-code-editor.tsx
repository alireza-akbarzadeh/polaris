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
  collabCursorTheme,
  softCollaboratorColor,
} from "@/features/workspace/lib/collab-cursor-theme";
import { useRoom, useStatus, useUpdateMyPresence } from "@/liveblocks.config";

type CollaborativeCodeEditorProps = {
  projectId: string;
  filePath: string;
  initialContent: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
};

function LiveblocksCollaborativeEditor({
  projectId,
  filePath,
  initialContent,
  readOnly = false,
  onContentChange,
}: CollaborativeCodeEditorProps) {
  const room = useRoom();
  const status = useStatus();
  const updateMyPresence = useUpdateMyPresence();
  const updateContent = useMutation(api.projectFiles.updateContent);

  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState(initialContent);
  const [collabExtensions, setCollabExtensions] = useState<Extension[] | null>(
    null,
  );

  useEffect(() => {
    if (status !== "connected") return;

    const provider = getYjsProviderForRoom(room);
    const ydoc = provider.getYDoc();
    const ytext = ydoc.getText("codemirror");
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

    const finishSetup = () => {
      if (!seededRef.current && ytext.length === 0 && initialContent) {
        ydoc.transact(() => {
          ytext.insert(0, initialContent);
        });
        seededRef.current = true;
      }
      setValue(ytext.toString());
      setCollabExtensions([
        collabCursorTheme,
        ...(yCollab(ytext, provider.awareness, {
          undoManager: readOnly ? false : undoManager,
        }) as Extension[]),
      ]);
      setReady(true);
    };

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

    const onText = () => {
      const text = ytext.toString();
      setValue(text);
      onContentChange?.(text);

      if (readOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void updateContent({
          projectId: projectId as Id<"projects">,
          path: filePath,
          content: text,
        }).catch(() => {});
      }, 800);
    };

    ytext.observe(onText);

    return () => {
      if (onSync) provider.off("sync", onSync);
      ytext.unobserve(onText);
      undoManager.destroy();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setCollabExtensions(null);
      setReady(false);
    };
  }, [
    filePath,
    initialContent,
    onContentChange,
    projectId,
    readOnly,
    room,
    status,
    updateContent,
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
