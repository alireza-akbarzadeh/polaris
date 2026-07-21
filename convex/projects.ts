import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


export const createProject = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const ownerId = identity.subject;

    return await ctx.db.insert("projects", {
      name: args.name,
      ownerId: ownerId,
      importStatus: "importing",
    });
  },
});

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const ownerId = identity.subject;

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
  },
});