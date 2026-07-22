import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    ownerId: v.string(),
    updatedAt: v.number(),
    importStatus: v.optional(
      v.union(
        v.literal("importing"),
        v.literal("completed"),
        v.literal("failed"),
      )
    ),
    exportStatus: v.optional(
      v.union(
        v.literal("exporting"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    exportRepoUrl: v.optional(v.string())
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updated", ["ownerId", "updatedAt"]),

  userPreferences: defineTable({
    userId: v.string(),
    sidebarOpen: v.boolean(),
    terminalOpen: v.boolean(),
    aiPanelOpen: v.optional(v.boolean()),
    panelSizes: v.object({
      sidebar: v.number(),
      terminal: v.number(),
      ai: v.optional(v.number()),
    }),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
