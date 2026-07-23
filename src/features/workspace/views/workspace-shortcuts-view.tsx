"use client";

import { Manrope } from "next/font/google";

import { ShortcutsPanel } from "@/features/settings/components/shortcuts-panel";
import { useWorkspaceBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SHORTCUTS_BREADCRUMB = [{ label: "Shortcuts" }] as const;

/** Keyboard shortcuts opened as an editor tab inside the workspace shell. */
export function WorkspaceShortcutsView() {
  useWorkspaceBreadcrumb([...SHORTCUTS_BREADCRUMB]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-8">
      <header className="mb-6">
        <h1
          className={cn(
            display.className,
            "text-lg font-semibold tracking-tight text-ws-text",
          )}
        >
          Shortcuts
        </h1>
        <p className="mt-1 text-[12px] text-ws-text-muted">
          Keyboard shortcuts available in the workspace
        </p>
      </header>
      <ShortcutsPanel />
    </div>
  );
}
