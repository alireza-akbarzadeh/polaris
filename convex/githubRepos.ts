"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";
import {
  createOctokit,
  getClerkGitHubToken,
  parseRepoUrl,
} from "./lib/github";

const repoValidator = v.object({
  fullName: v.string(),
  name: v.string(),
  owner: v.string(),
  private: v.boolean(),
  defaultBranch: v.string(),
  description: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  htmlUrl: v.string(),
});

export type GitHubRepository = {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  updatedAt: string | null;
  htmlUrl: string;
};

export type GitHubBranchOption = {
  name: string;
  protected: boolean;
};

/**
 * List repositories the signed-in user can access via the GitHub API
 * (owned, collaborator, and org membership).
 */
export const listRepositories = action({
  args: {
    query: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  returns: v.object({
    repositories: v.array(repoValidator),
    page: v.number(),
    perPage: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{
    repositories: GitHubRepository[];
    page: number;
    perPage: number;
    hasMore: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error("GitHub is not connected.");
    }

    const octokit = createOctokit(token);
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Math.floor(args.perPage ?? 100)));
    const query = args.query?.trim().toLowerCase();

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      affiliation: "owner,collaborator,organization_member",
      sort: "updated",
      direction: "desc",
      per_page: perPage,
      page,
    });

    let repositories: GitHubRepository[] = data.map((repo) => ({
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private,
      defaultBranch: repo.default_branch,
      description: repo.description,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }));

    if (query) {
      repositories = repositories.filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(query) ||
          (repo.description?.toLowerCase().includes(query) ?? false),
      );
    }

    return {
      repositories,
      page,
      perPage,
      hasMore: data.length === perPage,
    };
  },
});

/**
 * List branches for any owner/repo the user can access (clone-time picker).
 */
export const listRepoBranches = action({
  args: {
    repoUrl: v.string(),
  },
  returns: v.object({
    branches: v.array(
      v.object({
        name: v.string(),
        protected: v.boolean(),
      }),
    ),
    defaultBranch: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    branches: GitHubBranchOption[];
    defaultBranch: string | null;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      throw new Error("GitHub is not connected.");
    }

    const octokit = createOctokit(token);
    const { owner, repo } = parseRepoUrl(args.repoUrl);

    let defaultBranch: string | null = null;
    try {
      const { data: repository } = await octokit.rest.repos.get({
        owner,
        repo,
      });
      defaultBranch = repository.default_branch;
    } catch {
      throw new Error(
        `Repository "${owner}/${repo}" was not found or you do not have access.`,
      );
    }

    const branches: GitHubBranchOption[] = [];
    let page = 1;
    const perPage = 100;

    while (page <= 10) {
      const { data } = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
        page,
      });

      for (const branch of data) {
        branches.push({
          name: branch.name,
          protected: branch.protected,
        });
      }

      if (data.length < perPage) {
        break;
      }
      page += 1;
    }

    branches.sort((a, b) => {
      if (defaultBranch) {
        if (a.name === defaultBranch) return -1;
        if (b.name === defaultBranch) return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return { branches, defaultBranch };
  },
});
