"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ExternalLinkIcon,
  GitBranchIcon,
  GitCommitIcon,
  Loader2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProject } from "@/features/projects/hooks/use-projects";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { WorkspaceChangeList } from "@/features/workspace/components/workspace-change-list";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import { cn } from "@/lib/utils";

type WorkspaceGitPanelProps = {
  projectId: string;
};

type GitTab = "changes" | "info";

const GIT_TABS: { id: GitTab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "info", label: "Info" },
];

export function WorkspaceGitPanel({ projectId }: WorkspaceGitPanelProps) {
  const [activeTab, setActiveTab] = useState<GitTab>("changes");
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);

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
        <div className="flex-1 overflow-auto">
          <div className="border-b border-[#1e1f22] p-3">
            <GitHubConnectionStatus className="text-[11px]" />
          </div>
          <WorkspaceChangeList
            projectId={projectId}
            emptyMessage={
              isGitHub
                ? "No local changes since last GitHub import"
                : "No modified files"
            }
          />
        </div>
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
              label="Last import"
              value={project.lastCommitSha.slice(0, 7)}
            />
          ) : null}
          <div className="space-y-1">
            <p className="text-[10px] tracking-wide text-[#6f737a] uppercase">
              Repository
            </p>
            <a
              href={project.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-[11px] text-[#589df6] hover:underline"
            >
              <span className="truncate">{project.githubRepoUrl}</span>
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          </div>
          {project.importStatus === "importing" ? (
            <p className="flex items-center gap-1.5 text-[11px] text-[#9a9a9a]">
              <Loader2Icon className="size-3 animate-spin" />
              Importing from GitHub…
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 p-3">
          <p className="text-[11px] text-[#9a9a9a]">
            This project is not linked to a GitHub repository.
          </p>
          <p className="text-[11px] text-[#787878]">
            Clone a repository from the home page to import a GitHub project.
          </p>
        </div>
      )}

      <div className="border-t border-[#1e1f22] p-3">
        <p className="text-[10px] leading-relaxed text-[#787878]">
          Push and commit to GitHub are coming soon. Edits are tracked locally
          in the Changes tab.
        </p>
        {isGitHub ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled
            className="mt-3 h-7 border-[#4e5155] bg-transparent text-[11px] text-[#9a9a9a]"
          >
            Push to GitHub (soon)
          </Button>
        ) : null}
      </div>
    </div>
  );
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
