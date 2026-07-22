"use client";

import { WorkspaceActivityBar } from "@/features/workspace/components/workspace-activity-bar";
import { WorkspaceExplorerPanel } from "@/features/workspace/components/workspace-explorer-panel";
import { WorkspaceGitPanel } from "@/features/workspace/components/workspace-git-panel";
import { WorkspaceSearchPanel } from "@/features/workspace/components/workspace-search-panel";
import {
  LEFT_PANEL_LABELS,
  useWorkspaceStore,
} from "@/features/workspace/store/workspace-store";

type WorkspaceSidebarProps = {
  projectId: string;
};

export function WorkspaceSidebar({ projectId }: WorkspaceSidebarProps) {
  const leftPanelView = useWorkspaceStore((s) => s.leftPanelView);

  return (
    <div className="flex h-full">
      <WorkspaceActivityBar />
      <aside className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-7 items-center border-b border-[#1e1f22] px-3">
          <p className="text-[11px] font-semibold tracking-wide text-[#dfdfdf]">
            {LEFT_PANEL_LABELS[leftPanelView]}
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          {leftPanelView === "explorer" ? (
            <WorkspaceExplorerPanel projectId={projectId} />
          ) : null}
          {leftPanelView === "search" ? (
            <WorkspaceSearchPanel projectId={projectId} />
          ) : null}
          {leftPanelView === "git" ? (
            <WorkspaceGitPanel projectId={projectId} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
