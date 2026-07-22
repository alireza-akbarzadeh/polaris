"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { getClerkGitHubToken, parseRepoUrl } from "./lib/github";
import { fetchRepoFiles } from "./lib/githubFetch";

export const cloneFromGitHub = action({
  args: {
    repoUrl: v.string(),
    branch: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"projects">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error(
        "GitHub is not connected. Link your GitHub account from your profile.",
      );
    }

    const { owner, repo } = parseRepoUrl(args.repoUrl);
    const branch = args.branch?.trim() || "main";

    const projectId = await ctx.runMutation(
      internal.githubImportMutations.createImportProject,
      {
        ownerId: identity.subject,
        name: args.name?.trim() || repo,
        githubRepoUrl: `${owner}/${repo}`,
        githubBranch: branch,
      },
    );

    try {
      const { files, commitSha } = await fetchRepoFiles(
        token,
        owner,
        repo,
        branch,
      );

      if (files.length === 0) {
        throw new Error("No importable files found in this repository.");
      }

      await ctx.runMutation(internal.githubImportMutations.importFiles, {
        projectId,
        files,
      });
      await ctx.runMutation(internal.githubImportMutations.completeImport, {
        projectId,
        commitSha,
      });

      return projectId;
    } catch (error) {
      await ctx.runMutation(internal.githubImportMutations.failImport, {
        projectId,
      });
      throw error;
    }
  },
});
