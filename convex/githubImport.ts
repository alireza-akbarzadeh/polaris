"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
  createOctokit,
  getClerkGitHubToken,
  MAX_FILE_BYTES,
  MAX_IMPORT_FILES,
  parseRepoUrl,
  shouldIgnorePath,
  type GitHubImportFile,
} from "./lib/github";

async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ files: GitHubImportFile[]; commitSha: string }> {
  const octokit = createOctokit(token);

  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const commitSha = refData.object.sha;

  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  const blobs = treeData.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      item.sha &&
      !shouldIgnorePath(item.path),
  );

  if (blobs.length > MAX_IMPORT_FILES) {
    throw new Error(
      `Repository has too many files (${blobs.length}). Limit is ${MAX_IMPORT_FILES}.`,
    );
  }

  const files: GitHubImportFile[] = [];

  for (const blob of blobs) {
    if (!blob.path || !blob.sha) {
      continue;
    }

    if (blob.size !== undefined && blob.size > MAX_FILE_BYTES) {
      continue;
    }

    const { data: blobData } = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: blob.sha,
    });

    if (blobData.size != null && blobData.size > MAX_FILE_BYTES) {
      continue;
    }

    const content =
      blobData.encoding === "base64"
        ? Buffer.from(blobData.content, "base64").toString("utf8")
        : blobData.content;

    files.push({ path: blob.path, content });
  }

  return { files, commitSha };
}

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
