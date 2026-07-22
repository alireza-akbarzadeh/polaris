"use client";

import { useEffect } from "react";

import { handleWorkspaceKeydown } from "@/features/workspace/commands/registry";

/** Single window-level listener for IDE workspace shortcuts. */
export function useWorkspaceShortcuts(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      handleWorkspaceKeydown(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
