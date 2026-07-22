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
    <footer className="flex h-[22px] shrink-0 items-center justify-between border-t border-[#1e1f22] bg-[#2b2d30] px-2 text-[11px] text-[#9a9a9a]">
      <div className="flex min-w-0 items-center gap-2">
        {isGitHub ? (
          <button
            type="button"
            onClick={openGitPanel}
            className={cn(
              "inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-sm px-1.5 py-0.5 transition-colors hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
              changeCount > 0 && "text-[#dfdfdf]",
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
              <span className="shrink-0 text-[#6a8759]">
                {changeCount} change{changeCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="shrink-0 text-[#6f737a]">✓ clean</span>
            )}
          </button>
        ) : (
          <span className="px-1.5 text-[#6f737a]">No Git repository</span>
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
        <span className="shrink-0 px-1.5 text-[#bcbec4]">{language}</span>
        <span className="hidden shrink-0 sm:inline">UTF-8</span>
        <span className="hidden shrink-0 sm:inline">Spaces: 2</span>
      </div>
    </footer>
  );
}
