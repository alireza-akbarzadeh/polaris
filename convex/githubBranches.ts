"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  createOctokit,
  getClerkGitHubToken,
  parseRepoUrl,
} from "./lib/github";
import { fetchRepoFiles } from "./lib/githubFetch";

export const listBranches = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      name: string;
      protected: boolean;
      isCurrent: boolean;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error("GitHub is not connected.");
    }

    const context = await ctx.runQuery(internal.githubPullMutations.getPullContext, {
      projectId: args.projectId,
    });

    if (!context) {
      throw new Error("Project not found");
    }

    const { project } = context;
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }
    if (!project.githubRepoUrl || project.source !== "github") {
      throw new Error("This project is not linked to a GitHub repository");
    }

    const { owner, repo } = parseRepoUrl(project.githubRepoUrl);
    const currentBranch = project.githubBranch?.trim() || "main";
    const octokit = createOctokit(token);

    const branches: Array<{
      name: string;
      protected: boolean;
      isCurrent: boolean;
    }> = [];
    let page = 1;
    const perPage = 100;

    while (page <= 10) {
      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
        page,
      });

      for (const branch of data) {
        branches.push({
          name: branch.name,
          protected: branch.protected,
          isCurrent: branch.name === currentBranch,
        });
      }

      if (data.length < perPage) {
        break;
      }
      page += 1;
    }

    return branches.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createBranch = action({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    fromBranch: v.optional(v.string()),
    checkout: v.optional(v.boolean()),
    force: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ name: string; checkedOut: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error("GitHub is not connected.");
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

    const name = args.name.trim().replace(/^refs\/heads\//, "");
    if (!name) {
      throw new Error("Branch name is required");
    }
    if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.includes("..")) {
      throw new Error(
        "Invalid branch name. Use letters, numbers, /, -, _, and .",
      );
    }

    const { owner, repo } = parseRepoUrl(project.githubRepoUrl);
    const currentBranch = project.githubBranch?.trim() || "main";
    const fromBranch = args.fromBranch?.trim() || currentBranch;
    const octokit = createOctokit(token);

    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${name}`,
        sha: refData.object.sha,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("already exists")) {
        throw new Error(`Branch "${name}" already exists`);
      }
      throw error;
    }

    if (!args.checkout) {
      return { name, checkedOut: false };
    }

    if (changedCount > 0 && !args.force) {
      throw new Error(
        `Branch "${name}" was created, but you have ${changedCount} local change${changedCount === 1 ? "" : "s"}. Commit them first, or checkout with discard.`,
      );
    }

    const { files, commitSha } = await fetchRepoFiles(
      token,
      owner,
      repo,
      name,
    );

    await ctx.runMutation(internal.githubPullMutations.replaceFiles, {
      projectId: args.projectId,
      files,
      commitSha,
      githubBranch: name,
    });

    return { name, checkedOut: true };
  },
});

export const checkoutBranch = action({
  args: {
    projectId: v.id("projects"),
    branch: v.string(),
    force: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ branch: string; commitSha: string; fileCount: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error("GitHub is not connected.");
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

    const branch = args.branch.trim();
    if (!branch) {
      throw new Error("Branch name is required");
    }

    const currentBranch = project.githubBranch?.trim() || "main";
    if (branch === currentBranch) {
      throw new Error(`Already on branch "${branch}"`);
    }

    if (changedCount > 0 && !args.force) {
      throw new Error(
        `You have ${changedCount} local change${changedCount === 1 ? "" : "s"}. Commit & push them first, or checkout with discard to overwrite from GitHub.`,
      );
    }

    const { owner, repo } = parseRepoUrl(project.githubRepoUrl);
    const octokit = createOctokit(token);

    try {
      await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
    } catch {
      throw new Error(`Branch "${branch}" was not found on GitHub`);
    }

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
      branch,
      commitSha,
      fileCount: files.length,
    };
  },
});
