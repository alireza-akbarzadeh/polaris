"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  ActionCancelledError,
  isActionCancelled,
  useConfirm,
} from "@/components/confirm-dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

function isLocalChangesError(message: string) {
  return message.toLowerCase().includes("local change");
}

export function usePullFromGitHub(projectId: string) {
  const pullFromGitHub = useAction(api.githubPull.pullFromGitHub);
  const confirm = useConfirm();
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
          isLocalChangesError(message) && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = await confirm({
            title: "Discard local changes?",
            description: `${message}\n\nThis will overwrite your uncommitted files with the latest from GitHub.`,
            confirmLabel: "Discard & pull",
            cancelLabel: "Keep changes",
            tone: "danger",
          });
          if (discard) {
            setIsPulling(false);
            return pull({ ...options, force: true });
          }
          throw new ActionCancelledError();
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
    [confirm, pullFromGitHub, projectId],
  );

  return { pull, isPulling };
}

export function useGitBranches(projectId: string) {
  const listBranches = useAction(api.githubBranches.listBranches);
  const createBranchAction = useAction(api.githubBranches.createBranch);
  const checkoutBranchAction = useAction(api.githubBranches.checkoutBranch);
  const confirm = useConfirm();
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
        if (isActionCancelled(error)) throw error;

        const message = parseConvexErrorMessage(
          error,
          "Failed to switch branch",
        );
        const looksLikeLocalChanges =
          isLocalChangesError(message) && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = await confirm({
            title: "Uncommitted changes",
            description: `${message}\n\nDiscard local changes and check out “${branch}”?`,
            confirmLabel: "Discard & switch",
            cancelLabel: "Stay here",
            tone: "danger",
          });
          if (discard) {
            setIsMutating(false);
            return checkout(branch, { force: true });
          }
          throw new ActionCancelledError();
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
    [checkoutBranchAction, confirm, projectId],
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
        if (isActionCancelled(error)) throw error;

        const message = parseConvexErrorMessage(
          error,
          "Failed to create branch",
        );
        const looksLikeLocalChanges =
          isLocalChangesError(message) && !options?.force;

        if (looksLikeLocalChanges) {
          const discard = await confirm({
            title: "Uncommitted changes",
            description: `${message}\n\nDiscard local changes and switch to the new branch “${name}”?`,
            confirmLabel: "Discard & switch",
            cancelLabel: "Stay here",
            tone: "danger",
          });
          if (discard) {
            setIsMutating(false);
            return createBranch(name, { ...options, force: true });
          }
          throw new ActionCancelledError();
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
    [confirm, createBranchAction, projectId],
  );

  return {
    loadBranches,
    checkout,
    createBranch,
    isLoading,
    isMutating,
  };
}
