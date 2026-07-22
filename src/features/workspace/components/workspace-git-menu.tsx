"use client";

import {
  DownloadIcon,
  GitBranchIcon,
  GitCommitHorizontalIcon,
  HistoryIcon,
  PlusIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePullFromGitHub } from "@/features/github/hooks/use-git-sync";
import { useProject } from "@/features/projects/hooks/use-projects";
import { runCommand } from "@/features/workspace/commands/registry";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceGitMenuProps = {
  projectId: string;
};

export function WorkspaceGitMenu({ projectId }: WorkspaceGitMenuProps) {
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const { pull, isPulling } = usePullFromGitHub(projectId);
  const showGitPanel = useWorkspaceStore((s) => s.showGitPanel);
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);
  const openBranchPicker = useWorkspaceStore((s) => s.openBranchPicker);
  const [menuOpen, setMenuOpen] = useState(false);

  const isGitHub = project?.source === "github" && Boolean(project.githubRepoUrl);
  const changeCount = changedFiles?.length ?? 0;
  const branch = project?.githubBranch ?? "main";

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Git"
              className={cn(
                "relative size-7 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text",
                changeCount > 0 &&
                  "text-ws-text after:absolute after:right-0.5 after:top-0.5 after:size-1.5 after:rounded-full after:bg-ws-accent",
              )}
            >
              <GitBranchIcon className="size-3.5" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="flex items-center gap-3 border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-ws-text [&_svg]:hidden"
        >
          <span className="text-xs">Git</span>
          <KbdGroup className="gap-0.5 opacity-80">
            <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
              ⌘
            </Kbd>
            <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
              9
            </Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        className="w-64 border-ws-border bg-ws-panel text-ws-text"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-[11px] text-ws-text-muted">
          <span>Git</span>
          {isGitHub ? (
            <span className="font-mono text-[10px] text-ws-text-secondary">
              {branch}
            </span>
          ) : null}
        </DropdownMenuLabel>

        {isGitHub ? (
          <>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              onClick={() => showGitPanel("changes")}
            >
              <GitCommitHorizontalIcon className="size-3.5" />
              Git Changes
              {changeCount > 0 ? (
                <span className="ml-auto rounded-full bg-ws-accent px-1.5 text-[9px] text-white">
                  {changeCount}
                </span>
              ) : (
                <DropdownMenuShortcut>⇧⌘G</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              onClick={() => showGitPanel("history")}
            >
              <HistoryIcon className="size-3.5" />
              Git History
              <DropdownMenuShortcut>⇧⌘H</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-ws-border" />
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              disabled={isPulling}
              onClick={() => {
                void pull();
              }}
            >
              <DownloadIcon className="size-3.5" />
              {isPulling ? "Pulling…" : "Pull from GitHub"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              onClick={() => {
                setMenuOpen(false);
                openBranchPicker();
              }}
            >
              <GitBranchIcon className="size-3.5" />
              Branches…
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
              onClick={() => showGitPanel("info")}
            >
              <Image
                src="/images/github.png"
                alt=""
                width={14}
                height={14}
                className="size-3.5 opacity-80 dark:invert"
              />
              Repository Info
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
            onClick={openGitInitDialog}
          >
            <PlusIcon className="size-3.5" />
            Initialize Repository
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-ws-border" />
        <DropdownMenuItem
          className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
          onClick={() => runCommand("openCloneFromGitHub")}
        >
          <Image
            src="/images/github.png"
            alt=""
            width={14}
            height={14}
            className="size-3.5 opacity-80 dark:invert"
          />
          Clone from GitHub
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px] focus:bg-ws-hover focus:text-ws-text"
          onClick={() => runCommand("showGit")}
        >
          <GitBranchIcon className="size-3.5" />
          Open Git Tool Window
          <DropdownMenuShortcut>⌘9</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
