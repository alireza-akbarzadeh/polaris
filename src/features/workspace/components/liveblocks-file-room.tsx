"use client";

import type { ReactNode } from "react";

import {
  RoomProvider,
  liveblocksRoomId,
  type Presence,
} from "@/liveblocks.config";

type LiveblocksFileRoomProps = {
  projectId: string;
  filePath: string;
  children: ReactNode;
};

const initialPresence: Presence = { cursor: null };

export function LiveblocksFileRoom({
  projectId,
  filePath,
  children,
}: LiveblocksFileRoomProps) {
  const roomId = liveblocksRoomId(projectId, filePath);

  return (
    <RoomProvider id={roomId} initialPresence={initialPresence}>
      {children}
    </RoomProvider>
  );
}
