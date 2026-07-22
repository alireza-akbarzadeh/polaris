"use client";

import { useState } from "react";

import { WorkspaceChangeList } from "@/features/workspace/components/workspace-change-list";
import { WorkspaceFileTree } from "@/features/workspace/components/workspace-file-tree";
import { cn } from "@/lib/utils";

type ExplorerTab = "project" | "changes";

type WorkspaceExplorerPanelProps = {
  projectId: string;
};

const EXPLORER_TABS: { id: ExplorerTab; label: string }[] = [
  { id: "project", label: "Project" },
  { id: "changes", label: "Changes" },
];

export function WorkspaceExplorerPanel({ projectId }: WorkspaceExplorerPanelProps) {
  const [activeTab, setActiveTab] = useState<ExplorerTab>("project");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 shrink-0 items-end gap-px border-b border-[#1e1f22] bg-[#2b2d30] px-1">
        {EXPLORER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex h-6 items-center rounded-t-sm px-2.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#1e1f22] text-[#dfdfdf]"
                : "text-[#9a9a9a] hover:text-[#dfdfdf]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "project" ? (
          <WorkspaceFileTree projectId={projectId} />
        ) : (
          <div className="h-full overflow-auto">
            <WorkspaceChangeList
              projectId={projectId}
              emptyMessage="No local changes since last GitHub sync"
            />
          </div>
        )}
      </div>
    </div>
  );
}
