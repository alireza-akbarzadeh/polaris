"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  assertGitHubRepoScope,
  createOctokit,
  ensureGitHubRepository,
  formatGitHubApiError,
  getClerkGitHubToken,
  pushProjectFiles,
  waitForRepositoryBranch,
} from "./lib/github";

const REPO_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function sanitizeRepoName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 100);
}

export const initializeRepository = action({
  args: {
    projectId: v.id("projects"),
    repoName: v.string(),
    isPrivate: v.optional(v.boolean()),
    commitMessage: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ commitSha: string; repoUrl: string; filesPushed: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const repoName = sanitizeRepoName(args.repoName);
    if (!repoName || !REPO_NAME_PATTERN.test(repoName)) {
      throw new Error(
        "Invalid repository name. Use letters, numbers, dots, hyphens, or underscores.",
      );
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error(
        "GitHub is not connected. Link your GitHub account to initialize a repository.",
      );
    }

    const context = await ctx.runQuery(internal.githubInitMutations.getInitContext, {
      projectId: args.projectId,
    });

    if (!context) {
      throw new Error("Project not found");
    }

    const { project, connection, files } = context;

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    if (project.githubRepoUrl) {
      throw new Error("This project is already linked to a GitHub repository");
    }

    if (!connection) {
      throw new Error("GitHub connection not found. Reconnect your GitHub account.");
    }

    if (files.length === 0) {
      throw new Error("Add at least one file before initializing a repository");
    }

    const message = args.commitMessage?.trim() || "Initial commit";
    const octokit = createOctokit(token);

    await assertGitHubRepoScope(octokit);

    await ctx.runMutation(internal.githubInitMutations.setInitStatus, {
      projectId: args.projectId,
      status: "exporting",
    });

    const ownerHint = connection.username;

    try {
      const ensured = await ensureGitHubRepository(
        octokit,
        ownerHint,
        repoName,
        args.isPrivate ?? true,
      );

      // Always trust the login/branch returned by GitHub for this repo.
      const owner = ensured.owner;
      let branch = ensured.branch;

      // Newly created repos (auto_init) need a moment for the default branch.
      // Existing empty leftovers are bootstrapped inside pushProjectFiles.
      // Never hard-fail here — pushProjectFiles recovers from empty/unready repos.
      try {
        branch = await waitForRepositoryBranch(
          octokit,
          owner,
          repoName,
          branch,
          ensured.created ? 24 : 8,
        );
      } catch {
        // Continue; pushProjectFiles will bootstrap or create the first commit.
      }

      const commitSha = await pushProjectFiles(octokit, {
        owner,
        repo: repoName,
        branch,
        message,
        files,
      });

      const githubRepoUrl = `${owner}/${repoName}`;

      await ctx.runMutation(internal.githubInitMutations.linkRepository, {
        projectId: args.projectId,
        githubRepoUrl,
        githubBranch: branch,
        commitSha,
      });

      return {
        commitSha,
        repoUrl: githubRepoUrl,
        filesPushed: files.length,
      };
    } catch (error) {
      await ctx.runMutation(internal.githubInitMutations.failInit, {
        projectId: args.projectId,
      });

      const formatted = formatGitHubApiError(error);
      if (formatted) {
        throw new Error(formatted);
      }

      throw error;
    }
  },
});
