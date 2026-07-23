"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

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

export function useGitHubRepositories() {
  const listRepositories = useAction(api.githubRepos.listRepositories);
  const [isLoading, setIsLoading] = useState(false);

  const loadRepositories = useCallback(
    async (options?: { query?: string; page?: number }) => {
      setIsLoading(true);
      try {
        return await listRepositories({
          query: options?.query,
          page: options?.page ?? 1,
          perPage: 100,
        });
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to load GitHub repositories",
        );
        toast.error("Could not load repositories", { description: message });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [listRepositories],
  );

  return { loadRepositories, isLoading };
}

export function useGitHubRepoBranches() {
  const listRepoBranches = useAction(api.githubRepos.listRepoBranches);
  const [isLoading, setIsLoading] = useState(false);

  const loadBranches = useCallback(
    async (repoUrl: string) => {
      setIsLoading(true);
      try {
        return await listRepoBranches({ repoUrl });
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to load branches",
        );
        toast.error("Could not load branches", { description: message });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [listRepoBranches],
  );

  return { loadBranches, isLoading };
}
