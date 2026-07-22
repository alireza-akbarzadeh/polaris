import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const getInitContext = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      return null;
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", project.ownerId))
      .unique();

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const fileEntries = files
      .filter((file) => file.kind === "file")
      .map((file) => ({
        path: file.path,
        content: file.content ?? "",
      }));

    return {
      project,
      connection,
      files: fileEntries,
    };
  },
});

export const setInitStatus = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("exporting"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      exportStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const linkRepository = internalMutation({
  args: {
    projectId: v.id("projects"),
    githubRepoUrl: v.string(),
    githubBranch: v.string(),
    commitSha: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const file of files) {
      if (file.kind !== "file") continue;
      await ctx.db.patch(file._id, {
        syncedContent: file.content ?? "",
        staged: false,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.projectId, {
      source: "github",
      githubRepoUrl: args.githubRepoUrl,
      githubBranch: args.githubBranch,
      lastCommitSha: args.commitSha,
      syncedAt: now,
      exportStatus: "completed",
      updatedAt: now,
    });
  },
});

export const failInit = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      exportStatus: "failed",
      updatedAt: Date.now(),
    });
  },
});
