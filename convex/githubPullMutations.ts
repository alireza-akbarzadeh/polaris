import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { isProjectFileChanged } from "./lib/projectFiles";
import { replaceProjectFilesFromImport } from "./lib/importProjectFiles";

export const getPullContext = internalQuery({
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

    const changedCount = files.filter((file) =>
      isProjectFileChanged(file, project.syncedAt),
    ).length;

    return {
      project,
      changedCount,
    };
  },
});

export const replaceFiles = internalMutation({
  args: {
    projectId: v.id("projects"),
    files: v.array(
      v.object({
        path: v.string(),
        content: v.string(),
      }),
    ),
    commitSha: v.string(),
    githubBranch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await replaceProjectFilesFromImport(ctx, {
      projectId: args.projectId,
      files: args.files,
      commitSha: args.commitSha,
      githubBranch: args.githubBranch,
    });
  },
});

export const setBranch = internalMutation({
  args: {
    projectId: v.id("projects"),
    githubBranch: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      githubBranch: args.githubBranch,
      updatedAt: Date.now(),
    });
  },
});
