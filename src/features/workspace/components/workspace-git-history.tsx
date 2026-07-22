"use client";

import { useAction } from "convex/react";
import {
  ExternalLinkIcon,
  GitCommitHorizontalIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { cn } from "@/lib/utils";

type CommitItem = {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorDate: string;
  url: string;
};

type WorkspaceGitHistoryProps = {
  projectId: string;
  enabled: boolean;
};

function formatCommitDate(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkspaceGitHistory({
  projectId,
  enabled,
}: WorkspaceGitHistoryProps) {
  const listCommits = useAction(api.githubHistory.listCommits);
  const [commits, setCommits] = useState<CommitItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCommits({
        projectId: projectId as Id<"projects">,
        limit: 40,
      });
      setCommits(result);
    } catch (err) {
      setCommits(null);
      setError(parseConvexErrorMessage(err, "Failed to load commit history"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, listCommits, projectId]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  if (!enabled) {
    return (
      <p className="px-3 py-4 text-[11px] text-[#787878]">
        Connect and publish this project to GitHub to view commit history.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-[#1e1f22] px-2">
        <span className="text-[11px] text-[#9a9a9a]">Commit History</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Refresh"
          aria-label="Refresh commit history"
          disabled={isLoading}
          onClick={() => void load()}
          className="size-5 rounded-sm text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
        >
          <RefreshCwIcon
            className={cn("size-3", isLoading && "animate-spin")}
          />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && commits === null ? (
          <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
            <Loader2Icon className="size-3.5 animate-spin" />
            Loading commits…
          </div>
        ) : error ? (
          <div className="space-y-2 px-3 py-4">
            <p className="text-[11px] text-[#ff8a85]">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void load()}
              className="h-7 text-[11px] text-[#bcbec4] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
            >
              Try again
            </Button>
          </div>
        ) : commits && commits.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-[#787878]">
            No commits found on this branch.
          </p>
        ) : (
          <ul className="space-y-0 p-1.5">
            {commits?.map((commit, index) => (
              <li key={commit.sha}>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-[#3c3f41]"
                >
                  <div className="flex w-3 shrink-0 flex-col items-center pt-1">
                    <span
                      className={cn(
                        "size-2 rounded-full border border-[#3574f0]",
                        index === 0 ? "bg-transparent" : "bg-[#3574f0]",
                      )}
                    />
                    {index < (commits?.length ?? 0) - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-[#3574f0]/40" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start gap-1">
                      <GitCommitHorizontalIcon className="mt-0.5 size-3 shrink-0 text-[#6f737a]" />
                      <p className="min-w-0 flex-1 text-[12px] leading-snug text-[#dfdfdf]">
                        {commit.message}
                      </p>
                      <ExternalLinkIcon className="mt-0.5 size-3 shrink-0 text-[#6f737a]" />
                    </div>
                    <div className="flex items-center gap-2 pl-4 text-[10px] text-[#6f737a]">
                      <span className="font-mono text-[#589df6]">
                        {commit.shortSha}
                      </span>
                      <span className="truncate">{commit.authorName}</span>
                      <span className="ml-auto shrink-0">
                        {formatCommitDate(commit.authorDate)}
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
