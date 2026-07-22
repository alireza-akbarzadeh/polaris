"use client";

import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

export function useCommitAndPush(projectId: string) {
  const commitAndPush = useAction(api.githubPush.commitAndPush);
  const [isPushing, setIsPushing] = useState(false);

  const push = useCallback(
    async (message: string) => {
      setIsPushing(true);
      try {
        const result = await commitAndPush({
          projectId: projectId as Id<"projects">,
          message,
        });
        toast.success(
          `Pushed ${result.filesPushed} file${result.filesPushed === 1 ? "" : "s"} to GitHub`,
        );
        return result;
      } catch (error) {
        const message = parseConvexErrorMessage(error, "Failed to push to GitHub");
        toast.error("Could not push to GitHub", {
          description: message,
          duration: 8000,
        });
        throw error;
      } finally {
        setIsPushing(false);
      }
    },
    [commitAndPush, projectId],
  );

  return { push, isPushing };
}
