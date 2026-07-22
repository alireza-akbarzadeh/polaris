"use client";

import Image from "next/image";
import {
  ExternalLinkIcon,
  GitBranchIcon,
  GitCommitIcon,
  Loader2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProject } from "@/features/projects/hooks/use-projects";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";

type WorkspaceGitPanelProps = {
  projectId: string;
};

export function WorkspaceGitPanel({ projectId }: WorkspaceGitPanelProps) {
  const project = useProject({ projectId });
  const files = useProjectFiles(projectId);

  if (project === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  const isGitHub = project.source === "github" && project.githubRepoUrl;
  const fileCount = files?.filter((f) => f.kind === "file").length ?? 0;

  return (
    <div className="flex h-full flex-col overflow-auto">
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

      <div className="mt-auto border-t border-[#1e1f22] p-3">
        <p className="mb-2 text-[10px] tracking-wide text-[#6f737a] uppercase">
          Local workspace
        </p>
        <p className="text-[11px] text-[#9a9a9a]">
          {fileCount} {fileCount === 1 ? "file" : "files"} tracked locally
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-[#787878]">
          Commit, push, and diff views are coming soon. Changes are saved
          automatically as you edit.
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
