"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


type ToolbarTooltipButtonProps = {
  label: string;
  shortcut: ReactNode;
  pressed?: boolean;
  onClickAction: () => void;
  children: ReactNode;
};

export function ToolbarTooltipButton({
  label,
  shortcut,
  pressed,
  onClickAction,
  children,
}: ToolbarTooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClickAction}
          className={cn(
            "relative size-7 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text",
            pressed &&
            "bg-ws-hover after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-ws-accent",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex items-center gap-3 border border-ws-border-strong bg-ws-hover px-2.5 py-1.5 text-ws-text [&_svg]:hidden"
      >
        <span className="text-xs">{label}</span>
        <KbdGroup className="gap-0.5 opacity-80">{shortcut}</KbdGroup>
      </TooltipContent>
    </Tooltip>
  );
}

export function ModKey() {
  return (
    <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
      ⌘
    </Kbd>
  );
}

export function ShortcutKey({ children }: { children: ReactNode }) {
  return (
    <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
      {children}
    </Kbd>
  );
}

