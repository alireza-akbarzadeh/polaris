import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteAllProjectFiles } from "./lib/importProjectFiles";
import {
  ensureOwnerMembership,
  identityDisplayName,
  identityEmail,
  resolveProjectAccess,
  verifyProjectOwnerAccess,
} from "./lib/projectAccess";
import { seedProjectFiles } from "./lib/projectFiles";
import {
  DEFAULT_TEMPLATE_ID,
  listTemplateMeta,
  templateIdValidator,
} from "./lib/projectTemplates";
import { verifyAuth } from "./auth";

export const listTemplates = query({
  args: {},
  handler: async () => {
    return listTemplateMeta();
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    templateId: v.optional(templateIdValidator),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Project name is required");
    }

    const templateId = args.templateId ?? DEFAULT_TEMPLATE_ID;
    const ownerId = identity.subject;

    const projectId = await ctx.db.insert("projects", {
      name,
      ownerId,
      updatedAt: Date.now(),
      source: "template",
      templateId,
    });
    await seedProjectFiles(ctx, projectId, templateId);
    await ensureOwnerMembership(ctx, projectId, ownerId, {
      email: identityEmail(identity) ?? undefined,
      name: identityDisplayName(identity),
      imageUrl: identity.pictureUrl,
    });
    return projectId;
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new Error("Project name is required");
    }

    await verifyProjectOwnerAccess(ctx, args.projectId);

    await ctx.db.patch(args.projectId, {
      name,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
    confirmName: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await verifyProjectOwnerAccess(ctx, args.projectId);
    if (project.name !== args.confirmName.trim()) {
      throw new Error("Project name does not match");
    }

    await deleteAllProjectFiles(ctx, args.projectId);

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invites = await ctx.db
      .query("projectInvites")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    const collabDocs = await ctx.db
      .query("collabDocuments")
      .withIndex("by_project_path", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const doc of collabDocs) {
      await ctx.db.delete(doc._id);
    }

    const cursors = await ctx.db
      .query("collabCursors")
      .withIndex("by_project_path", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const cursor of cursors) {
      await ctx.db.delete(cursor._id);
    }

    await ctx.db.delete(args.projectId);
  },
});

export const getProjectById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const access = await resolveProjectAccess(ctx, args.projectId);
    if (!access) {
      return null;
    }
    return {
      ...access.project,
      role: access.role,
      canEdit: access.canEdit,
      canManage: access.canManage,
    };
  },
});

export const getMyAccess = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const access = await resolveProjectAccess(ctx, args.projectId);
    if (!access) {
      return null;
    }
    return {
      role: access.role,
      canEdit: access.canEdit,
      canManage: access.canManage,
      userId: access.userId,
    };
  },
});

export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const sharedIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const shared = [];
    for (const projectId of sharedIds) {
      const project = await ctx.db.get("projects", projectId);
      if (project && project.ownerId !== identity.subject) {
        shared.push(project);
      }
    }

    const byId = new Map(
      [...owned, ...shared].map((project) => [project._id, project]),
    );
    return [...byId.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, args.limit);
  },
});

export const getProject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const shared = [];
    for (const membership of memberships) {
      if (membership.role === "owner") continue;
      const project = await ctx.db.get("projects", membership.projectId);
      if (project && project.ownerId !== identity.subject) {
        shared.push({
          ...project,
          role: membership.role,
        });
      }
    }

    const ownedWithRole = owned.map((project) => ({
      ...project,
      role: "owner" as const,
    }));

    const byId = new Map(
      [...ownedWithRole, ...shared].map((project) => [project._id, project]),
    );
    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
