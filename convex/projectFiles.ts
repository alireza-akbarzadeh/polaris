import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  buildPath,
  deleteFolderRecursive,
  isProjectFileChanged,
  listSiblingNames,
  seedDefaultProjectFiles,
  suggestUniqueName,
  touchProject,
  updateDescendantPaths,
  verifyProjectAccess,
} from "./lib/projectFiles";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const listChangedFiles = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await verifyProjectAccess(ctx, args.projectId);
    if (!project.syncedAt) {
      return [];
    }

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return files
      .filter((file) => isProjectFileChanged(file, project.syncedAt))
      .map((file) => ({
        _id: file._id,
        path: file.path,
        name: file.name,
        updatedAt: file.updatedAt,
        staged: file.staged === true,
        isNew:
          file.syncedContent === undefined &&
          file._creationTime > project.syncedAt!,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const setFileStaged = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    staged: v.boolean(),
  },
  handler: async (ctx, args) => {
    const project = await verifyProjectAccess(ctx, args.projectId);
    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!file || file.kind !== "file") {
      throw new Error("File not found");
    }
    if (!isProjectFileChanged(file, project.syncedAt)) {
      throw new Error("File has no local changes to stage");
    }

    await ctx.db.patch(file._id, { staged: args.staged });
  },
});

export const setAllChangedStaged = mutation({
  args: {
    projectId: v.id("projects"),
    staged: v.boolean(),
  },
  handler: async (ctx, args) => {
    const project = await verifyProjectAccess(ctx, args.projectId);
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const file of files) {
      if (isProjectFileChanged(file, project.syncedAt)) {
        await ctx.db.patch(file._id, { staged: args.staged });
      }
    }
  },
});

export const discardFileChanges = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await verifyProjectAccess(ctx, args.projectId);
    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!file || file.kind !== "file") {
      throw new Error("File not found");
    }
    if (!isProjectFileChanged(file, project.syncedAt)) {
      return;
    }

    // New unsynced file — discard by deleting.
    if (file.syncedContent === undefined) {
      if (file._creationTime > (project.syncedAt ?? 0)) {
        await ctx.db.delete(file._id);
        await touchProject(ctx, args.projectId);
        return;
      }
      throw new Error(
        "Cannot discard this file yet. Push once (or re-import) to create a sync baseline.",
      );
    }

    await ctx.db.patch(file._id, {
      content: file.syncedContent,
      staged: false,
      updatedAt: project.syncedAt ?? Date.now(),
    });
    await touchProject(ctx, args.projectId);
  },
});

export const getByPath = query({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    parentId: v.optional(v.id("projectFiles")),
    kind: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    if (name.includes("/")) {
      throw new Error("Name cannot contain '/'");
    }

    let parentPath: string | undefined;
    if (args.parentId) {
      const parent = await ctx.db.get("projectFiles", args.parentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Parent folder not found");
      }
      if (parent.kind !== "folder") {
        throw new Error("Parent must be a folder");
      }
      parentPath = parent.path;
    }

    const path = buildPath(parentPath, name);
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", path),
      )
      .unique();
    if (existing) {
      throw new Error("A file or folder with this path already exists");
    }

    const now = Date.now();
    const content = args.kind === "file" ? (args.content ?? "") : undefined;
    const fileId = await ctx.db.insert("projectFiles", {
      projectId: args.projectId,
      name,
      parentId: args.parentId,
      kind: args.kind,
      content,
      // New files have no synced baseline until the next push.
      syncedContent: undefined,
      staged: args.kind === "file" ? false : undefined,
      path,
      updatedAt: now,
    });

    await touchProject(ctx, args.projectId);
    return fileId;
  },
});

export const updateContent = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!file) {
      throw new Error("File not found");
    }
    if (file.kind !== "file") {
      throw new Error("Cannot update content of a folder");
    }

    const now = Date.now();
    const nextContent = args.content;
    const stillChanged =
      file.syncedContent === undefined || nextContent !== file.syncedContent;

    await ctx.db.patch(file._id, {
      content: nextContent,
      updatedAt: now,
      staged: stillChanged ? file.staged === true : false,
    });
    await touchProject(ctx, args.projectId);
  },
});

export const rename = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const name = args.name.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    if (name.includes("/")) {
      throw new Error("Name cannot contain '/'");
    }

    const item = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!item) {
      throw new Error("File or folder not found");
    }

    const parentPath = item.path.includes("/")
      ? item.path.slice(0, item.path.lastIndexOf("/"))
      : undefined;
    const newPath = buildPath(parentPath, name);

    if (newPath !== item.path) {
      const conflict = await ctx.db
        .query("projectFiles")
        .withIndex("by_project_path", (q) =>
          q.eq("projectId", args.projectId).eq("path", newPath),
        )
        .unique();
      if (conflict) {
        throw new Error("A file or folder with this path already exists");
      }

      if (item.kind === "folder") {
        await updateDescendantPaths(ctx, args.projectId, item.path, newPath);
      }

      await ctx.db.patch(item._id, {
        name,
        path: newPath,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(item._id, {
        name,
        updatedAt: Date.now(),
      });
    }

    await touchProject(ctx, args.projectId);
    return newPath;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const item = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!item) {
      throw new Error("File or folder not found");
    }

    if (item.kind === "folder") {
      await deleteFolderRecursive(ctx, item._id, args.projectId);
    }

    await ctx.db.delete(item._id);
    await touchProject(ctx, args.projectId);
  },
});

export const move = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    newParentId: v.optional(v.id("projectFiles")),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const item = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!item) {
      throw new Error("File or folder not found");
    }

    let parentPath: string | undefined;
    if (args.newParentId !== undefined) {
      const parent = await ctx.db.get("projectFiles", args.newParentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Destination folder not found");
      }
      if (parent.kind !== "folder") {
        throw new Error("Destination must be a folder");
      }
      if (parent._id === item._id) {
        throw new Error("Cannot move a folder into itself");
      }
      if (
        item.kind === "folder" &&
        (parent.path === item.path ||
          parent.path.startsWith(`${item.path}/`))
      ) {
        throw new Error("Cannot move a folder into itself or a descendant");
      }
      parentPath = parent.path;
    }

    const sameParent =
      (item.parentId ?? undefined) === (args.newParentId ?? undefined);
    if (sameParent) {
      return item.path;
    }

    const siblingNames = await listSiblingNames(
      ctx,
      args.projectId,
      args.newParentId,
      item._id,
    );
    const name = suggestUniqueName(siblingNames, item.name);
    const newPath = buildPath(parentPath, name);

    if (item.kind === "folder") {
      await updateDescendantPaths(ctx, args.projectId, item.path, newPath);
    }

    await ctx.db.patch(item._id, {
      ...(args.newParentId === undefined
        ? { parentId: undefined }
        : { parentId: args.newParentId }),
      name,
      path: newPath,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, args.projectId);
    return newPath;
  },
});

export const duplicate = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    // undefined = same parent as source; null = project root; id = folder
    targetParentId: v.optional(
      v.union(v.id("projectFiles"), v.null()),
    ),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const item = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!item) {
      throw new Error("File or folder not found");
    }

    const targetParentId =
      args.targetParentId === undefined
        ? item.parentId
        : args.targetParentId === null
          ? undefined
          : args.targetParentId;

    let parentPath: string | undefined;
    if (targetParentId !== undefined) {
      const parent = await ctx.db.get("projectFiles", targetParentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Destination folder not found");
      }
      if (parent.kind !== "folder") {
        throw new Error("Destination must be a folder");
      }
      if (
        item.kind === "folder" &&
        (parent.path === item.path ||
          parent.path.startsWith(`${item.path}/`))
      ) {
        throw new Error("Cannot duplicate a folder into itself or a descendant");
      }
      parentPath = parent.path;
    }

    const siblingNames = await listSiblingNames(
      ctx,
      args.projectId,
      targetParentId,
    );
    const name = suggestUniqueName(siblingNames, item.name);
    const newPath = buildPath(parentPath, name);

    const newId = await duplicateNodeRecursive(
      ctx,
      args.projectId,
      item._id,
      targetParentId,
      newPath,
      name,
    );

    await touchProject(ctx, args.projectId);
    return { id: newId, path: newPath };
  },
});

async function duplicateNodeRecursive(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  sourceId: Id<"projectFiles">,
  parentId: Id<"projectFiles"> | undefined,
  path: string,
  name: string,
): Promise<Id<"projectFiles">> {
  const source = await ctx.db.get("projectFiles", sourceId);
  if (!source || source.projectId !== projectId) {
    throw new Error("File or folder not found");
  }

  const now = Date.now();
  const newId = await ctx.db.insert("projectFiles", {
    projectId,
    name,
    parentId,
    kind: source.kind,
    content: source.kind === "file" ? (source.content ?? "") : undefined,
    syncedContent: undefined,
    staged: source.kind === "file" ? false : undefined,
    path,
    updatedAt: now,
  });

  if (source.kind === "folder") {
    const children = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", projectId).eq("parentId", sourceId),
      )
      .collect();

    for (const child of children) {
      const childPath = buildPath(path, child.name);
      await duplicateNodeRecursive(
        ctx,
        projectId,
        child._id,
        newId,
        childPath,
        child.name,
      );
    }
  }

  return newId;
}

export const seedDefaults = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);
    await seedDefaultProjectFiles(ctx, args.projectId);
  },
});
