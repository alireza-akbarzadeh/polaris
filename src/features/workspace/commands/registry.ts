import {
  useWorkspaceStore,
  type LeftPanelView,
} from "@/features/workspace/store/workspace-store";

export type CommandId =
  | "toggleSidebar"
  | "toggleTerminal"
  | "toggleAiPanel"
  | "openSettings"
  | "toggleSettings"
  | "closeSettings"
  | "openGoToFile"
  | "closeGoToFile"
  | "openCloneFromGitHub"
  | "showExplorer"
  | "showSearch"
  | "showGit"
  | "findInFiles";

export type Command = {
  id: CommandId;
  /** Chord like "mod+b", "mod+,", "escape" */
  shortcut?: string;
  /** When true, runs even while focus is in an input/textarea/contenteditable */
  allowInInput?: boolean;
  run: () => void;
};

const store = () => useWorkspaceStore.getState();

function showPanel(view: LeftPanelView) {
  const s = store();
  if (s.leftPanelView === view && s.sidebarOpen) {
    s.toggleSidebar();
  } else {
    s.setLeftPanelView(view);
  }
}

export const workspaceCommands: Command[] = [
  {
    id: "toggleSidebar",
    shortcut: "mod+b",
    allowInInput: true,
    run: () => store().toggleSidebar(),
  },
  {
    id: "toggleTerminal",
    shortcut: "mod+j",
    allowInInput: true,
    run: () => store().toggleTerminal(),
  },
  {
    id: "toggleAiPanel",
    shortcut: "mod+l",
    allowInInput: true,
    run: () => store().toggleAiPanel(),
  },
  {
    id: "openSettings",
    shortcut: "mod+,",
    allowInInput: true,
    run: () => store().openSettings(),
  },
  {
    id: "toggleSettings",
    allowInInput: true,
    run: () => store().toggleSettings(),
  },
  {
    id: "closeSettings",
    shortcut: "escape",
    allowInInput: true,
    run: () => {
      const s = store();
      if (s.settingsOpen) s.closeSettings();
      else if (s.goToFileOpen) s.closeGoToFile();
      else if (s.cloneFromGitHubOpen) s.closeCloneFromGitHub();
    },
  },
  {
    id: "openGoToFile",
    shortcut: "mod+p",
    allowInInput: true,
    run: () => store().openGoToFile(),
  },
  {
    id: "closeGoToFile",
    allowInInput: true,
    run: () => store().closeGoToFile(),
  },
  {
    id: "openCloneFromGitHub",
    shortcut: "mod+i",
    allowInInput: true,
    run: () => store().openCloneFromGitHub(),
  },
  {
    id: "showExplorer",
    shortcut: "mod+1",
    allowInInput: true,
    run: () => showPanel("explorer"),
  },
  {
    id: "showSearch",
    shortcut: "mod+shift+f",
    allowInInput: true,
    run: () => showPanel("search"),
  },
  {
    id: "showGit",
    shortcut: "mod+9",
    allowInInput: true,
    run: () => showPanel("git"),
  },
  {
    id: "findInFiles",
    shortcut: "mod+shift+f",
    allowInInput: true,
    run: () => showPanel("search"),
  },
];

const commandsById = Object.fromEntries(
  workspaceCommands.map((c) => [c.id, c]),
) as Record<CommandId, Command>;

export function runCommand(id: CommandId) {
  commandsById[id]?.run();
}

function normalizeEventChord(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("mod");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  const key = event.key.toLowerCase();
  if (key === "control" || key === "meta" || key === "alt" || key === "shift") {
    return parts.join("+");
  }
  parts.push(key === "," ? "," : key);
  return parts.join("+");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function matchShortcut(event: KeyboardEvent): Command | undefined {
  const chord = normalizeEventChord(event);
  return workspaceCommands.find((c) => c.shortcut === chord);
}

export function handleWorkspaceKeydown(event: KeyboardEvent): boolean {
  const command = matchShortcut(event);
  if (!command) return false;

  if (isEditableTarget(event.target) && !command.allowInInput) {
    return false;
  }

  if (command.id === "closeSettings") {
    const s = store();
    if (!s.settingsOpen && !s.goToFileOpen && !s.cloneFromGitHubOpen) {
      return false;
    }
  }

  event.preventDefault();
  command.run();
  return true;
}
