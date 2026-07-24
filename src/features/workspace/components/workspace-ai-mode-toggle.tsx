"use client";

import { ListTodoIcon, WrenchIcon } from "lucide-react";

import {
  AI_CHAT_MODE_META,
  type AiChatMode,
} from "@/lib/ai/chat-mode";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

export function WorkspaceAiModeToggle({
  value,
  onChange,
  disabled,
  className,
}: WorkspaceAiModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === "plan" || next === "task") onChange(next);
      }}
      variant="outline"
      size="sm"
      spacing={0}
      disabled={disabled}
      aria-label="AI mode"
      className={cn(
        "h-7 rounded-md border-ws-border bg-ws-bg p-0.5",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="plan"
            aria-label={AI_CHAT_MODE_META.plan.label}
            className={cn(
              "h-6 gap-1 rounded-sm px-2 text-[11px] text-ws-text-muted",
              "data-[state=on]:bg-ws-hover data-[state=on]:text-ws-text data-[state=on]:shadow-none",
              "hover:bg-ws-hover/60 hover:text-ws-text",
            )}
          >
            <ListTodoIcon className="size-3" />
            <span>Plan</span>
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {AI_CHAT_MODE_META.plan.description}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="task"
            aria-label={AI_CHAT_MODE_META.task.label}
            className={cn(
              "h-6 gap-1 rounded-sm px-2 text-[11px] text-ws-text-muted",
              "data-[state=on]:bg-ws-accent/20 data-[state=on]:text-ws-accent-soft data-[state=on]:shadow-none",
              "hover:bg-ws-hover/60 hover:text-ws-text",
            )}
          >
            <WrenchIcon className="size-3" />
            <span>Task</span>
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {AI_CHAT_MODE_META.task.description}
        </TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
