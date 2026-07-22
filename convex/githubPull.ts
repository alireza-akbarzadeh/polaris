"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { getClerkGitHubToken, parseRepoUrl } from "./lib/github";
import { fetchRepoFiles } from "./lib/githubFetch";

export const pullFromGitHub = action({
  args: {
    projectId: v.id("projects"),
    /** When true, overwrite local Convex files even if there are uncommitted changes. */
    force: v.optional(v.boolean()),
    /** Optional branch to pull (also updates the project's active branch). */
    branch: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ commitSha: string; fileCount: number; branch: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error(
        "GitHub is not connected. Link your GitHub account to pull changes.",
      );
    }

    const context = await ctx.runQuery(internal.githubPullMutations.getPullContext, {
      projectId: args.projectId,
    });

    if (!context) {
      throw new Error("Project not found");
    }

    const { project, changedCount } = context;

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    if (!project.githubRepoUrl || project.source !== "github") {
      throw new Error("This project is not linked to a GitHub repository");
    }

    if (changedCount > 0 && !args.force) {
      throw new Error(
        `You have ${changedCount} local change${changedCount === 1 ? "" : "s"}. Commit & push them first, or pull with discard to overwrite from GitHub.`,
      );
    }

    const { owner, repo } = parseRepoUrl(project.githubRepoUrl);
    const branch =
      args.branch?.trim() || project.githubBranch?.trim() || "main";

    const { files, commitSha } = await fetchRepoFiles(
      token,
      owner,
      repo,
      branch,
    );

    if (files.length === 0) {
      throw new Error("No importable files found on this branch.");
    }

    await ctx.runMutation(internal.githubPullMutations.replaceFiles, {
      projectId: args.projectId,
      files,
      commitSha,
      githubBranch: branch,
    });

    return {
      commitSha,
      fileCount: files.length,
      branch,
    };
  },
});
