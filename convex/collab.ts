import * as Y from "yjs";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  colorForUserId,
  identityDisplayName,
  resolveProjectAccess,
  verifyProjectAccess,
  verifyProjectWriteAccess,
} from "./lib/projectAccess";
import { touchProject } from "./lib/projectFiles";
import { verifyAuth } from "./auth";

function bytesToUint8Array(bytes: ArrayBuffer): Uint8Array {
  return new Uint8Array(bytes);
}

function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function getOrCreateCollabDoc(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  path: string,
  seedText: string,
) {
  const existing = await ctx.db
    .query("collabDocuments")
    .withIndex("by_project_path", (q) =>
      q.eq("projectId", projectId).eq("path", path),
    )
    .unique();

  if (existing) {
    return existing;
  }

  const ydoc = new Y.Doc();
  ydoc.getText("content").insert(0, seedText);
  const state = Y.encodeStateAsUpdate(ydoc);
  const id = await ctx.db.insert("collabDocuments", {
    projectId,
    path,
    state: uint8ToArrayBuffer(state),
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get("collabDocuments", id);
  if (!created) {
    throw new Error("Failed to create collab document");
  }
  return created;
}

export const getDocument = query({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);
    const doc = await ctx.db
      .query("collabDocuments")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!doc) {
      return null;
    }

    return {
      state: doc.state,
      updatedAt: doc.updatedAt,
    };
  },
});

export const ensureDocument = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!file || file.kind !== "file") {
      throw new Error("File not found");
    }

    const doc = await getOrCreateCollabDoc(
      ctx,
      args.projectId,
      args.path,
      file.content ?? "",
    );

    return {
      state: doc.state,
      updatedAt: doc.updatedAt,
    };
  },
});

export const pushUpdate = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    update: v.bytes(),
  },
  handler: async (ctx, args) => {
    await verifyProjectWriteAccess(ctx, args.projectId);

    const file = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    if (!file || file.kind !== "file") {
      throw new Error("File not found");
    }

    const existing = await ctx.db
      .query("collabDocuments")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .unique();

    const ydoc = new Y.Doc();
    if (existing) {
      Y.applyUpdate(ydoc, bytesToUint8Array(existing.state));
    } else {
      ydoc.getText("content").insert(0, file.content ?? "");
    }

    Y.applyUpdate(ydoc, bytesToUint8Array(args.update));
    const nextState = Y.encodeStateAsUpdate(ydoc);
    const text = ydoc.getText("content").toString();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        state: uint8ToArrayBuffer(nextState),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("collabDocuments", {
        projectId: args.projectId,
        path: args.path,
        state: uint8ToArrayBuffer(nextState),
        updatedAt: now,
      });
    }

    const previous = file.content ?? "";
    if (text !== previous) {
      const hadBaseline = file.syncedContent !== undefined;
      const changedVsSynced = hadBaseline
        ? text !== (file.syncedContent ?? "")
        : true;
      await ctx.db.patch(file._id, {
        content: text,
        updatedAt: now,
        staged: changedVsSynced ? true : false,
      });
      await touchProject(ctx, args.projectId);
    }

    return { updatedAt: now };
  },
});

export const listCursors = query({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await resolveProjectAccess(ctx, args.projectId);
    if (!access) {
      return [];
    }

    const cursors = await ctx.db
      .query("collabCursors")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", args.projectId).eq("path", args.path),
      )
      .collect();

    const staleBefore = Date.now() - 15_000;
    return cursors
      .filter((cursor) => cursor.updatedAt >= staleBefore)
      .map((cursor) => ({
        userId: cursor.userId,
        sessionId: cursor.sessionId,
        name: cursor.name,
        color: cursor.color,
        anchor: cursor.anchor,
        head: cursor.head,
        isSelf: cursor.userId === access.userId,
      }));
  },
});

export const upsertCursor = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    sessionId: v.string(),
    anchor: v.number(),
    head: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    await verifyProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("collabCursors")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const payload = {
      projectId: args.projectId,
      path: args.path,
      userId: identity.subject,
      sessionId: args.sessionId,
      name: identityDisplayName(identity),
      color: colorForUserId(identity.subject),
      anchor: args.anchor,
      head: args.head,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("collabCursors", payload);
  },
});

export const clearCursor = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("collabCursors")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
