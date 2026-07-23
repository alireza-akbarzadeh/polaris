import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

export const disconnect = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const upsertConnection = internalMutation({
  args: {
    userId: v.string(),
    githubUserId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        githubUserId: args.githubUserId,
        username: args.username,
        avatarUrl: args.avatarUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("githubConnections", {
      userId: args.userId,
      githubUserId: args.githubUserId,
      username: args.username,
      avatarUrl: args.avatarUrl,
      connectedAt: now,
      updatedAt: now,
    });
  },
});
