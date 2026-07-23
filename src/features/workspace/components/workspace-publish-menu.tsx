"use client";

import Image from "next/image";
import {
  CloudUploadIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  Loader2Icon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useConnectGitHub,
  useGitHubConnection,
} from "@/features/github/hooks/use-github-connection";
import { GITHUB_REPO_SCOPE_MESSAGE } from "@/features/github/lib/github-scopes";
import { useProjectAccess } from "@/features/projects/hooks/use-project-access";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import {
  useChangedFiles,
  useProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import { exportProjectAsZip } from "@/features/workspace/lib/export-project-zip";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspacePublishMenuProps = {
  projectId: string;
};

function toGitHubUrl(repoUrl: string) {
  return repoUrl.startsWith("http")
    ? repoUrl
    : `https://github.com/${repoUrl}`;
}

function deployUrl(
  platform: "netlify" | "vercel",
  repoUrl: string,
) {
  const githubUrl = toGitHubUrl(repoUrl);
  if (platform === "netlify") {
    return `https://app.netlify.com/start/deploy?repository=${encodeURIComponent(githubUrl)}`;
  }
  return `https://vercel.com/new/clone?repository-url=${encodeURIComponent(githubUrl)}`;
}

export function WorkspacePublishMenu({ projectId }: WorkspacePublishMenuProps) {
  const project = useProject({ projectId });
  const access = useProjectAccess(projectId);
  const { openTab } = useEditorTabs(projectId);
  const projectFiles = useProjectFiles(projectId);
  const changedFiles = useChangedFiles(projectId);
  const { isConnected, hasRepoScope } = useGitHubConnection();
  const { connect, isConnecting } = useConnectGitHub();
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);
  const showGitPanel = useWorkspaceStore((s) => s.showGitPanel);
  const [isExporting, setIsExporting] = useState(false);

  const isGitHub = project?.source === "github" && Boolean(project.githubRepoUrl);
  const changeCount = changedFiles?.length ?? 0;
  const isPublishing = project?.exportStatus === "exporting";
  const hasPendingChanges = isGitHub && changeCount > 0;

  const onPublishToGitHub = () => {
    if (!isConnected || !hasRepoScope) {
      void connect();
      return;
    }
    openGitInitDialog();
  };

  const onExportZip = () => {
    if (isExporting) return;
    if (projectFiles === undefined) {
      toast.message("Loading project files…");
      return;
    }

    setIsExporting(true);
    try {
      const result = exportProjectAsZip({
        projectName: project?.name ?? "project",
        files: projectFiles,
      });
      toast.success(`Exported ${result.fileCount} files as ${result.filename}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export project",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Publish"
              className={cn(
                "relative size-7 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text",
                hasPendingChanges &&
                  "text-ws-text after:absolute after:right-0.5 after:top-0.5 after:size-1.5 after:rounded-full after:bg-ws-accent",
              )}
            >
              {isPublishing ? (
                <Loader2Icon className="size-3.5 animate-spin" strokeWidth={1.75} />
              ) : (
                <CloudUploadIcon className="size-3.5" strokeWidth={1.75} />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-xs text-ws-text [&_svg]:hidden"
        >
          Publish
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        className="w-60 border-ws-border bg-ws-panel text-ws-text"
      >
        <DropdownMenuLabel className="text-[11px] text-ws-text-muted">
          Source Control
        </DropdownMenuLabel>

        {!isConnected ? (
          <DropdownMenuItem
            className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
            onClick={() => void connect()}
            disabled={isConnecting}
          >
            <Image
              src="/images/github.png"
              alt=""
              width={14}
              height={14}
              className="size-3.5 opacity-80 dark:invert"
            />
            {isConnecting ? "Connecting…" : "Connect GitHub"}
          </DropdownMenuItem>
        ) : !hasRepoScope ? (
          <DropdownMenuItem
            className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
            onClick={() => void connect()}
            disabled={isConnecting}
          >
            <Image
              src="/images/github.png"
              alt=""
              width={14}
              height={14}
              className="size-3.5 opacity-80 dark:invert"
            />
            Grant repository access
          </DropdownMenuItem>
        ) : isGitHub ? (
          <>
            {changeCount > 0 ? (
              <DropdownMenuItem
                className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
                onClick={() => showGitPanel("changes")}
              >
                <UploadIcon className="size-3.5" />
                Push {changeCount} change{changeCount === 1 ? "" : "s"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-[12px] text-ws-text-muted focus:bg-ws-hover focus:text-ws-text"
                disabled
              >
                <GitBranchIcon className="size-3.5" />
                No changes to push
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              onClick={() => showGitPanel("changes")}
            >
              <GitBranchIcon className="size-3.5" />
              Open Git Changes
            </DropdownMenuItem>
            {project.githubRepoUrl ? (
              <DropdownMenuItem
                className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
                asChild
              >
                <a
                  href={toGitHubUrl(project.githubRepoUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  View on GitHub
                </a>
              </DropdownMenuItem>
            ) : null}
          </>
        ) : (
          <DropdownMenuItem
            className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
            onClick={onPublishToGitHub}
          >
            <CloudUploadIcon className="size-3.5" />
            Publish to GitHub
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-ws-border" />
        <DropdownMenuLabel className="text-[11px] text-ws-text-muted">
          Local
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
          onClick={onExportZip}
          disabled={isExporting || projectFiles === undefined}
        >
          {isExporting ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <DownloadIcon className="size-3.5" />
          )}
          {isExporting ? "Exporting…" : "Download project ZIP"}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-ws-border" />
        <DropdownMenuLabel className="text-[11px] text-ws-text-muted">
          Sharing
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
          onClick={() => openTab({ kind: "settings" })}
        >
          <UsersIcon className="size-3.5" />
          {access?.canManage
            ? "Invite & manage collaborators"
            : "View collaborators"}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-ws-border" />
        <DropdownMenuItem
          className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
          onClick={() => {
            useWorkspaceStore.getState().openCloneFromGitHub();
          }}
        >
          <Image
            src="/images/github.png"
            alt=""
            width={14}
            height={14}
            className="size-3.5 opacity-80 dark:invert"
          />
          Clone from GitHub
        </DropdownMenuItem>

        {!hasRepoScope && isConnected ? (
          <p className="px-2 py-1.5 text-[10px] leading-relaxed text-ws-text-muted">
            {GITHUB_REPO_SCOPE_MESSAGE}
          </p>
        ) : null}

        {isGitHub && project.githubRepoUrl ? (
          <>
            <DropdownMenuSeparator className="bg-ws-border" />
            <DropdownMenuLabel className="text-[11px] text-ws-text-muted">
              Deploy
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              asChild
            >
              <a
                href={deployUrl("netlify", project.githubRepoUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="size-3.5" />
                Deploy to Netlify
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              asChild
            >
              <a
                href={deployUrl("vercel", project.githubRepoUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="size-3.5" />
                Deploy to Vercel
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
