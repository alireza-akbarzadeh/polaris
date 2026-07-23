"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export type Presence = {
  cursor: { anchor: number; head: number } | null;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
    color: string;
  };
};

export type Storage = Record<string, never>;
export type RoomEvent = never;

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

export const {
  RoomProvider,
  useRoom,
  useSelf,
  useOthers,
  useUpdateMyPresence,
  useStatus,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export {
  liveblocksRoomId,
  parseLiveblocksRoomId,
} from "@/features/workspace/lib/liveblocks-room-id";
