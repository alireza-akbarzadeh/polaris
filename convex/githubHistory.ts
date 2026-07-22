"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { createOctokit, getClerkGitHubToken, parseRepoUrl } from "./lib/github";

function parseOwnerRepo(githubRepoUrl: string): { owner: string; repo: string } {
  try {
    return parseRepoUrl(githubRepoUrl);
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }
}

export const listCommits = action({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      sha: string;
      shortSha: string;
      message: string;
      authorName: string;
      authorDate: string;
      url: string;
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

    const context = await ctx.runQuery(internal.githubPushMutations.getPushContext, {
      projectId: args.projectId,
    });

    if (!context) {
      throw new Error("Project not found");
    }

    const { project } = context;
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }
    if (!project.githubRepoUrl) {
      throw new Error("This project is not linked to a GitHub repository");
    }

    const { owner, repo } = parseOwnerRepo(project.githubRepoUrl);
    const branch = project.githubBranch?.trim() || "main";
    const octokit = createOctokit(token);
    const perPage = Math.min(Math.max(args.limit ?? 30, 1), 50);

    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: perPage,
    });

    return data.map((commit) => {
      const message = commit.commit.message.split("\n")[0] ?? commit.commit.message;
      return {
        sha: commit.sha,
        shortSha: commit.sha.slice(0, 7),
        message,
        authorName:
          commit.commit.author?.name ??
          commit.author?.login ??
          "Unknown",
        authorDate: commit.commit.author?.date ?? "",
        url: commit.html_url,
      };
    });
  },
});
