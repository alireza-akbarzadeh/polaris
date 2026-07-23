import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type SeedNode,
  type TemplateId,
} from "./projectTemplates";

export {
  resolveProjectAccess,
  verifyProjectAccess,
  verifyProjectOwnerAccess,
  verifyProjectWriteAccess,
} from "./projectAccess";

export function buildPath(parentPath: string | undefined, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

/** Suggest a unique sibling name like `untitled.ts`, `untitled-2.ts`. */
export function suggestUniqueName(
  existingNames: Iterable<string>,
  base: string,
): string {
  const taken = new Set(existingNames);
  if (!taken.has(base)) {
    return base;
  }

  const dot = base.lastIndexOf(".");
  const hasExt = dot > 0;
  const stem = hasExt ? base.slice(0, dot) : base;
  const ext = hasExt ? base.slice(dot) : "";

  let index = 2;
  while (taken.has(`${stem}-${index}${ext}`)) {
    index += 1;
  }
  return `${stem}-${index}${ext}`;
}

export async function listSiblingNames(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  parentId: Id<"projectFiles"> | undefined,
  excludeId?: Id<"projectFiles">,
) {
  if (parentId === undefined) {
    const all = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return all
      .filter(
        (sibling) =>
          sibling.parentId === undefined && sibling._id !== excludeId,
      )
      .map((sibling) => sibling.name);
  }

  const siblings = await ctx.db
    .query("projectFiles")
    .withIndex("by_project_parent", (q) =>
      q.eq("projectId", projectId).eq("parentId", parentId),
    )
    .collect();

  return siblings
    .filter((sibling) => sibling._id !== excludeId)
    .map((sibling) => sibling.name);
}

export async function touchProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await ctx.db.patch(projectId, { updatedAt: Date.now() });
}

export function isProjectFileChanged(
  file: {
    kind: "file" | "folder";
    content?: string;
    syncedContent?: string;
    updatedAt: number;
  },
  syncedAt: number | undefined,
): boolean {
  if (file.kind !== "file") {
    return false;
  }

  if (file.syncedContent !== undefined) {
    return (file.content ?? "") !== file.syncedContent;
  }

  // Legacy projects without syncedContent baselines.
  return syncedAt !== undefined && file.updatedAt > syncedAt;
}

export async function deleteFolderRecursive(
  ctx: MutationCtx,
  folderId: Id<"projectFiles">,
  projectId: Id<"projects">,
) {
  const children = await ctx.db
    .query("projectFiles")
    .withIndex("by_project_parent", (q) =>
      q.eq("projectId", projectId).eq("parentId", folderId),
    )
    .collect();

  for (const child of children) {
    if (child.kind === "folder") {
      await deleteFolderRecursive(ctx, child._id, projectId);
    }
    await ctx.db.delete(child._id);
  }
}

export async function updateDescendantPaths(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  oldPrefix: string,
  newPrefix: string,
) {
  const allFiles = await ctx.db
    .query("projectFiles")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  for (const file of allFiles) {
    if (file.path === oldPrefix || file.path.startsWith(`${oldPrefix}/`)) {
      const suffix = file.path.slice(oldPrefix.length);
      await ctx.db.patch(file._id, {
        path: `${newPrefix}${suffix}`,
        updatedAt: Date.now(),
      });
    }
  }
}

async function seedNode(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  node: SeedNode,
  parentId: Id<"projectFiles"> | undefined,
  parentPath: string | undefined,
  fileContent: Record<string, string>,
) {
  const isFile = Boolean(node.path);
  const path = node.path ?? buildPath(parentPath, node.name);
  const now = Date.now();
  const content = isFile ? (fileContent[path] ?? "") : undefined;

  const id = await ctx.db.insert("projectFiles", {
    projectId,
    name: node.name,
    parentId,
    kind: isFile ? "file" : "folder",
    content,
    syncedContent: isFile ? content : undefined,
    staged: false,
    path,
    updatedAt: now,
  });

  if (node.children) {
    for (const child of node.children) {
      await seedNode(ctx, projectId, child, id, path, fileContent);
    }
  }
}

export async function seedProjectFiles(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  templateId: TemplateId = DEFAULT_TEMPLATE_ID,
) {
  const existing = await ctx.db
    .query("projectFiles")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .first();

  if (existing) {
    return;
  }

  const template = getTemplate(templateId);

  for (const node of template.tree) {
    await seedNode(
      ctx,
      projectId,
      node,
      undefined,
      undefined,
      template.content,
    );
  }

  await ctx.db.patch(projectId, {
    templateId,
    syncedAt: Date.now(),
  });
}

export async function seedDefaultProjectFiles(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get("projects", projectId);
  await seedProjectFiles(
    ctx,
    projectId,
    project?.templateId ?? DEFAULT_TEMPLATE_ID,
  );
}
