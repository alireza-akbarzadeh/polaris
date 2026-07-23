import { v } from "convex/values";

import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifyAuth } from "./auth";
import {
  colorForUserId,
  identityDisplayName,
  identityEmail,
  verifyProjectAccess,
  verifyProjectOwnerAccess,
} from "./lib/projectAccess";

const inviteRoleValidator = v.union(v.literal("editor"), v.literal("viewer"));

function createInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function lookupClerkUserByEmail(email: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured in Convex");
  }

  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.set("email_address", email);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to look up user in Clerk: ${body}`);
  }

  const users = (await response.json()) as Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    image_url?: string | null;
    email_addresses?: Array<{ email_address?: string }>;
  }>;

  const user = users[0];
  if (!user) {
    return null;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return {
    userId: user.id,
    email:
      user.email_addresses?.[0]?.email_address?.toLowerCase() ?? email.toLowerCase(),
    name: name || user.username || email,
    imageUrl: user.image_url ?? undefined,
  };
}

export const listMembers = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await verifyProjectAccess(ctx, args.projectId);
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const hasOwner = members.some((member) => member.role === "owner");
    if (!hasOwner) {
      members.push({
        _id: "legacy-owner" as Id<"projectMembers">,
        _creationTime: project._creationTime,
        projectId: args.projectId,
        userId: project.ownerId,
        role: "owner",
        color: colorForUserId(project.ownerId),
        createdAt: project._creationTime,
      });
    }

    return members.sort((a, b) => {
      const rank = { owner: 0, editor: 1, viewer: 2 } as const;
      return rank[a.role] - rank[b.role] || a.createdAt - b.createdAt;
    });
  },
});

export const listInvites = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyProjectOwnerAccess(ctx, args.projectId);
    const invites = await ctx.db
      .query("projectInvites")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return invites.filter((invite) => invite.status === "pending");
  },
});

export const addMember = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    role: inviteRoleValidator,
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { project } = await verifyProjectOwnerAccess(ctx, args.projectId);
    if (args.userId === project.ownerId) {
      throw new Error("Owner is already a member");
    }

    const existing = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        email: args.email ?? existing.email,
        name: args.name ?? existing.name,
        imageUrl: args.imageUrl ?? existing.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("projectMembers", {
      projectId: args.projectId,
      userId: args.userId,
      role: args.role,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      color: colorForUserId(args.userId),
      createdAt: Date.now(),
    });
  },
});

export const updateMemberRole = mutation({
  args: {
    projectId: v.id("projects"),
    memberId: v.id("projectMembers"),
    role: inviteRoleValidator,
  },
  handler: async (ctx, args) => {
    await verifyProjectOwnerAccess(ctx, args.projectId);
    const member = await ctx.db.get("projectMembers", args.memberId);
    if (!member || member.projectId !== args.projectId) {
      throw new Error("Member not found");
    }
    if (member.role === "owner") {
      throw new Error("Cannot change the owner role");
    }
    await ctx.db.patch(member._id, { role: args.role });
  },
});

export const removeMember = mutation({
  args: {
    projectId: v.id("projects"),
    memberId: v.id("projectMembers"),
  },
  handler: async (ctx, args) => {
    await verifyProjectOwnerAccess(ctx, args.projectId);
    const member = await ctx.db.get("projectMembers", args.memberId);
    if (!member || member.projectId !== args.projectId) {
      throw new Error("Member not found");
    }
    if (member.role === "owner") {
      throw new Error("Cannot remove the project owner");
    }
    await ctx.db.delete(member._id);
  },
});

export const createPendingInvite = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    await verifyProjectOwnerAccess(ctx, args.projectId);

    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required");
    }

    const token = createInviteToken();
    const existing = await ctx.db
      .query("projectInvites")
      .withIndex("by_project_email", (q) =>
        q.eq("projectId", args.projectId).eq("email", email),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        status: "pending",
        invitedBy: identity.subject,
        token,
        createdAt: Date.now(),
      });
      return { inviteId: existing._id, token };
    }

    const inviteId = await ctx.db.insert("projectInvites", {
      projectId: args.projectId,
      email,
      role: args.role,
      invitedBy: identity.subject,
      status: "pending",
      token,
      createdAt: Date.now(),
    });
    return { inviteId, token };
  },
});

/** Public preview for an invite link (no auth required). */
export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      return null;
    }

    const invite = await ctx.db
      .query("projectInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!invite) {
      return null;
    }

    const project = await ctx.db.get("projects", invite.projectId);
    if (!project) {
      return null;
    }

    return {
      email: invite.email,
      role: invite.role,
      status: invite.status,
      projectName: project.name,
      projectId: invite.projectId,
    };
  },
});

/** Accept a pending invite via its secret link token. */
export const acceptInviteByToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const token = args.token.trim();
    if (!token) {
      throw new Error("Invite token is required");
    }

    const invite = await ctx.db
      .query("projectInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status === "revoked") {
      throw new Error("This invite was revoked");
    }
    if (invite.status === "accepted") {
      return { projectId: invite.projectId, alreadyAccepted: true };
    }

    const project = await ctx.db.get("projects", invite.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const existing = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", invite.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (!existing) {
      if (project.ownerId !== identity.subject) {
        await ctx.db.insert("projectMembers", {
          projectId: invite.projectId,
          userId: identity.subject,
          role: invite.role,
          email: identityEmail(identity) ?? invite.email,
          name: identityDisplayName(identity),
          imageUrl: identity.pictureUrl,
          color: colorForUserId(identity.subject),
          createdAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(invite._id, { status: "accepted" });
    return { projectId: invite.projectId, alreadyAccepted: false };
  },
});

export const revokeInvite = mutation({
  args: {
    projectId: v.id("projects"),
    inviteId: v.id("projectInvites"),
  },
  handler: async (ctx, args) => {
    await verifyProjectOwnerAccess(ctx, args.projectId);
    const invite = await ctx.db.get("projectInvites", args.inviteId);
    if (!invite || invite.projectId !== args.projectId) {
      throw new Error("Invite not found");
    }
    await ctx.db.patch(invite._id, { status: "revoked" });
  },
});

export const acceptPendingInvites = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const email = identityEmail(identity);
    if (!email) {
      return { accepted: 0 };
    }

    const invites = await ctx.db
      .query("projectInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .collect();

    let accepted = 0;
    for (const invite of invites) {
      const existing = await ctx.db
        .query("projectMembers")
        .withIndex("by_project_user", (q) =>
          q.eq("projectId", invite.projectId).eq("userId", identity.subject),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("projectMembers", {
          projectId: invite.projectId,
          userId: identity.subject,
          role: invite.role,
          email,
          name: identityDisplayName(identity),
          imageUrl: identity.pictureUrl,
          color: colorForUserId(identity.subject),
          createdAt: Date.now(),
        });
      }

      await ctx.db.patch(invite._id, { status: "accepted" });
      accepted += 1;
    }

    return { accepted };
  },
});

export const leaveProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId === identity.subject) {
      throw new Error("Owners cannot leave their own project");
    }

    const membership = await ctx.db
      .query("projectMembers")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", identity.subject),
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this project");
    }

    await ctx.db.delete(membership._id);
  },
});

/** Invite by email: add immediately if Clerk user exists, else pending invite + token. */
export const inviteByEmail = action({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { kind: "added"; userId: string }
    | { kind: "invited"; inviteId: Id<"projectInvites">; token: string }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required");
    }

    await ctx.runQuery(api.sharing.assertOwner, {
      projectId: args.projectId,
    });

    const clerkUser = await lookupClerkUserByEmail(email);
    if (clerkUser) {
      await ctx.runMutation(api.sharing.addMember, {
        projectId: args.projectId,
        userId: clerkUser.userId,
        role: args.role,
        email: clerkUser.email,
        name: clerkUser.name,
        imageUrl: clerkUser.imageUrl,
      });
      return { kind: "added", userId: clerkUser.userId };
    }

    const created: { inviteId: Id<"projectInvites">; token: string } =
      await ctx.runMutation(api.sharing.createPendingInvite, {
        projectId: args.projectId,
        email,
        role: args.role,
      });
    return {
      kind: "invited",
      inviteId: created.inviteId,
      token: created.token,
    };
  },
});

export const assertOwner = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await verifyProjectOwnerAccess(ctx, args.projectId);
    return true;
  },
});
