"use client";

import { GitBranchIcon, Loader2Icon } from "lucide-react";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import { getLanguageLabel } from "@/features/workspace/lib/editor-languages";
import { runCommand } from "@/features/workspace/commands/registry";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceStatusBarProps = {
  projectId: string;
};

export function WorkspaceStatusBar({ projectId }: WorkspaceStatusBarProps) {
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const currentFilePath = useWorkspaceStore((s) => s.currentFilePath);
  const setLeftPanelView = useWorkspaceStore((s) => s.setLeftPanelView);
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);

  const changeCount = changedFiles?.length ?? 0;
  const branch = project?.githubBranch ?? "main";
  const isGitHub = project?.source === "github" && project.githubRepoUrl;
  const isPushing = project?.exportStatus === "exporting";
  const language = getLanguageLabel(currentFilePath);

  const openGitPanel = () => {
    setLeftPanelView("git");
    if (!useWorkspaceStore.getState().sidebarOpen) {
      runCommand("toggleSidebar");
    }
  };

  return (
    <footer className="flex h-[22px] shrink-0 items-center justify-between border-t border-ws-border-subtle bg-ws-panel px-2 text-[11px] text-ws-text-muted">
      <div className="flex min-w-0 items-center gap-2">
        {isGitHub ? (
          <button
            type="button"
            onClick={openGitPanel}
            className={cn(
              "inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-sm px-1.5 py-0.5 transition-colors hover:bg-ws-hover hover:text-ws-text",
              changeCount > 0 && "text-ws-text",
            )}
            title="Open Git panel"
          >
            {isPushing ? (
              <Loader2Icon className="size-3 shrink-0 animate-spin" />
            ) : (
              <GitBranchIcon className="size-3 shrink-0" />
            )}
            <span className="truncate">{branch}</span>
            {changeCount > 0 ? (
              <span className="shrink-0 text-ws-success">
                {changeCount} change{changeCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="shrink-0 text-ws-text-muted">✓ clean</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={openGitInitDialog}
            className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-ws-text-muted transition-colors hover:bg-ws-hover hover:text-ws-text"
            title="Initialize Git repository"
          >
            <GitBranchIcon className="size-3 shrink-0" />
            <span>Initialize Repository</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {currentFilePath ? (
          <span
            className="hidden truncate sm:inline"
            title={currentFilePath}
          >
            {currentFilePath}
          </span>
        ) : null}
        <span className="shrink-0 px-1.5 text-ws-text-secondary">{language}</span>
        <span className="hidden shrink-0 sm:inline">UTF-8</span>
        <span className="hidden shrink-0 sm:inline">Spaces: 2</span>
      </div>
    </footer>
  );
}
