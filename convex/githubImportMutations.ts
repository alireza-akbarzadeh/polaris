import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { insertImportedFiles } from "./lib/importProjectFiles";

export const createImportProject = internalMutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    githubRepoUrl: v.string(),
    githubBranch: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      name: args.name,
      ownerId: args.ownerId,
      updatedAt: Date.now(),
      importStatus: "importing",
      githubRepoUrl: args.githubRepoUrl,
      githubBranch: args.githubBranch,
      source: "github",
    });
  },
});

export const importFiles = internalMutation({
  args: {
    projectId: v.id("projects"),
    files: v.array(
      v.object({
        path: v.string(),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await insertImportedFiles(ctx, args.projectId, args.files);
  },
});

export const completeImport = internalMutation({
  args: {
    projectId: v.id("projects"),
    commitSha: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      importStatus: "completed",
      lastCommitSha: args.commitSha,
      syncedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const failImport = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      importStatus: "failed",
      updatedAt: Date.now(),
    });
  },
});
