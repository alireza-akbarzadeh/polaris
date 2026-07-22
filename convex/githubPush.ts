"use node";

import { Octokit } from "@octokit/rest";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { getClerkGitHubToken } from "./lib/github";

function parseOwnerRepo(githubRepoUrl: string): { owner: string; repo: string } {
  const trimmed = githubRepoUrl.trim().replace(/^https?:\/\/github\.com\//i, "");
  const [owner, repo] = trimmed.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid GitHub repository URL");
  }
  return { owner, repo: repo.replace(/\.git$/, "") };
}

export const commitAndPush = action({
  args: {
    projectId: v.id("projects"),
    message: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ commitSha: string; filesPushed: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const message = args.message.trim();
    if (!message) {
      throw new Error("Commit message is required");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error(
        "GitHub is not connected. Link your GitHub account to push changes.",
      );
    }

    const context = await ctx.runQuery(internal.githubPushMutations.getPushContext, {
      projectId: args.projectId,
    });

    if (!context) {
      throw new Error("Project not found");
    }

    const { project, changedFiles } = context;

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    if (!project.githubRepoUrl) {
      throw new Error("This project is not linked to a GitHub repository");
    }

    if (changedFiles.length === 0) {
      throw new Error("No changes to commit");
    }

    const { owner, repo } = parseOwnerRepo(project.githubRepoUrl);
    const branch = project.githubBranch?.trim() || "main";
    const octokit = new Octokit({ auth: token });

    await ctx.runMutation(internal.githubPushMutations.setExportStatus, {
      projectId: args.projectId,
      status: "exporting",
    });

    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const parentSha = refData.object.sha;

      const { data: parentCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: parentSha,
      });

      const treeEntries = await Promise.all(
        changedFiles.map(async (file) => {
          const { data: blob } = await octokit.rest.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: "utf-8",
          });
          return {
            path: file.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.sha,
          };
        }),
      );

      const { data: newTree } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: parentCommit.tree.sha,
        tree: treeEntries,
      });

      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [parentSha],
      });

      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      await ctx.runMutation(internal.githubPushMutations.completePush, {
        projectId: args.projectId,
        commitSha: newCommit.sha,
      });

      return {
        commitSha: newCommit.sha,
        filesPushed: changedFiles.length,
      };
    } catch (error) {
      await ctx.runMutation(internal.githubPushMutations.failPush, {
        projectId: args.projectId,
      });
      throw error;
    }
  },
});
