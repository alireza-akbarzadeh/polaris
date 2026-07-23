import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

    const projectId = await ctx.db.insert("projects", {
      name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
      source: "template",
      templateId,
    });
    await seedProjectFiles(ctx, projectId, templateId);
    return projectId;
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Project name is required");
    }

    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }

    await ctx.db.patch(args.projectId, {
      name,
      updatedAt: Date.now(),
    });
  },
});

export const getProjectById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get("projects", args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized access to this project");
    }
    return project;
  },
});

export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});

export const getProject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});
