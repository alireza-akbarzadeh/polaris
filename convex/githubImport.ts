"use node";

import { Octokit } from "@octokit/rest";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { action, internalMutation } from "./_generated/server";
import {
  buildFileTree,
  getClerkGitHubToken,
  MAX_FILE_BYTES,
  MAX_IMPORT_FILES,
  parseRepoUrl,
  shouldIgnorePath,
  type GitHubImportFile,
} from "./lib/github";

type TreeNode = {
  name: string;
  path: string;
  kind: "file" | "folder";
  content?: string;
  children: Map<string, TreeNode>;
};

async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ files: GitHubImportFile[]; commitSha: string }> {
  const octokit = new Octokit({ auth: token });

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

async function insertTreeNode(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  node: TreeNode,
  parentId?: Id<"projectFiles">,
) {
  const now = Date.now();
  const fileId = await ctx.db.insert("projectFiles", {
    projectId,
    name: node.name,
    parentId,
    kind: node.kind,
    content: node.kind === "file" ? (node.content ?? "") : undefined,
    path: node.path,
    updatedAt: now,
  });

  if (node.kind === "folder") {
    for (const child of node.children.values()) {
      await insertTreeNode(ctx, projectId, child, fileId);
    }
  }
}

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
    const tree = buildFileTree(args.files);
    for (const child of tree.children.values()) {
      await insertTreeNode(ctx, args.projectId, child);
    }
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

    const projectId = await ctx.runMutation(internal.githubImport.createImportProject, {
      ownerId: identity.subject,
      name: args.name?.trim() || repo,
      githubRepoUrl: `${owner}/${repo}`,
      githubBranch: branch,
    });

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

      await ctx.runMutation(internal.githubImport.importFiles, {
        projectId,
        files,
      });
      await ctx.runMutation(internal.githubImport.completeImport, {
        projectId,
        commitSha,
      });

      return projectId;
    } catch (error) {
      await ctx.runMutation(internal.githubImport.failImport, { projectId });
      throw error;
    }
  },
});
