export type ShortcutEntry = {
  id: string;
  label: string;
  keys: string;
  description?: string;
};

export type ShortcutGroup = {
  id: string;
  title: string;
  shortcuts: ShortcutEntry[];
};

/** Display chords use ⌘ for Mod (macOS-first, matching the rest of the workspace UI). */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "workspace",
    title: "Workspace",
    shortcuts: [
      { id: "settings", label: "Open command settings", keys: "⌘ ," },
      { id: "sidebar", label: "Toggle project sidebar", keys: "⌘ B" },
      { id: "terminal", label: "Toggle terminal", keys: "⌘ J" },
      { id: "ai", label: "Toggle AI panel", keys: "⌘ L" },
      { id: "goto", label: "Go to file", keys: "⌘ P" },
      { id: "clone", label: "Clone from GitHub", keys: "⌘ I" },
      { id: "explorer", label: "Show explorer", keys: "⌘ 1" },
      { id: "search", label: "Find in files", keys: "⌘ ⇧ F" },
      { id: "git", label: "Show Git panel", keys: "⌘ 9" },
      { id: "git-changes", label: "Git changes", keys: "⌘ ⇧ G" },
      { id: "git-history", label: "Git history", keys: "⌘ ⇧ H" },
      { id: "escape", label: "Close dialogs", keys: "Esc" },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    shortcuts: [
      { id: "command", label: "Open command palette", keys: "⌘ K" },
      { id: "new", label: "New project", keys: "⌘ N", description: "Opens as an editor tab" },
    ],
  },
  {
    id: "editor",
    title: "Editor",
    shortcuts: [
      { id: "find", label: "Find", keys: "⌘ F" },
      { id: "replace", label: "Replace", keys: "⌘ H" },
      { id: "undo", label: "Undo", keys: "⌘ Z" },
      { id: "redo", label: "Redo", keys: "⌘ ⇧ Z" },
      { id: "select-all", label: "Select all", keys: "⌘ A" },
      { id: "indent", label: "Indent", keys: "Tab" },
      { id: "outdent", label: "Outdent", keys: "⇧ Tab" },
      { id: "fold", label: "Fold code", keys: "⌘ ⌥ [" },
      { id: "unfold", label: "Unfold code", keys: "⌘ ⌥ ]" },
      { id: "comment", label: "Toggle comment", keys: "⌘ /" },
      {
        id: "format",
        label: "Format document",
        keys: "⇧ ⌥ F",
        description: "Prettier formatter (also ⌘ ⇧ I)",
      },
      {
        id: "ai-accept",
        label: "Accept AI suggestion",
        keys: "Tab",
        description: "When ghost text is visible",
      },
    ],
  },
  {
    id: "file-tree",
    title: "File tree",
    shortcuts: [
      { id: "rename", label: "Rename", keys: "F2" },
      { id: "delete", label: "Delete", keys: "Delete" },
      { id: "cut", label: "Cut", keys: "⌘ X" },
      { id: "copy", label: "Copy", keys: "⌘ C" },
      { id: "paste", label: "Paste", keys: "⌘ V" },
      { id: "nav", label: "Navigate", keys: "↑ ↓ ← →" },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    shortcuts: [
      { id: "complete", label: "Autocomplete", keys: "Tab" },
      { id: "history-up", label: "Previous command", keys: "↑" },
      { id: "history-down", label: "Next command", keys: "↓" },
      { id: "clear", label: "Clear screen", keys: "⌃ L" },
      { id: "kill-line", label: "Clear line", keys: "⌃ U" },
      { id: "kill-word", label: "Delete word", keys: "⌃ W" },
    ],
  },
  {
    id: "ai-chat",
    title: "AI chat",
    shortcuts: [
      { id: "new-chat", label: "New chat", keys: "⌃ N" },
    ],
  },
];
