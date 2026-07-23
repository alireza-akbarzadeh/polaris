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
    exportRepoUrl: v.optional(v.string()),
    githubRepoUrl: v.optional(v.string()),
    githubBranch: v.optional(v.string()),
    lastCommitSha: v.optional(v.string()),
    syncedAt: v.optional(v.number()),
    source: v.optional(
      v.union(v.literal("blank"), v.literal("github"), v.literal("template")),
    ),
    templateId: v.optional(
      v.union(
        v.literal("empty"),
        v.literal("simple"),
        v.literal("nextjs"),
        v.literal("react"),
        v.literal("tanstack"),
      ),
    ),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_updated", ["ownerId", "updatedAt"]),

  githubConnections: defineTable({
    userId: v.string(),
    githubUserId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    connectedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  projectFiles: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    parentId: v.optional(v.id("projectFiles")),
    kind: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()),
    /** Content last synced with GitHub (baseline for discard / change detection). */
    syncedContent: v.optional(v.string()),
    /** Whether the file is staged for the next commit. */
    staged: v.optional(v.boolean()),
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
    editor: v.optional(
      v.object({
        fontSize: v.number(),
        tabSize: v.number(),
        wordWrap: v.boolean(),
        lineNumbers: v.boolean(),
        highlightActiveLine: v.boolean(),
        bracketMatching: v.boolean(),
        lineHeight: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("editor"),
      v.literal("viewer"),
    ),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    color: v.string(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_user", ["projectId", "userId"]),

  projectInvites: defineTable({
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedBy: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
    ),
    /** Secret token for accept-via-link. Optional for legacy invites. */
    token: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_email_status", ["email", "status"])
    .index("by_project_email", ["projectId", "email"])
    .index("by_token", ["token"]),

  /** Yjs document state for real-time collaborative editing. */
  collabDocuments: defineTable({
    projectId: v.id("projects"),
    path: v.string(),
    /** Full Yjs state encoded as bytes. */
    state: v.bytes(),
    updatedAt: v.number(),
  }).index("by_project_path", ["projectId", "path"]),

  /** Ephemeral editor cursors / selections for an open file. */
  collabCursors: defineTable({
    projectId: v.id("projects"),
    path: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    name: v.string(),
    color: v.string(),
    anchor: v.number(),
    head: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_path", ["projectId", "path"])
    .index("by_session", ["sessionId"]),
});
