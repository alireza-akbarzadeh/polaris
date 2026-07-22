"use node";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { createOctokit, getClerkGitHubToken } from "./lib/github";

export const syncConnection = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const token = await getClerkGitHubToken(identity.subject);
    if (!token) {
      await ctx.runMutation(internal.github.disconnect, {
        userId: identity.subject,
      });
      return { connected: false as const };
    }

    const octokit = createOctokit(token);
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    await ctx.runMutation(internal.github.upsertConnection, {
      userId: identity.subject,
      githubUserId: String(githubUser.id),
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    return {
      connected: true as const,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };
  },
});
