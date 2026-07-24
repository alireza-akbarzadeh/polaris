"use client";

import {
  FolderPlusIcon,
  FolderTreeIcon,
  GitBranchIcon,
  KeyboardIcon,
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
  SearchIcon,
  Settings2Icon,
  SettingsIcon,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";

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
import { PrettierIcon } from "@/features/workspace/components/prettier-icon";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

export function WorkspaceSettingsDialog() {
  const params = useParams<{ projectId?: string }>();
  const projectId = params.projectId;
  const { openTab } = useEditorTabs(projectId ?? "");
  const settingsOpen = useWorkspaceStore((s) => s.settingsOpen);
  const closeSettings = useWorkspaceStore((s) => s.closeSettings);
  const openCloneFromGitHub = useWorkspaceStore((s) => s.openCloneFromGitHub);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const aiPanelOpen = useWorkspaceStore((s) => s.aiPanelOpen);
  const panelSizes = useWorkspaceStore((s) => s.panelSizes);

  const onOpenChange = (open: boolean) => {
    if (!open) closeSettings();
  };

  const openEditorPage = (
    kind: "settings" | "shortcuts" | "new-project",
  ) => {
    closeSettings();
    if (!projectId) return;
    openTab({ kind });
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

        <CommandGroup heading="Preferences">
          <CommandItem
            value="advanced editor settings preferences shortcuts formatter prettier format"
            onSelect={() => openEditorPage("settings")}
          >
            <Settings2Icon />
            <span>Advanced Settings</span>
          </CommandItem>
          <CommandItem
            value="keyboard shortcuts keymap format document formatter prettier"
            onSelect={() => openEditorPage("shortcuts")}
          >
            <KeyboardIcon />
            <span>Keyboard Shortcuts</span>
          </CommandItem>
          <CommandItem
            value="format document formatter prettier code style beautify"
            onSelect={() => {
              runCommand("formatDocument");
              closeSettings();
            }}
          >
            <PrettierIcon className="size-4" />
            <span>Format Document</span>
            <CommandShortcut>⇧⌥F</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new project create workspace"
            onSelect={() => openEditorPage("new-project")}
          >
            <FolderPlusIcon />
            <span>New Project</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="GitHub">
          <CommandItem
            value="clone from github import repository"
            onSelect={() => {
              closeSettings();
              openCloneFromGitHub();
            }}
          >
            <Image
              src="/images/github.png"
              alt=""
              width={16}
              height={16}
              className="size-4 dark:invert"
            />
            <span>Clone from GitHub</span>
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="show git panel source control"
            onSelect={() => {
              runCommand("showGit");
              closeSettings();
            }}
          >
            <GitBranchIcon />
            <span>Show Git</span>
            <CommandShortcut>⌘9</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

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

        <CommandGroup heading="Navigation">
          <CommandItem
            value="go to file"
            onSelect={() => {
              runCommand("openGoToFile");
              closeSettings();
            }}
          >
            <FolderTreeIcon />
            <span>Go to File</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="find in files search"
            onSelect={() => {
              runCommand("showSearch");
              closeSettings();
            }}
          >
            <SearchIcon />
            <span>Find in Files</span>
            <CommandShortcut>⌘⇧F</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="show project explorer"
            onSelect={() => {
              runCommand("showExplorer");
              closeSettings();
            }}
          >
            <FolderTreeIcon />
            <span>Show Project</span>
            <CommandShortcut>⌘1</CommandShortcut>
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
