"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import {
  usePanelRef,
  type Layout,
  type PanelImperativeHandle,
} from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { WorkspaceAiSidebar } from "@/features/workspace/components/workspace-ai-sidebar";
import { WorkspaceEditorPanel } from "@/features/workspace/components/workspace-editor-panel";
import { WorkspaceGoToFileDialog } from "@/features/workspace/components/workspace-go-to-file-dialog";
import { InitializeGitRepositoryDialog } from "@/features/workspace/components/initialize-git-repository-dialog";
import { WorkspaceSettingsDialog } from "@/features/workspace/components/workspace-settings-dialog";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceStatusBar } from "@/features/workspace/components/workspace-status-bar";
import { WorkspaceTerminal } from "@/features/workspace/components/workspace-terminal";
import { WorkspaceToolbar } from "@/features/workspace/components/workspace-toolbar";
import { CloneFromGitHubDialog } from "@/features/github/components/clone-from-github-dialog";
import { useEditorSettingsSync } from "@/features/settings/hooks/use-editor-settings-sync";
import { useEditorTabsSync, useNewProjectTabShortcut } from "@/features/workspace/hooks/use-editor-tabs";
import { useWorkspacePrefsSync } from "@/features/workspace/hooks/use-workspace-prefs-sync";
import { useWorkspaceShortcuts } from "@/features/workspace/hooks/use-workspace-shortcuts";
import {
  useWorkspaceStore,
  type PanelSizes,
} from "@/features/workspace/store/workspace-store";

type WorkspaceLayoutProps = {
  projectId: string;
  projectName?: string;
  children: ReactNode;
};

export function WorkspaceLayout({
  projectId,
  projectName,
  children,
}: WorkspaceLayoutProps) {
  useWorkspaceShortcuts();
  useWorkspacePrefsSync();
  useEditorSettingsSync();
  useEditorTabsSync(projectId);
  useNewProjectTabShortcut(projectId);

  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const aiPanelOpen = useWorkspaceStore((s) => s.aiPanelOpen);
  const panelSizes = useWorkspaceStore((s) => s.panelSizes);
  const setPanelSizes = useWorkspaceStore((s) => s.setPanelSizes);
  const cloneFromGitHubOpen = useWorkspaceStore((s) => s.cloneFromGitHubOpen);
  const closeCloneFromGitHub = useWorkspaceStore((s) => s.closeCloneFromGitHub);

  const sidebarPanelRef = usePanelRef();
  const terminalPanelRef = usePanelRef();
  const aiPanelRef = usePanelRef();
  const isApplyingLayoutRef = useRef(false);

  useCollapsiblePanelSync({
    open: sidebarOpen,
    panelRef: sidebarPanelRef,
    sizeKey: "sidebar",
    isApplyingLayoutRef,
  });
  useCollapsiblePanelSync({
    open: terminalOpen,
    panelRef: terminalPanelRef,
    sizeKey: "terminal",
    isApplyingLayoutRef,
  });
  useCollapsiblePanelSync({
    open: aiPanelOpen,
    panelRef: aiPanelRef,
    sizeKey: "ai",
    isApplyingLayoutRef,
  });

  const onHorizontalLayoutChanged = (layout: Layout) => {
    if (isApplyingLayoutRef.current) return;

    const state = useWorkspaceStore.getState();
    const next: Partial<PanelSizes> = {};

    if (
      state.sidebarOpen &&
      typeof layout.sidebar === "number" &&
      layout.sidebar > 0
    ) {
      next.sidebar = layout.sidebar;
    }
    if (state.aiPanelOpen && typeof layout.ai === "number" && layout.ai > 0) {
      next.ai = layout.ai;
    }
    if (Object.keys(next).length > 0) setPanelSizes(next);
  };

  const onVerticalLayoutChanged = (layout: Layout) => {
    if (isApplyingLayoutRef.current) return;

    const state = useWorkspaceStore.getState();
    const terminal = layout.terminal;
    if (
      state.terminalOpen &&
      typeof terminal === "number" &&
      terminal > 0
    ) {
      setPanelSizes({ terminal });
    }
  };

  const sidebarDefault = sidebarOpen ? panelSizes.sidebar : 0;
  const aiDefault = aiPanelOpen ? panelSizes.ai : 0;
  const terminalDefault = terminalOpen ? panelSizes.terminal : 0;
  const editorDefault = Math.max(30, 100 - sidebarDefault - aiDefault);

  return (
    <div className="flex h-dvh w-full flex-col bg-ws-bg text-ws-text-secondary">
      <WorkspaceToolbar projectId={projectId} projectName={projectName} />

      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        defaultLayout={{
          sidebar: sidebarDefault,
          editor: editorDefault,
          ai: aiDefault,
        }}
        onLayoutChanged={onHorizontalLayoutChanged}
      >
        <ResizablePanel
          id="sidebar"
          panelRef={sidebarPanelRef}
          collapsible
          collapsedSize={0}
          minSize="12%"
          defaultSize={`${sidebarDefault}`}
          className="bg-ws-panel"
        >
          <aside className="flex h-full flex-col border-r border-ws-border-subtle">
            <WorkspaceSidebar projectId={projectId} />
          </aside>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-ws-border-subtle after:hidden hover:bg-ws-accent" />

        <ResizablePanel id="editor" minSize="30%" className="min-w-0">
          <ResizablePanelGroup
            orientation="vertical"
            className="h-full"
            defaultLayout={{
              main: 100 - terminalDefault,
              terminal: terminalDefault,
            }}
            onLayoutChanged={onVerticalLayoutChanged}
          >
            <ResizablePanel id="main" minSize="20%" className="min-h-0 bg-ws-bg">
              <WorkspaceEditorPanel projectId={projectId}>
                {children}
              </WorkspaceEditorPanel>
            </ResizablePanel>

            <ResizableHandle className="h-px bg-ws-border-subtle after:hidden hover:bg-ws-accent" />

            <ResizablePanel
              id="terminal"
              panelRef={terminalPanelRef}
              collapsible
              collapsedSize={0}
              minSize="15%"
              defaultSize={`${terminalDefault}`}
              className="bg-ws-panel"
            >
              <WorkspaceTerminal projectId={projectId} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-ws-border-subtle after:hidden hover:bg-ws-accent" />

        <ResizablePanel
          id="ai"
          panelRef={aiPanelRef}
          collapsible
          collapsedSize={0}
          minSize="18%"
          defaultSize={`${aiDefault}`}
          className="bg-ws-panel"
        >
          <WorkspaceAiSidebar
            projectId={projectId}
            projectName={projectName}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <WorkspaceSettingsDialog />
      <WorkspaceGoToFileDialog projectId={projectId} />
      <InitializeGitRepositoryDialog projectId={projectId} />
      <CloneFromGitHubDialog
        open={cloneFromGitHubOpen}
        onOpenChange={(open) => {
          if (!open) closeCloneFromGitHub();
        }}
      />
      <WorkspaceStatusBar projectId={projectId} />
    </div>
  );
}

type CollapsiblePanelSyncOptions = {
  open: boolean;
  panelRef: RefObject<PanelImperativeHandle | null>;
  sizeKey: keyof PanelSizes;
  isApplyingLayoutRef: RefObject<boolean>;
};

function useCollapsiblePanelSync({
  open,
  panelRef,
  sizeKey,
  isApplyingLayoutRef,
}: CollapsiblePanelSyncOptions) {
  useLayoutEffect(() => {
    let cancelled = false;
    let frameId = 0;

    const finishApplying = () => {
      frameId = requestAnimationFrame(() => {
        if (!cancelled) isApplyingLayoutRef.current = false;
      });
    };

    const apply = () => {
      if (cancelled) return;

      const panel = panelRef.current;
      if (!panel) {
        frameId = requestAnimationFrame(apply);
        return;
      }

      isApplyingLayoutRef.current = true;
      const { panelSizes, setPanelSizes } = useWorkspaceStore.getState();

      try {
        if (open) {
          if (panel.isCollapsed()) {
            panel.expand();
          }
          panel.resize(`${panelSizes[sizeKey]}`);
        } else if (!panel.isCollapsed()) {
          const { asPercentage } = panel.getSize();
          if (asPercentage > 0) {
            setPanelSizes({ [sizeKey]: asPercentage });
          }
          panel.collapse();
        }
      } finally {
        finishApplying();
      }
    };

    apply();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [open, panelRef, sizeKey, isApplyingLayoutRef]);
}
