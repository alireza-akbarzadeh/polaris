"use client";

import type { ReactNode } from "react";

import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type WorkspaceEditorPanelProps = {
  children: ReactNode;
  /** Overrides the tab title; defaults to the last breadcrumb segment */
  title?: string;
};

export function WorkspaceEditorPanel({
  children,
  title,
}: WorkspaceEditorPanelProps) {
  const breadcrumb = useWorkspaceStore((s) => s.breadcrumb);
  const tabTitle = title ?? breadcrumb.at(-1)?.label ?? "Editor";

  return (
    <main className="flex h-full min-h-0 flex-col bg-[#1e1f22]">
      <div className="flex h-7 shrink-0 items-center border-b border-[#2b2d30] bg-[#2b2d30] px-3">
        <p className="truncate text-[11px] font-semibold tracking-wide text-[#dfdfdf]">
          {tabTitle}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </main>
  );
}
