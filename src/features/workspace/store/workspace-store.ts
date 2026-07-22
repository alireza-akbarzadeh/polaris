import { create } from "zustand";

export type PanelSizes = {
  sidebar: number;
  terminal: number;
  ai: number;
};

export type LeftPanelView = "explorer" | "search" | "git";

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

type WorkspaceState = WorkspacePrefs & {
  settingsOpen: boolean;
  goToFileOpen: boolean;
  gitInitDialogOpen: boolean;
  leftPanelView: LeftPanelView;
  currentFilePath: string | null;
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
  setLeftPanelView: (view: LeftPanelView) => void;
  setCurrentFilePath: (path: string | null) => void;
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
  leftPanelView: "explorer",
  currentFilePath: null,
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
  setLeftPanelView: (view) =>
    set({ leftPanelView: view, sidebarOpen: true }),
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
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
