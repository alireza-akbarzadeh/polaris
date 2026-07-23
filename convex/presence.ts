import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";

import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { resolveProjectAccess } from "./lib/projectAccess";
import { verifyAuth } from "./auth";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    const identity = await verifyAuth(ctx);
    if (identity.subject !== userId) {
      throw new Error("Unauthorized");
    }

    const access = await resolveProjectAccess(ctx, roomId as Id<"projects">);
    if (!access) {
      throw new Error("Unauthorized access to this project");
    }

    return await presence.heartbeat(ctx, roomId, userId, sessionId, interval);
  },
});

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    return await presence.list(ctx, roomToken);
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return await presence.disconnect(ctx, sessionToken);
  },
});
