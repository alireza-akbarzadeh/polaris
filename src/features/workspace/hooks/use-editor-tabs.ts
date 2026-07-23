"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import {
  createEditorTab,
  editorTabFromPathname,
  editorTabHref,
  type EditorTabInput,
} from "@/features/workspace/lib/editor-tabs";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

/** Keeps open editor tabs in sync with the current workspace URL. */
export function useEditorTabsSync(projectId: string) {
  const pathname = usePathname();
  const syncEditorTabFromRoute = useWorkspaceStore(
    (s) => s.syncEditorTabFromRoute,
  );

  useEffect(() => {
    const tab = editorTabFromPathname(projectId, pathname);
    if (!tab) return;
    syncEditorTabFromRoute(projectId, tab);
  }, [projectId, pathname, syncEditorTabFromRoute]);
}

/** Open / select / close VS Code-style editor tabs inside a project. */
export function useEditorTabs(projectId: string) {
  const router = useRouter();
  const editorTabs = useWorkspaceStore((s) => s.editorTabs);
  const activeEditorTabId = useWorkspaceStore((s) => s.activeEditorTabId);
  const editorSplitTabId = useWorkspaceStore((s) => s.editorSplitTabId);
  const activateEditorTab = useWorkspaceStore((s) => s.activateEditorTab);
  const closeEditorTab = useWorkspaceStore((s) => s.closeEditorTab);
  const reorderEditorTabs = useWorkspaceStore((s) => s.reorderEditorTabs);
  const openEditorSplit = useWorkspaceStore((s) => s.openEditorSplit);
  const closeEditorSplit = useWorkspaceStore((s) => s.closeEditorSplit);
  const syncEditorTabFromRoute = useWorkspaceStore(
    (s) => s.syncEditorTabFromRoute,
  );

  const openTab = useCallback(
    (input: EditorTabInput) => {
      const tab = createEditorTab(input);
      syncEditorTabFromRoute(projectId, tab);
      router.push(editorTabHref(projectId, tab));
    },
    [projectId, router, syncEditorTabFromRoute],
  );

  const selectTab = useCallback(
    (id: string) => {
      const tab = editorTabs.find((t) => t.id === id);
      if (!tab) return;
      activateEditorTab(id);
      router.push(editorTabHref(projectId, tab));
    },
    [activateEditorTab, editorTabs, projectId, router],
  );

  const closeTab = useCallback(
    (id: string) => {
      const wasActive = activeEditorTabId === id;
      const nextActive = closeEditorTab(id);

      if (!wasActive) return;

      if (nextActive) {
        router.push(editorTabHref(projectId, nextActive));
        return;
      }

      const welcome = createEditorTab({ kind: "welcome" });
      syncEditorTabFromRoute(projectId, welcome);
      router.push(editorTabHref(projectId, welcome));
    },
    [
      activeEditorTabId,
      closeEditorTab,
      projectId,
      router,
      syncEditorTabFromRoute,
    ],
  );

  const reorderTab = useCallback(
    (fromId: string, toId: string) => {
      reorderEditorTabs(fromId, toId);
    },
    [reorderEditorTabs],
  );

  const splitTab = useCallback(
    (id: string) => {
      openEditorSplit(id);
    },
    [openEditorSplit],
  );

  return {
    tabs: editorTabs,
    activeTabId: activeEditorTabId,
    splitTabId: editorSplitTabId,
    openTab,
    selectTab,
    closeTab,
    reorderTab,
    splitTab,
    closeSplit: closeEditorSplit,
  };
}

/** Handles ⌘N / Ctrl+N → open New Project editor tab. */
export function useNewProjectTabShortcut(projectId: string) {
  const request = useWorkspaceStore((s) => s.newProjectRequest);
  const { openTab } = useEditorTabs(projectId);
  const lastHandled = useRef(0);

  useEffect(() => {
    if (request === 0 || request === lastHandled.current) return;
    lastHandled.current = request;
    openTab({ kind: "new-project" });
  }, [request, openTab]);
}
