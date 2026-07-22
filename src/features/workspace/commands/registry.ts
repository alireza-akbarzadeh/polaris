import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

export type CommandId =
  | "toggleSidebar"
  | "toggleTerminal"
  | "toggleAiPanel"
  | "openSettings"
  | "toggleSettings"
  | "closeSettings";

export type Command = {
  id: CommandId;
  /** Chord like "mod+b", "mod+,", "escape" */
  shortcut?: string;
  /** When true, runs even while focus is in an input/textarea/contenteditable */
  allowInInput?: boolean;
  run: () => void;
};

const store = () => useWorkspaceStore.getState();

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
      if (store().settingsOpen) store().closeSettings();
    },
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

  if (command.id === "closeSettings" && !store().settingsOpen) {
    return false;
  }

  event.preventDefault();
  command.run();
  return true;
}
