import { create } from "zustand";

export type PanelSizes = {
  sidebar: number;
  terminal: number;
  ai: number;
};

export type LeftPanelView = "explorer" | "search" | "git";

export type GitPanelTab = "changes" | "history" | "info";

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export type WorkspacePrefs = {
  sidebarOpen: boolean;
  terminalOpen: boolean;
  aiPanelOpen: boolean;
  panelSizes: PanelSizes;
};

export type TreeClipboard = {
  mode: "cut" | "copy";
  projectId: string;
  path: string;
};

export type EditorTabKind =
  | "welcome"
  | "file"
  | "settings"
  | "shortcuts"
  | "new-project";

export type EditorTab = {
  id: string;
  kind: EditorTabKind;
  title: string;
  path?: string;
};

type WorkspaceState = WorkspacePrefs & {
  settingsOpen: boolean;
  goToFileOpen: boolean;
  gitInitDialogOpen: boolean;
  cloneFromGitHubOpen: boolean;
  branchPickerOpen: boolean;
  leftPanelView: LeftPanelView;
  gitPanelTab: GitPanelTab;
  currentFilePath: string | null;
  editorTabs: EditorTab[];
  activeEditorTabId: string | null;
  editorTabsProjectId: string | null;
  /** Tab shown in the secondary editor pane when split is open. */
  editorSplitTabId: string | null;
  newProjectRequest: number;
  hydrated: boolean;
  breadcrumb: BreadcrumbSegment[];
  treeClipboard: TreeClipboard | null;
  pendingChatAttachPaths: string[] | null;
  requestNewChat: boolean;
  terminalCwdRequest: string | null;

  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleAiPanel: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  openGoToFile: () => void;
  closeGoToFile: () => void;
  openGitInitDialog: () => void;
  closeGitInitDialog: () => void;
  openCloneFromGitHub: () => void;
  closeCloneFromGitHub: () => void;
  openBranchPicker: () => void;
  setBranchPickerOpen: (open: boolean) => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  setGitPanelTab: (tab: GitPanelTab) => void;
  showGitPanel: (tab?: GitPanelTab) => void;
  setCurrentFilePath: (path: string | null) => void;
  syncEditorTabFromRoute: (projectId: string, tab: EditorTab) => void;
  activateEditorTab: (id: string) => void;
  closeEditorTab: (id: string) => EditorTab | null;
  reorderEditorTabs: (fromId: string, toId: string) => void;
  openEditorSplit: (tabId: string) => void;
  closeEditorSplit: () => void;
  resetEditorTabs: (projectId: string) => void;
  requestOpenNewProject: () => void;
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
  setBreadcrumb: (segments: BreadcrumbSegment[]) => void;
  setTreeClipboard: (clipboard: TreeClipboard | null) => void;
  clearTreeClipboard: () => void;
  setPendingChatAttachPaths: (paths: string[] | null) => void;
  requestNewAiChat: () => void;
  clearRequestNewChat: () => void;
  requestTerminalCwd: (cwd: string) => void;
  clearTerminalCwdRequest: () => void;
  hydrate: (prefs: Partial<WorkspacePrefs>) => void;
  getPersistablePrefs: () => WorkspacePrefs;
};

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  sidebar: 18,
  terminal: 28,
  ai: 28,
};

export const DEFAULT_WORKSPACE_PREFS: WorkspacePrefs = {
  sidebarOpen: true,
  terminalOpen: false,
  aiPanelOpen: true,
  panelSizes: DEFAULT_PANEL_SIZES,
};

export const LEFT_PANEL_LABELS: Record<LeftPanelView, string> = {
  explorer: "Explorer",
  search: "Find in Files",
  git: "Git",
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...DEFAULT_WORKSPACE_PREFS,
  settingsOpen: false,
  goToFileOpen: false,
  gitInitDialogOpen: false,
  cloneFromGitHubOpen: false,
  branchPickerOpen: false,
  leftPanelView: "explorer",
  gitPanelTab: "changes",
  currentFilePath: null,
  editorTabs: [],
  activeEditorTabId: null,
  editorTabsProjectId: null,
  editorSplitTabId: null,
  newProjectRequest: 0,
  hydrated: false,
  breadcrumb: [
    { label: "src" },
    { label: "app" },
    { label: "page.tsx" },
  ],
  treeClipboard: null,
  pendingChatAttachPaths: null,
  requestNewChat: false,
  terminalCwdRequest: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openGoToFile: () => set({ goToFileOpen: true }),
  closeGoToFile: () => set({ goToFileOpen: false }),
  openGitInitDialog: () => set({ gitInitDialogOpen: true }),
  closeGitInitDialog: () => set({ gitInitDialogOpen: false }),
  openCloneFromGitHub: () => set({ cloneFromGitHubOpen: true }),
  closeCloneFromGitHub: () => set({ cloneFromGitHubOpen: false }),
  openBranchPicker: () => set({ branchPickerOpen: true }),
  setBranchPickerOpen: (open) => set({ branchPickerOpen: open }),
  setLeftPanelView: (view) =>
    set({ leftPanelView: view, sidebarOpen: true }),
  setGitPanelTab: (tab) => set({ gitPanelTab: tab }),
  showGitPanel: (tab) =>
    set({
      leftPanelView: "git",
      sidebarOpen: true,
      ...(tab ? { gitPanelTab: tab } : {}),
    }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
  syncEditorTabFromRoute: (projectId, tab) =>
    set((s) => {
      const projectChanged = s.editorTabsProjectId !== projectId;
      const tabs = projectChanged ? [] : s.editorTabs;
      const exists = tabs.some((t) => t.id === tab.id);
      return {
        editorTabsProjectId: projectId,
        editorTabs: exists ? tabs : [...tabs, tab],
        activeEditorTabId: tab.id,
        ...(projectChanged ? { editorSplitTabId: null } : {}),
      };
    }),
  activateEditorTab: (id) => set({ activeEditorTabId: id }),
  closeEditorTab: (id) => {
    const { editorTabs, activeEditorTabId, editorSplitTabId } = get();
    const index = editorTabs.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const nextTabs = editorTabs.filter((t) => t.id !== id);
    let nextActive: EditorTab | null = null;

    if (activeEditorTabId === id) {
      nextActive =
        nextTabs[Math.min(index, nextTabs.length - 1)] ?? null;
    } else {
      nextActive =
        nextTabs.find((t) => t.id === activeEditorTabId) ?? null;
    }

    set({
      editorTabs: nextTabs,
      activeEditorTabId: nextActive?.id ?? null,
      editorSplitTabId: editorSplitTabId === id ? null : editorSplitTabId,
    });

    return nextActive;
  },
  reorderEditorTabs: (fromId, toId) =>
    set((s) => {
      if (fromId === toId) return s;
      const fromIndex = s.editorTabs.findIndex((t) => t.id === fromId);
      const toIndex = s.editorTabs.findIndex((t) => t.id === toId);
      if (fromIndex === -1 || toIndex === -1) return s;

      const nextTabs = [...s.editorTabs];
      const [moved] = nextTabs.splice(fromIndex, 1);
      if (!moved) return s;
      nextTabs.splice(toIndex, 0, moved);
      return { editorTabs: nextTabs };
    }),
  openEditorSplit: (tabId) => {
    const exists = get().editorTabs.some((t) => t.id === tabId);
    if (!exists) return;
    set({ editorSplitTabId: tabId });
  },
  closeEditorSplit: () => set({ editorSplitTabId: null }),
  resetEditorTabs: (projectId) =>
    set({
      editorTabs: [],
      activeEditorTabId: null,
      editorTabsProjectId: projectId,
      editorSplitTabId: null,
    }),
  requestOpenNewProject: () =>
    set((s) => ({ newProjectRequest: s.newProjectRequest + 1 })),
  setPanelSizes: (sizes) =>
    set((s) => ({
      panelSizes: { ...s.panelSizes, ...sizes },
    })),
  setBreadcrumb: (segments) => set({ breadcrumb: segments }),
  setTreeClipboard: (clipboard) => set({ treeClipboard: clipboard }),
  clearTreeClipboard: () => set({ treeClipboard: null }),
  setPendingChatAttachPaths: (paths) =>
    set({ pendingChatAttachPaths: paths }),
  requestNewAiChat: () => set({ requestNewChat: true }),
  clearRequestNewChat: () => set({ requestNewChat: false }),
  requestTerminalCwd: (cwd) =>
    set({ terminalCwdRequest: cwd, terminalOpen: true }),
  clearTerminalCwdRequest: () => set({ terminalCwdRequest: null }),
  hydrate: (prefs) =>
    set((s) => ({
      sidebarOpen: prefs.sidebarOpen ?? s.sidebarOpen,
      terminalOpen: prefs.terminalOpen ?? s.terminalOpen,
      aiPanelOpen: prefs.aiPanelOpen ?? s.aiPanelOpen,
      panelSizes: prefs.panelSizes
        ? { ...s.panelSizes, ...prefs.panelSizes }
        : s.panelSizes,
      hydrated: true,
    })),
  getPersistablePrefs: () => {
    const { sidebarOpen, terminalOpen, aiPanelOpen, panelSizes } = get();
    return { sidebarOpen, terminalOpen, aiPanelOpen, panelSizes };
  },
}));
