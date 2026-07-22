"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

export function useInitializeGitRepo(projectId: string) {
  const initializeRepository = useAction(api.githubInit.initializeRepository);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const initialize = useCallback(
    async (args: {
      repoName: string;
      isPrivate?: boolean;
      commitMessage?: string;
    }) => {
      setIsInitializing(true);
      setLastError(null);

      const toastId = toast.loading("Creating GitHub repository…", {
        description: "This may take a few seconds while GitHub prepares the repo.",
      });

      try {
        const result = await initializeRepository({
          projectId: projectId as Id<"projects">,
          repoName: args.repoName,
          isPrivate: args.isPrivate,
          commitMessage: args.commitMessage,
        });

        toast.success(
          `Repository created with ${result.filesPushed} file${result.filesPushed === 1 ? "" : "s"}`,
          {
            id: toastId,
            description: result.repoUrl,
          },
        );

        return result;
      } catch (error) {
        const message = parseConvexErrorMessage(
          error,
          "Failed to initialize repository",
        );
        setLastError(message);
        toast.error("Could not initialize repository", {
          id: toastId,
          description: message,
          duration: 8000,
        });
        throw error;
      } finally {
        setIsInitializing(false);
      }
    },
    [initializeRepository, projectId],
  );

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return { initialize, isInitializing, lastError, clearError };
}
