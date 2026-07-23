import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { verifyAuth } from "../auth";

export const projectRoleValidator = {
  owner: "owner",
  editor: "editor",
  viewer: "viewer",
} as const;

export type ProjectRole = (typeof projectRoleValidator)[keyof typeof projectRoleValidator];

export type ProjectAccess = {
  project: Doc<"projects">;
  role: ProjectRole;
  userId: string;
  canEdit: boolean;
  canManage: boolean;
};

const MEMBER_COLORS = [
  "#E57373",
  "#64B5F6",
  "#81C784",
  "#FFB74D",
  "#BA68C8",
  "#4DD0E1",
  "#FF8A65",
  "#A1887F",
  "#90A4AE",
  "#F06292",
] as const;

export function colorForUserId(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return MEMBER_COLORS[hash % MEMBER_COLORS.length]!;
}

export function canEditRole(role: ProjectRole) {
  return role === "owner" || role === "editor";
}

export function canManageRole(role: ProjectRole) {
  return role === "owner";
}

async function getMembership(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  userId: string,
) {
  return await ctx.db
    .query("projectMembers")
    .withIndex("by_project_user", (q) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();
}

export async function resolveProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
): Promise<ProjectAccess | null> {
  const identity = await verifyAuth(ctx);
  const project = await ctx.db.get("projects", projectId);
  if (!project) {
    return null;
  }

  const userId = identity.subject;

  if (project.ownerId === userId) {
    return {
      project,
      role: "owner",
      userId,
      canEdit: true,
      canManage: true,
    };
  }

  const membership = await getMembership(ctx, projectId, userId);
  if (!membership) {
    return null;
  }

  return {
    project,
    role: membership.role,
    userId,
    canEdit: canEditRole(membership.role),
    canManage: canManageRole(membership.role),
  };
}

/** Any member (owner / editor / viewer) may read the project. */
export async function verifyProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const access = await resolveProjectAccess(ctx, projectId);
  if (!access) {
    const project = await ctx.db.get("projects", projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    throw new Error("Unauthorized access to this project");
  }
  return access.project;
}

/** Owner or editor may mutate files / content. */
export async function verifyProjectWriteAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const access = await resolveProjectAccess(ctx, projectId);
  if (!access) {
    const project = await ctx.db.get("projects", projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    throw new Error("Unauthorized access to this project");
  }
  if (!access.canEdit) {
    throw new Error("You have view-only access to this project");
  }
  return access;
}

/** Only the project owner may manage sharing / delete / GitHub. */
export async function verifyProjectOwnerAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const access = await resolveProjectAccess(ctx, projectId);
  if (!access) {
    const project = await ctx.db.get("projects", projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    throw new Error("Unauthorized access to this project");
  }
  if (!access.canManage) {
    throw new Error("Only the project owner can do this");
  }
  return access;
}

export async function ensureOwnerMembership(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  ownerId: string,
  profile?: {
    email?: string;
    name?: string;
    imageUrl?: string;
  },
) {
  const existing = await getMembership(ctx, projectId, ownerId);
  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert("projectMembers", {
    projectId,
    userId: ownerId,
    role: "owner",
    email: profile?.email,
    name: profile?.name,
    imageUrl: profile?.imageUrl,
    color: colorForUserId(ownerId),
    createdAt: Date.now(),
  });
}

export function identityEmail(identity: {
  email?: string;
  emailVerified?: boolean;
}) {
  return identity.email?.trim().toLowerCase() ?? null;
}

export function identityDisplayName(identity: {
  name?: string;
  nickname?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}) {
  if (identity.name?.trim()) return identity.name.trim();
  if (identity.nickname?.trim()) return identity.nickname.trim();
  const full = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (full) return full;
  if (identity.email?.trim()) return identity.email.trim();
  return "User";
}
