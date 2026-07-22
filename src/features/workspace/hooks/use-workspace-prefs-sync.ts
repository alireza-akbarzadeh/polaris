"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  DEFAULT_PANEL_SIZES,
  useWorkspaceStore,
  type WorkspacePrefs,
} from "@/features/workspace/store/workspace-store";

const SAVE_DEBOUNCE_MS = 400;

/** Hydrate workspace store from Convex and debounce-save preference changes. */
export function useWorkspacePrefsSync() {
  const prefs = useQuery(api.userPreferences.get);
  const upsert = useMutation(api.userPreferences.upsert);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const hydrated = useWorkspaceStore((s) => s.hydrated);

  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const aiPanelOpen = useWorkspaceStore((s) => s.aiPanelOpen);
  const panelSizes = useWorkspaceStore((s) => s.panelSizes);

  const hasHydratedFromServer = useRef(false);
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefs === undefined || hasHydratedFromServer.current) return;

    if (prefs === null) {
      hydrate({});
      hasHydratedFromServer.current = true;
      return;
    }

    const next: WorkspacePrefs = {
      sidebarOpen: prefs.sidebarOpen,
      terminalOpen: prefs.terminalOpen,
      aiPanelOpen: prefs.aiPanelOpen ?? true,
      panelSizes: {
        sidebar: prefs.panelSizes.sidebar,
        terminal: prefs.panelSizes.terminal,
        ai: prefs.panelSizes.ai ?? DEFAULT_PANEL_SIZES.ai,
      },
    };
    skipNextSave.current = true;
    hydrate(next);
    hasHydratedFromServer.current = true;
  }, [prefs, hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void upsert({
        sidebarOpen,
        terminalOpen,
        aiPanelOpen,
        panelSizes,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, sidebarOpen, terminalOpen, aiPanelOpen, panelSizes, upsert]);
}
