"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  Loader2Icon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";

import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from "@/components/ai-elements/task";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toolPath(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  if (!("path" in input) || typeof input.path !== "string") return null;
  return input.path;
}

function statusMeta(state: ToolPart["state"]) {
  switch (state) {
    case "output-available":
      return {
        label: "Done",
        icon: CheckCircle2Icon,
        className: "text-emerald-400",
      };
    case "output-error":
      return {
        label: "Failed",
        icon: XCircleIcon,
        className: "text-red-400",
      };
    case "input-available":
    case "approval-responded":
      return {
        label: "Running",
        icon: Loader2Icon,
        className: "text-ws-accent-soft animate-spin",
      };
    default:
      return {
        label: "Pending",
        icon: CircleDashedIcon,
        className: "text-ws-text-muted",
      };
  }
}

type WorkspaceAiTaskCardProps = {
  name: string;
  part: ToolUIPart | DynamicToolUIPart;
  defaultOpen?: boolean;
  onRetryAction?: () => void | Promise<void>;
  className?: string;
};

export function WorkspaceAiTaskCard({
  name,
  part,
  defaultOpen,
  onRetryAction,
  className,
}: WorkspaceAiTaskCardProps) {
  const [retrying, setRetrying] = useState(false);
  const path = toolPath("input" in part ? part.input : undefined);
  const status = statusMeta(part.state);
  const StatusIcon = status.icon;
  const failed = part.state === "output-error";
  const openByDefault = defaultOpen ?? part.state !== "output-available";

  const handleRetry = async () => {
    if (!onRetryAction || retrying) return;
    setRetrying(true);
    try {
      await onRetryAction();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Task
      defaultOpen={openByDefault}
      className={cn(
        "mb-2 rounded-lg border border-ws-border bg-ws-panel/80",
        className,
      )}
    >
      <div className="flex items-center gap-1 pr-2">
        <TaskTrigger
          title={name}
          className="min-w-0 flex-1 px-3 py-2 hover:no-underline"
        >
          <div className="flex w-full cursor-pointer items-center gap-2 text-left">
            <StatusIcon className={cn("size-3.5 shrink-0", status.className)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ws-text">
                {name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-ws-text-muted">
                  {status.label}
                </span>
                {path ? (
                  <TaskItemFile className="border-ws-border bg-ws-bg text-[10px] text-ws-text-secondary">
                    {path}
                  </TaskItemFile>
                ) : null}
              </div>
            </div>
          </div>
        </TaskTrigger>

        {failed && onRetryAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={retrying}
            onClick={() => void handleRetry()}
            className="h-7 shrink-0 gap-1 px-2 text-[11px] text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
          >
            {retrying ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : (
              <RotateCcwIcon className="size-3" />
            )}
            Retry
          </Button>
        ) : null}
      </div>

      <TaskContent className="border-ws-border pb-3 pl-3 pr-3">
        <TaskItem className="text-[11px] text-ws-text-muted">
          <Tool
            defaultOpen
            className="mb-0 border-ws-border/70 bg-transparent shadow-none"
          >
            <ToolHeader
              title="Details"
              className="px-2 py-2"
              {...(part.type === "dynamic-tool"
                ? {
                    type: "dynamic-tool" as const,
                    state: part.state,
                    toolName: part.toolName,
                  }
                : {
                    type: part.type,
                    state: part.state,
                  })}
            />
            <ToolContent className="space-y-2 p-2 text-[11px]">
              {"input" in part && part.input != null ? (
                <ToolInput input={part.input} />
              ) : null}
              <ToolOutput
                output={"output" in part ? part.output : undefined}
                errorText={"errorText" in part ? part.errorText : undefined}
              />
            </ToolContent>
          </Tool>
        </TaskItem>
      </TaskContent>
    </Task>
  );
}
