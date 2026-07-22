"use client";

import {
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
  SettingsIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { runCommand } from "@/features/workspace/commands/registry";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

export function WorkspaceSettingsDialog() {
  const settingsOpen = useWorkspaceStore((s) => s.settingsOpen);
  const closeSettings = useWorkspaceStore((s) => s.closeSettings);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const aiPanelOpen = useWorkspaceStore((s) => s.aiPanelOpen);
  const panelSizes = useWorkspaceStore((s) => s.panelSizes);

  const onOpenChange = (open: boolean) => {
    if (!open) closeSettings();
  };

  return (
    <CommandDialog
      open={settingsOpen}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Search workspace settings and actions"
      showCloseButton={false}
      className="top-[18%] translate-y-0 sm:max-w-lg"
    >
      <CommandInput placeholder="Search settings…" />
      <CommandList className="max-h-[min(56vh,420px)]">
        <CommandEmpty>No settings found.</CommandEmpty>

        <CommandGroup heading="Layout">
          <CommandItem
            value="toggle project sidebar"
            onSelect={() => {
              runCommand("toggleSidebar");
              closeSettings();
            }}
          >
            <PanelLeftIcon />
            <span>{sidebarOpen ? "Hide Project" : "Show Project"}</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle terminal"
            onSelect={() => {
              runCommand("toggleTerminal");
              closeSettings();
            }}
          >
            <PanelBottomIcon />
            <span>{terminalOpen ? "Hide Terminal" : "Show Terminal"}</span>
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="toggle ai panel chat"
            onSelect={() => {
              runCommand("toggleAiPanel");
              closeSettings();
            }}
          >
            <PanelRightIcon />
            <span>{aiPanelOpen ? "Hide AI" : "Show AI"}</span>
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Status">
          <CommandItem value="sidebar width status" disabled>
            <SettingsIcon />
            <span>Sidebar width</span>
            <CommandShortcut>{Math.round(panelSizes.sidebar)}%</CommandShortcut>
          </CommandItem>
          <CommandItem value="terminal height status" disabled>
            <SettingsIcon />
            <span>Terminal height</span>
            <CommandShortcut>
              {Math.round(panelSizes.terminal)}%
            </CommandShortcut>
          </CommandItem>
          <CommandItem value="ai panel width status" disabled>
            <SettingsIcon />
            <span>AI width</span>
            <CommandShortcut>{Math.round(panelSizes.ai)}%</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
