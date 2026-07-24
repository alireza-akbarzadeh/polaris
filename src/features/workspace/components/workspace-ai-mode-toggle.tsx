"use client";

import { ListTodoIcon, WrenchIcon } from "lucide-react";

import {
  AI_CHAT_MODE_META,
  type AiChatMode,
} from "@/lib/ai/chat-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type WorkspaceAiModeToggleProps = {
  value: AiChatMode;
  onChange: (mode: AiChatMode) => void;
  disabled?: boolean;
  className?: string;
};

const MODES: Array<{
  id: AiChatMode;
  label: string;
  icon: typeof ListTodoIcon;
}> = [
  { id: "plan", label: "Plan", icon: ListTodoIcon },
  { id: "task", label: "Task", icon: WrenchIcon },
];

export function WorkspaceAiModeToggle({
  value,
  onChange,
  disabled,
  className,
}: WorkspaceAiModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="AI mode"
      className={cn(
        "inline-flex h-7 items-center gap-0.5 rounded-md border border-ws-border bg-ws-bg p-0.5",
        className,
      )}
    >
      {MODES.map((mode) => {
        const active = value === mode.id;
        const Icon = mode.icon;
        const meta = AI_CHAT_MODE_META[mode.id];

        return (
          <Tooltip key={mode.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={meta.label}
                aria-pressed={active}
                onClick={() => onChange(mode.id)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors",
                  "disabled:pointer-events-none disabled:opacity-50",
                  active
                    ? mode.id === "plan"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-ws-accent/20 text-ws-accent-soft"
                    : "text-ws-text-muted hover:bg-ws-hover/70 hover:text-ws-text",
                )}
              >
                <Icon className="size-3 shrink-0" />
                <span>{mode.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {meta.description}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
