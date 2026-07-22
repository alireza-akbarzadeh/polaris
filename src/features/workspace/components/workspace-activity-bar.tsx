"use client";

import {
  FolderTreeIcon,
  GitBranchIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SquareTerminalIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { runCommand } from "@/features/workspace/commands/registry";
import {
  useWorkspaceStore,
  type LeftPanelView,
} from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type ActivityItem = {
  view: LeftPanelView;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
};

type UtilityItem = {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    view: "explorer",
    label: "Explorer",
    icon: <FolderTreeIcon className="size-4" strokeWidth={1.75} />,
    shortcut: "⌘1",
  },
  {
    view: "search",
    label: "Find in Files",
    icon: <SearchIcon className="size-4" strokeWidth={1.75} />,
    shortcut: "⌘⇧F",
  },
  {
    view: "git",
    label: "Git",
    icon: <GitBranchIcon className="size-4" strokeWidth={1.75} />,
    shortcut: "⌘9",
  },
];

const buttonClassName =
  "relative size-7 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text";

const activeClassName =
  "bg-ws-hover text-ws-text before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-sm before:bg-ws-accent";

function ActivityBarButton({
  label,
  shortcut,
  icon,
  active,
  onClick,
}: {
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(buttonClassName, active && activeClassName)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={6}
        className="flex items-center gap-2 border border-ws-border-strong bg-ws-hover px-2 py-1 text-ws-text [&_svg]:hidden"
      >
        <span className="text-xs">{label}</span>
        {shortcut ? (
          <span className="text-[10px] text-ws-text-muted">{shortcut}</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceActivityBar() {
  const leftPanelView = useWorkspaceStore((s) => s.leftPanelView);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const settingsOpen = useWorkspaceStore((s) => s.settingsOpen);
  const setLeftPanelView = useWorkspaceStore((s) => s.setLeftPanelView);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";

  const onSelect = (view: LeftPanelView) => {
    if (leftPanelView === view && sidebarOpen) {
      runCommand("toggleSidebar");
    } else {
      setLeftPanelView(view);
    }
  };

  const utilityItems: UtilityItem[] = [
    {
      id: "terminal",
      label: "Terminal",
      shortcut: "⌘J",
      icon: <SquareTerminalIcon className="size-4" strokeWidth={1.75} />,
      active: terminalOpen,
      onClick: () => runCommand("toggleTerminal"),
    },
    {
      id: "theme",
      label: isDark ? "Switch to Light Theme" : "Switch to Dark Theme",
      icon: isDark ? (
        <SunIcon className="size-4" strokeWidth={1.75} />
      ) : (
        <MoonIcon className="size-4" strokeWidth={1.75} />
      ),
      onClick: () => setTheme(isDark ? "light" : "dark"),
    },
    {
      id: "settings",
      label: "Settings",
      shortcut: "⌘,",
      icon: <SettingsIcon className="size-4" strokeWidth={1.75} />,
      active: settingsOpen,
      onClick: () => runCommand("openSettings"),
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Tool windows"
        className="flex h-full w-9 shrink-0 flex-col items-center justify-between border-r border-ws-border-subtle bg-ws-panel py-1.5"
      >
        <div className="flex flex-col items-center gap-0.5">
          {ACTIVITY_ITEMS.map((item) => {
            const active = sidebarOpen && leftPanelView === item.view;
            return (
              <ActivityBarButton
                key={item.view}
                label={item.label}
                shortcut={item.shortcut}
                icon={item.icon}
                active={active}
                onClick={() => onSelect(item.view)}
              />
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {utilityItems.map((item) => (
            <ActivityBarButton
              key={item.id}
              label={item.label}
              shortcut={item.shortcut}
              icon={item.icon}
              active={item.active}
              onClick={item.onClick}
            />
          ))}
        </div>
      </nav>
    </TooltipProvider>
  );
}
