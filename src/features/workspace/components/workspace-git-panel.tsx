"use client";

import Image from "next/image";
import {
  DownloadIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GitCommitIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/features/projects/hooks/use-projects";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { useCommitAndPush } from "@/features/github/hooks/use-commit-and-push";
import { useGenerateCommitMessage } from "@/features/github/hooks/use-generate-commit-message";
import { usePullFromGitHub } from "@/features/github/hooks/use-git-sync";
import { WorkspaceChangeList } from "@/features/workspace/components/workspace-change-list";
import { WorkspaceGitHistory } from "@/features/workspace/components/workspace-git-history";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import {
  useWorkspaceStore,
  type GitPanelTab,
} from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceGitPanelProps = {
  projectId: string;
};

const GIT_TABS: { id: GitPanelTab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "history", label: "History" },
  { id: "info", label: "Info" },
];

export function WorkspaceGitPanel({ projectId }: WorkspaceGitPanelProps) {
  const activeTab = useWorkspaceStore((s) => s.gitPanelTab);
  const setGitPanelTab = useWorkspaceStore((s) => s.setGitPanelTab);
  const [commitMessage, setCommitMessage] = useState("");
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const { push, isPushing } = useCommitAndPush(projectId);
  const { pull, isPulling } = usePullFromGitHub(projectId);
  const { generate, isGenerating, canGenerate } =
    useGenerateCommitMessage(projectId);

  if (project === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-ws-text-muted">
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

  const onGenerateCommitMessage = async () => {
    if (!canGenerate) return;
    const message = await generate();
    if (message) {
      setCommitMessage(message);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-7 shrink-0 items-end gap-px border-b border-ws-border-subtle bg-ws-panel px-1">
        {GIT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setGitPanelTab(tab.id)}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-t-sm px-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-ws-bg text-ws-text"
                : "text-ws-text-muted hover:text-ws-text",
            )}
          >
            {tab.label}
            {tab.id === "changes" && changeCount > 0 ? (
              <span className="rounded-full bg-ws-accent px-1.5 text-[9px] text-white">
                {changeCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "changes" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-ws-border-subtle p-3">
            <GitHubConnectionStatus className="text-[11px]" />
            {isGitHub ? (
              <>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPulling}
                    onClick={() => void pull()}
                    className="h-7 flex-1 border-ws-border bg-ws-bg text-[11px] text-ws-text hover:bg-ws-hover"
                  >
                    {isPulling ? (
                      <>
                        <Loader2Icon className="size-3.5 animate-spin" />
                        Pulling…
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="size-3.5" />
                        Pull
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-ws-text-muted">
                    Commit message
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!canGenerate || isPushing}
                    onClick={() => void onGenerateCommitMessage()}
                    className="h-6 gap-1 px-1.5 text-[11px] text-ws-text-muted hover:bg-ws-hover hover:text-ws-text disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2Icon className="size-3 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="size-3" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  rows={3}
                  disabled={isGenerating}
                  className="min-h-[72px] resize-none border-ws-border bg-ws-bg text-[12px] text-ws-text placeholder:text-ws-text-muted focus-visible:ring-ws-accent disabled:opacity-60"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!canPush || isGenerating}
                  onClick={() => void onCommitAndPush()}
                  className="h-7 w-full bg-ws-accent text-[11px] text-white hover:bg-ws-accent-hover disabled:opacity-50"
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
                  <p className="text-[10px] text-ws-text-muted">
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
        <GitInfoTab
          project={project}
          isGitHub={Boolean(isGitHub)}
          onPull={() => void pull()}
          isPulling={isPulling}
        />
      )}
    </div>
  );
}

function GitInfoTab({
  project,
  isGitHub,
  onPull,
  isPulling,
}: {
  project: NonNullable<ReturnType<typeof useProject>>;
  isGitHub: boolean;
  onPull: () => void;
  isPulling: boolean;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-3 border-b border-ws-border-subtle p-3">
        <div className="flex items-center gap-2">
          <Image
            src="/images/github.png"
            alt=""
            width={14}
            height={14}
            className="size-3.5 opacity-80 dark:invert"
          />
          <span className="text-[12px] font-medium text-ws-text">Git</span>
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
              label="Last sync"
              value={project.lastCommitSha.slice(0, 7)}
            />
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPulling}
            onClick={onPull}
            className="h-7 w-full border-ws-border bg-ws-bg text-[11px] text-ws-text hover:bg-ws-hover"
          >
            {isPulling ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Pulling from GitHub…
              </>
            ) : (
              <>
                <DownloadIcon className="size-3.5" />
                Pull / Sync Explorer
              </>
            )}
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-ws-text-muted uppercase">
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
              className="flex items-center gap-1 truncate text-[11px] text-ws-link hover:underline"
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
      <p className="text-[11px] text-ws-text-muted">
        Create a GitHub repository for this project to track and push changes.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={openGitInitDialog}
        className="h-7 w-full bg-ws-accent text-[11px] text-white hover:bg-ws-accent-hover"
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-ws-text-muted">{icon}</span>
      <span className="text-ws-text-muted">{label}</span>
      <span className="ml-auto font-mono text-ws-text-secondary">{value}</span>
    </div>
  );
}
