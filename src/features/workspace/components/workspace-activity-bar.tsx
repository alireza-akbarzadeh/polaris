"use client";

import {
  FolderTreeIcon,
  GitBranchIcon,
  SearchIcon,
} from "lucide-react";

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

export function WorkspaceActivityBar() {
  const leftPanelView = useWorkspaceStore((s) => s.leftPanelView);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const setLeftPanelView = useWorkspaceStore((s) => s.setLeftPanelView);

  const onSelect = (view: LeftPanelView) => {
    if (leftPanelView === view && sidebarOpen) {
      runCommand("toggleSidebar");
    } else {
      setLeftPanelView(view);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Tool windows"
        className="flex w-9 shrink-0 flex-col items-center gap-0.5 border-r border-[#1e1f22] bg-[#2b2d30] py-1.5"
      >
        {ACTIVITY_ITEMS.map((item) => {
          const active = sidebarOpen && leftPanelView === item.view;
          return (
            <Tooltip key={item.view}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={item.label}
                  aria-pressed={active}
                  onClick={() => onSelect(item.view)}
                  className={cn(
                    "relative size-7 rounded-sm text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
                    active &&
                      "bg-[#3c3f41] text-[#dfdfdf] before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-sm before:bg-[#3574f0]",
                  )}
                >
                  {item.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={6}
                className="flex items-center gap-2 border border-[#5a5d63] bg-[#3c3f41] px-2 py-1 text-[#dfdfdf] [&_svg]:hidden"
              >
                <span className="text-xs">{item.label}</span>
                <span className="text-[10px] text-[#9a9a9a]">{item.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
