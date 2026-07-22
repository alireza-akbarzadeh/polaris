import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

const panelSizesValidator = v.object({
  sidebar: v.number(),
  terminal: v.number(),
  ai: v.optional(v.number()),
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    sidebarOpen: v.boolean(),
    terminalOpen: v.boolean(),
    aiPanelOpen: v.boolean(),
    panelSizes: panelSizesValidator,
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    const payload = {
      userId: identity.subject,
      sidebarOpen: args.sidebarOpen,
      terminalOpen: args.terminalOpen,
      aiPanelOpen: args.aiPanelOpen,
      panelSizes: {
        sidebar: args.panelSizes.sidebar,
        terminal: args.panelSizes.terminal,
        ai: args.panelSizes.ai ?? 28,
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", payload);
  },
});
