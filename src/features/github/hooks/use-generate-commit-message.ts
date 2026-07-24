"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useStagedCommitContext } from "@/features/workspace/hooks/use-project-files";

type GenerateCommitMessageResult = {
  message: string;
};

export function useGenerateCommitMessage(projectId: string) {
  const project = useProject({ projectId });
  const stagedContext = useStagedCommitContext(projectId);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (): Promise<string | null> => {
    if (!stagedContext || stagedContext.length === 0) {
      toast.error("Stage files before generating a commit message");
      return null;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/commit-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project?.name,
          files: stagedContext,
        }),
      });

      const data = (await response.json()) as
        | GenerateCommitMessageResult
        | { error?: string };

      if (!response.ok || !("message" in data) || !data.message) {
        const description =
          "error" in data && data.error
            ? data.error
            : "Could not generate a commit message";
        toast.error("Commit message generation failed", { description });
        return null;
      }

      return data.message;
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Network request failed";
      toast.error("Commit message generation failed", { description });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [project?.name, stagedContext]);

  return {
    generate,
    isGenerating,
    canGenerate: (stagedContext?.length ?? 0) > 0 && !isGenerating,
  };
}
