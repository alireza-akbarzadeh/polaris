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

  projectFiles: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    parentId: v.optional(v.id("projectFiles")),
    kind: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()),
    path: v.string(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_parent", ["projectId", "parentId"])
    .index("by_project_path", ["projectId", "path"]),

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
