"use node";

import { Octokit } from "@octokit/rest";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { getClerkGitHubToken } from "./lib/github";

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
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

export const syncConnection = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      await ctx.runMutation(internal.github.disconnect, {
        userId: identity.subject,
      });
      return { connected: false as const };
    }

    const octokit = new Octokit({ auth: token });
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    await ctx.runMutation(internal.github.upsertConnection, {
      userId: identity.subject,
      githubUserId: String(githubUser.id),
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    return {
      connected: true as const,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };
  },
});
