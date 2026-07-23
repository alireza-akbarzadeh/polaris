import { create } from "zustand";

import {
  clampEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  type EditorSettings,
} from "@/features/settings/lib/editor-settings";

type EditorSettingsState = EditorSettings & {
  hydrated: boolean;
  setSettings: (partial: Partial<EditorSettings>) => void;
  resetSettings: () => void;
  hydrate: (prefs: Partial<EditorSettings> | null | undefined) => void;
  getPersistable: () => EditorSettings;
};

export const useEditorSettingsStore = create<EditorSettingsState>((set, get) => ({
  ...DEFAULT_EDITOR_SETTINGS,
  hydrated: false,

  setSettings: (partial) =>
    set((s) => clampEditorSettings({ ...s, ...partial })),

  resetSettings: () => set({ ...DEFAULT_EDITOR_SETTINGS }),

  hydrate: (prefs) =>
    set({
      ...clampEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, ...prefs }),
      hydrated: true,
    }),

  getPersistable: () => {
    const {
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers,
      highlightActiveLine,
      bracketMatching,
      lineHeight,
    } = get();
    return {
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers,
      highlightActiveLine,
      bracketMatching,
      lineHeight,
    };
  },
}));
