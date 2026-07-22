"use client";

import Image from "next/image";
import {
  CloudUploadIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";

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
import { useProject } from "@/features/projects/hooks/use-projects";
import { runCommand } from "@/features/workspace/commands/registry";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
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
  const changedFiles = useChangedFiles(projectId);
  const { isConnected, hasRepoScope } = useGitHubConnection();
  const { connect, isConnecting } = useConnectGitHub();
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);
  const setLeftPanelView = useWorkspaceStore((s) => s.setLeftPanelView);

  const isGitHub = project?.source === "github" && Boolean(project.githubRepoUrl);
  const changeCount = changedFiles?.length ?? 0;
  const isPublishing = project?.exportStatus === "exporting";
  const hasPendingChanges = isGitHub && changeCount > 0;

  const openGitPanel = () => {
    setLeftPanelView("git");
    if (!useWorkspaceStore.getState().sidebarOpen) {
      runCommand("toggleSidebar");
    }
  };

  const onPublishToGitHub = () => {
    if (!isConnected || !hasRepoScope) {
      void connect();
      return;
    }
    openGitInitDialog();
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
                "relative size-7 rounded-sm text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
                hasPendingChanges &&
                  "text-[#dfdfdf] after:absolute after:right-0.5 after:top-0.5 after:size-1.5 after:rounded-full after:bg-[#3574f0]",
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
          className="border border-[#5a5d63] bg-[#3c3f41] px-2.5 py-1.5 text-xs text-[#dfdfdf] [&_svg]:hidden"
        >
          Publish
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        className="w-60 border-[#4e5155] bg-[#2b2d30] text-[#dfdfdf]"
      >
        <DropdownMenuLabel className="text-[11px] text-[#9a9a9a]">
          Source Control
        </DropdownMenuLabel>

        {!isConnected ? (
          <DropdownMenuItem
            className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
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
            className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
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
                className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
                onClick={openGitPanel}
              >
                <UploadIcon className="size-3.5" />
                Push {changeCount} change{changeCount === 1 ? "" : "s"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-[12px] text-[#9a9a9a] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
                disabled
              >
                <GitBranchIcon className="size-3.5" />
                No changes to push
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
              onClick={openGitPanel}
            >
              <GitBranchIcon className="size-3.5" />
              Open Git panel
            </DropdownMenuItem>
            {project.githubRepoUrl ? (
              <DropdownMenuItem
                className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
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
            className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
            onClick={onPublishToGitHub}
          >
            <CloudUploadIcon className="size-3.5" />
            Publish to GitHub
          </DropdownMenuItem>
        )}

        {!hasRepoScope && isConnected ? (
          <p className="px-2 py-1.5 text-[10px] leading-relaxed text-[#787878]">
            {GITHUB_REPO_SCOPE_MESSAGE}
          </p>
        ) : null}

        {isGitHub && project.githubRepoUrl ? (
          <>
            <DropdownMenuSeparator className="bg-[#4e5155]" />
            <DropdownMenuLabel className="text-[11px] text-[#9a9a9a]">
              Deploy
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
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
              className="text-[12px] focus:bg-[#3c3f41] focus:text-[#dfdfdf]"
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
