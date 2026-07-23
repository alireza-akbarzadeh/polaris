"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";

const SAVE_DEBOUNCE_MS = 400;

/** Hydrate editor settings from Convex and debounce-save changes. */
export function useEditorSettingsSync() {
  const { isAuthenticated } = useConvexAuth();
  const prefs = useQuery(
    api.userPreferences.get,
    isAuthenticated ? {} : "skip",
  );
  const upsertEditor = useMutation(api.userPreferences.upsertEditor);
  const hydrate = useEditorSettingsStore((s) => s.hydrate);
  const hydrated = useEditorSettingsStore((s) => s.hydrated);

  const fontSize = useEditorSettingsStore((s) => s.fontSize);
  const tabSize = useEditorSettingsStore((s) => s.tabSize);
  const wordWrap = useEditorSettingsStore((s) => s.wordWrap);
  const lineNumbers = useEditorSettingsStore((s) => s.lineNumbers);
  const highlightActiveLine = useEditorSettingsStore((s) => s.highlightActiveLine);
  const bracketMatching = useEditorSettingsStore((s) => s.bracketMatching);
  const lineHeight = useEditorSettingsStore((s) => s.lineHeight);

  const hasHydratedFromServer = useRef(false);
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefs === undefined || hasHydratedFromServer.current) return;

    // Another mount (e.g. settings → workspace) already loaded prefs into the store.
    if (useEditorSettingsStore.getState().hydrated) {
      hasHydratedFromServer.current = true;
      skipNextSave.current = true;
      return;
    }

    hydrate(prefs?.editor ?? null);
    hasHydratedFromServer.current = true;
    skipNextSave.current = true;
  }, [prefs, hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void upsertEditor({
        editor: {
          fontSize,
          tabSize,
          wordWrap,
          lineNumbers,
          highlightActiveLine,
          bracketMatching,
          lineHeight,
        },
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    hydrated,
    fontSize,
    tabSize,
    wordWrap,
    lineNumbers,
    highlightActiveLine,
    bracketMatching,
    lineHeight,
    upsertEditor,
  ]);
}
