import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const getPushContext = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      return null;
    }

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const syncedAt = project.syncedAt ?? 0;
    const changedFiles = files.filter(
      (file) => file.kind === "file" && file.updatedAt > syncedAt,
    );

    return {
      project,
      changedFiles: changedFiles.map((file) => ({
        path: file.path,
        content: file.content ?? "",
      })),
    };
  },
});

export const setExportStatus = internalMutation({
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

export const completePush = internalMutation({
  args: {
    projectId: v.id("projects"),
    commitSha: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      exportStatus: "completed",
      lastCommitSha: args.commitSha,
      syncedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const failPush = internalMutation({
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
