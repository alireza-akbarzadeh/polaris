"use client";

import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { WorkspaceMessageResponse } from "@/features/workspace/components/workspace-message-response";
import { cn } from "@/lib/utils";

type WorkspaceAiPlanCardProps = {
  content: string;
  isStreaming?: boolean;
  className?: string;
};

function derivePlanTitle(content: string) {
  const heading = content.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 72);
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Implementation plan";
  return firstLine.replace(/^[*`-]+\s*/, "").slice(0, 72);
}

export function WorkspaceAiPlanCard({
  content,
  isStreaming = false,
  className,
}: WorkspaceAiPlanCardProps) {
  const title = derivePlanTitle(content);

  return (
    <Plan
      defaultOpen
      isStreaming={isStreaming}
      className={cn(
        "mb-1 border-ws-border bg-ws-bg/60 text-ws-text shadow-none",
        className,
      )}
    >
      <PlanHeader className="gap-2 border-b border-ws-border-subtle pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          <PlanTitle className="text-[13px] font-semibold text-ws-text">
            {title}
          </PlanTitle>
          <PlanDescription className="text-[11px] text-ws-text-muted">
            Read-only plan — switch to Task mode to execute
          </PlanDescription>
        </div>
        <PlanAction>
          <PlanTrigger className="size-7 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text" />
        </PlanAction>
      </PlanHeader>
      <PlanContent className="pt-3 text-[13px] leading-relaxed text-ws-text-secondary">
        <WorkspaceMessageResponse>{content}</WorkspaceMessageResponse>
      </PlanContent>
    </Plan>
  );
}
