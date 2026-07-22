"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ExternalLinkIcon,
  GitBranchIcon,
  GitCommitIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/features/projects/hooks/use-projects";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { useCommitAndPush } from "@/features/github/hooks/use-commit-and-push";
import { WorkspaceChangeList } from "@/features/workspace/components/workspace-change-list";
import { WorkspaceGitHistory } from "@/features/workspace/components/workspace-git-history";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceGitPanelProps = {
  projectId: string;
};

type GitTab = "changes" | "history" | "info";

const GIT_TABS: { id: GitTab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "history", label: "History" },
  { id: "info", label: "Info" },
];

export function WorkspaceGitPanel({ projectId }: WorkspaceGitPanelProps) {
  const [activeTab, setActiveTab] = useState<GitTab>("changes");
  const [commitMessage, setCommitMessage] = useState("");
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const { push, isPushing } = useCommitAndPush(projectId);

  if (project === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  const isGitHub = project.source === "github" && project.githubRepoUrl;
  const changeCount = changedFiles?.length ?? 0;
  const stagedCount = changedFiles?.filter((file) => file.staged).length ?? 0;
  const canPush =
    isGitHub &&
    stagedCount > 0 &&
    commitMessage.trim().length > 0 &&
    !isPushing;

  const onCommitAndPush = async () => {
    if (!canPush) return;
    try {
      await push(commitMessage.trim());
      setCommitMessage("");
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-7 shrink-0 items-end gap-px border-b border-[#1e1f22] bg-[#2b2d30] px-1">
        {GIT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-t-sm px-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#1e1f22] text-[#dfdfdf]"
                : "text-[#9a9a9a] hover:text-[#dfdfdf]",
            )}
          >
            {tab.label}
            {tab.id === "changes" && changeCount > 0 ? (
              <span className="rounded-full bg-[#3574f0] px-1.5 text-[9px] text-white">
                {changeCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "changes" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-[#1e1f22] p-3">
            <GitHubConnectionStatus className="text-[11px]" />
            {isGitHub ? (
              <>
                <Textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  rows={3}
                  className="min-h-[72px] resize-none border-[#4e5155] bg-[#1e1f22] text-[12px] text-[#dfdfdf] placeholder:text-[#6f737a] focus-visible:ring-[#3574f0]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!canPush}
                  onClick={() => void onCommitAndPush()}
                  className="h-7 w-full bg-[#3574f0] text-[11px] text-white hover:bg-[#2d5fd4] disabled:opacity-50"
                >
                  {isPushing ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Pushing…
                    </>
                  ) : (
                    <>
                      <UploadIcon className="size-3.5" />
                      Commit &amp; Push
                      {stagedCount > 0 ? ` (${stagedCount})` : ""}
                    </>
                  )}
                </Button>
                {changeCount > 0 && stagedCount === 0 ? (
                  <p className="text-[10px] text-[#787878]">
                    Stage files below before committing.
                  </p>
                ) : null}
              </>
            ) : (
              <InitializeRepositoryPrompt />
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <WorkspaceChangeList
              projectId={projectId}
              interactive={Boolean(isGitHub)}
              emptyMessage={
                isGitHub
                  ? "No local changes since last GitHub sync"
                  : "No modified files"
              }
            />
          </div>
        </div>
      ) : activeTab === "history" ? (
        <WorkspaceGitHistory
          projectId={projectId}
          enabled={Boolean(isGitHub)}
        />
      ) : (
        <GitInfoTab project={project} isGitHub={Boolean(isGitHub)} />
      )}
    </div>
  );
}

function GitInfoTab({
  project,
  isGitHub,
}: {
  project: NonNullable<ReturnType<typeof useProject>>;
  isGitHub: boolean;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-3 border-b border-[#1e1f22] p-3">
        <div className="flex items-center gap-2">
          <Image
            src="/images/github.png"
            alt=""
            width={14}
            height={14}
            className="size-3.5 opacity-80 dark:invert"
          />
          <span className="text-[12px] font-medium text-[#dfdfdf]">Git</span>
        </div>
        <GitHubConnectionStatus className="text-[11px]" />
      </div>

      {isGitHub ? (
        <div className="space-y-3 p-3">
          <GitInfoRow
            icon={<GitBranchIcon className="size-3.5" />}
            label="Branch"
            value={project.githubBranch ?? "main"}
          />
          {project.lastCommitSha ? (
            <GitInfoRow
              icon={<GitCommitIcon className="size-3.5" />}
              label="Last push"
              value={project.lastCommitSha.slice(0, 7)}
            />
          ) : null}
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-[#6f737a] uppercase">
              Repository
            </p>
            <a
              href={
                project.githubRepoUrl?.startsWith("http")
                  ? project.githubRepoUrl
                  : `https://github.com/${project.githubRepoUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-[11px] text-[#589df6] hover:underline"
            >
              <span className="truncate">{project.githubRepoUrl}</span>
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          </div>
        </div>
      ) : (
        <InitializeRepositoryPrompt variant="info" />
      )}
    </div>
  );
}

function InitializeRepositoryPrompt({
  variant = "changes",
}: {
  variant?: "changes" | "info";
}) {
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);

  const content = (
    <div className="space-y-2">
      <p className="text-[11px] text-[#9a9a9a]">
        Create a GitHub repository for this project to track and push changes.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={openGitInitDialog}
        className="h-7 w-full bg-[#3574f0] text-[11px] text-white hover:bg-[#2d5fd4]"
      >
        Initialize Repository
      </Button>
    </div>
  );

  if (variant === "info") {
    return <div className="space-y-2 p-3">{content}</div>;
  }

  return content;
}

function GitInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-[#6f737a]">{icon}</span>
      <span className="text-[#6f737a]">{label}</span>
      <span className="ml-auto font-mono text-[#bcbec4]">{value}</span>
    </div>
  );
}
