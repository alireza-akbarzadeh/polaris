import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { buildFileTree, type GitHubImportFile } from "./github";

type TreeNode = {
  name: string;
  path: string;
  kind: "file" | "folder";
  content?: string;
  children: Map<string, TreeNode>;
};

async function insertTreeNode(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  node: TreeNode,
  parentId?: Id<"projectFiles">,
) {
  const now = Date.now();
  const content = node.kind === "file" ? (node.content ?? "") : undefined;
  const fileId = await ctx.db.insert("projectFiles", {
    projectId,
    name: node.name,
    parentId,
    kind: node.kind,
    content,
    syncedContent: node.kind === "file" ? content : undefined,
    staged: false,
    path: node.path,
    updatedAt: now,
  });

  if (node.kind === "folder") {
    for (const child of node.children.values()) {
      await insertTreeNode(ctx, projectId, child, fileId);
    }
  }
}

export async function insertImportedFiles(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  files: GitHubImportFile[],
) {
  const tree = buildFileTree(files);
  for (const child of tree.children.values()) {
    await insertTreeNode(ctx, projectId, child);
  }
}

export async function deleteAllProjectFiles(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const files = await ctx.db
    .query("projectFiles")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  // Delete leaves first so parent references never matter for cleanup.
  const folders = files.filter((file) => file.kind === "folder");
  const leafFiles = files.filter((file) => file.kind === "file");

  for (const file of leafFiles) {
    await ctx.db.delete(file._id);
  }

  // Deepest paths first so nested folders delete cleanly.
  folders.sort((a, b) => b.path.length - a.path.length);
  for (const folder of folders) {
    await ctx.db.delete(folder._id);
  }
}

export async function replaceProjectFilesFromImport(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    files: GitHubImportFile[];
    commitSha: string;
    githubBranch?: string;
  },
) {
  await deleteAllProjectFiles(ctx, args.projectId);
  await insertImportedFiles(ctx, args.projectId, args.files);

  const now = Date.now();
  await ctx.db.patch(args.projectId, {
    lastCommitSha: args.commitSha,
    syncedAt: now,
    updatedAt: now,
    importStatus: "completed",
    ...(args.githubBranch ? { githubBranch: args.githubBranch } : {}),
  });
}
