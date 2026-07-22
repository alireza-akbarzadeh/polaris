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

type WorkspaceState = WorkspacePrefs & {
  settingsOpen: boolean;
  goToFileOpen: boolean;
  leftPanelView: LeftPanelView;
  hydrated: boolean;
  breadcrumb: BreadcrumbSegment[];

  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleAiPanel: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  openGoToFile: () => void;
  closeGoToFile: () => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
  setBreadcrumb: (segments: BreadcrumbSegment[]) => void;
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
  explorer: "Project",
  search: "Find in Files",
  git: "Git",
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...DEFAULT_WORKSPACE_PREFS,
  settingsOpen: false,
  goToFileOpen: false,
  leftPanelView: "explorer",
  hydrated: false,
  breadcrumb: [
    { label: "src" },
    { label: "app" },
    { label: "page.tsx" },
  ],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openGoToFile: () => set({ goToFileOpen: true }),
  closeGoToFile: () => set({ goToFileOpen: false }),
  setLeftPanelView: (view) =>
    set({ leftPanelView: view, sidebarOpen: true }),
  setPanelSizes: (sizes) =>
    set((s) => ({
      panelSizes: { ...s.panelSizes, ...sizes },
    })),
  setBreadcrumb: (segments) => set({ breadcrumb: segments }),
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
