"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

function confirmDiscard(message: string) {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}

export function usePullFromGitHub(projectId: string) {
  const pullFromGitHub = useAction(api.githubPull.pullFromGitHub);
  const [isPulling, setIsPulling] = useState(false);

  const pull = useCallback(
    async (options?: { force?: boolean; branch?: string }) => {
      setIsPulling(true);
      try {
        const result = await pullFromGitHub({
          projectId: projectId as Id<"projects">,
          force: options?.force,
          branch: options?.branch,
        });
        toast.success(
          `Synced ${result.fileCount} file${result.fileCount === 1 ? "" : "s"} from ${result.branch}`,
        );
        return result;
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to pull from GitHub",
        );
        const looksLikeLocalChanges =
          message.toLowerCase().includes("local change") && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = confirmDiscard(
            `${message}\n\nDiscard local changes and overwrite from GitHub?`,
          );
          if (discard) {
            setIsPulling(false);
            return pull({ ...options, force: true });
          }
        }

        toast.error("Could not pull from GitHub", {
          description: message,
          duration: 8000,
        });
        throw error;
      } finally {
        setIsPulling(false);
      }
    },
    [pullFromGitHub, projectId],
  );

  return { pull, isPulling };
}

export function useGitBranches(projectId: string) {
  const listBranches = useAction(api.githubBranches.listBranches);
  const createBranchAction = useAction(api.githubBranches.createBranch);
  const checkoutBranchAction = useAction(api.githubBranches.checkoutBranch);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      return await listBranches({
        projectId: projectId as Id<"projects">,
      });
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
  }, [listBranches, projectId]);

  const checkout = useCallback(
    async (branch: string, options?: { force?: boolean }) => {
      setIsMutating(true);
      try {
        const result = await checkoutBranchAction({
          projectId: projectId as Id<"projects">,
          branch,
          force: options?.force,
        });
        toast.success(`Switched to ${result.branch}`);
        return result;
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to switch branch",
        );
        const looksLikeLocalChanges =
          message.toLowerCase().includes("local change") && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = confirmDiscard(
            `${message}\n\nDiscard local changes and checkout ${branch}?`,
          );
          if (discard) {
            setIsMutating(false);
            return checkout(branch, { force: true });
          }
        }

        toast.error("Could not switch branch", {
          description: message,
          duration: 8000,
        });
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [checkoutBranchAction, projectId],
  );

  const createBranch = useCallback(
    async (
      name: string,
      options?: { checkout?: boolean; force?: boolean },
    ) => {
      setIsMutating(true);
      try {
        const result = await createBranchAction({
          projectId: projectId as Id<"projects">,
          name,
          checkout: options?.checkout ?? true,
          force: options?.force,
        });
        toast.success(
          result.checkedOut
            ? `Created and switched to ${result.name}`
            : `Created branch ${result.name}`,
        );
        return result;
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to create branch",
        );
        const looksLikeLocalChanges =
          message.toLowerCase().includes("local change") && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = confirmDiscard(
            `${message}\n\nDiscard local changes and switch to the new branch?`,
          );
          if (discard) {
            setIsMutating(false);
            return createBranch(name, { ...options, force: true });
          }
        }

        toast.error("Could not create branch", {
          description: message,
          duration: 8000,
        });
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [createBranchAction, projectId],
  );

  return {
    loadBranches,
    checkout,
    createBranch,
    isLoading,
    isMutating,
  };
}
