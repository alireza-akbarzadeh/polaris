"use client";

import {
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppUserButton } from "@/features/billing/components/app-user-button";
import { usePricingDialog } from "@/features/billing/components/pricing-dialog";
import { useBilling } from "@/features/billing/hooks/use-billing";
import { useProjectAccess } from "@/features/projects/hooks/use-project-access";
import { runCommand } from "@/features/workspace/commands/registry";
import { ProjectPresenceAvatars } from "@/features/workspace/components/project-presence-avatars";
import { WorkspaceBreadcrumb } from "@/features/workspace/components/workspace-breadcrumb";
import { WorkspaceGitMenu } from "@/features/workspace/components/workspace-git-menu";
import { WorkspacePublishMenu } from "@/features/workspace/components/workspace-publish-menu";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import { cn } from "@/lib/utils";

type WorkspaceToolbarProps = {
  projectId: string;
  projectName?: string;
};

type ToolbarTooltipButtonProps = {
  label: string;
  shortcut: ReactNode;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarTooltipButton({
  label,
  shortcut,
  pressed,
  onClick,
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
          onClick={onClick}
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

function ModKey() {
  return (
    <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
      ⌘
    </Kbd>
  );
}

function ShortcutKey({ children }: { children: ReactNode }) {
  return (
    <Kbd className="h-4 min-w-4 border-ws-border-strong bg-ws-panel px-1 text-[10px] text-ws-text">
      {children}
    </Kbd>
  );
}

export function WorkspaceToolbar({
  projectId,
  projectName,
}: WorkspaceToolbarProps) {
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const terminalOpen = useWorkspaceStore((s) => s.terminalOpen);
  const aiPanelOpen = useWorkspaceStore((s) => s.aiPanelOpen);
  const { isLoaded, isPro } = useBilling();
  const { openPricing } = usePricingDialog();
  const { openTab } = useEditorTabs(projectId);
  const access = useProjectAccess(projectId);

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex h-9 shrink-0 items-center gap-1 border-b border-ws-border-subtle bg-ws-panel px-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
          <WorkspaceBreadcrumb
            projectId={projectId}
            projectName={projectName}
          />
          {access?.role === "viewer" ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              View only
            </Badge>
          ) : null}
        </div>

        <ProjectPresenceAvatars projectId={projectId} />

        <div className="flex items-center gap-0.5">
          <ToolbarTooltipButton
            label="Project"
            pressed={sidebarOpen}
            onClick={() => runCommand("toggleSidebar")}
            shortcut={
              <>
                <ModKey />
                <ShortcutKey>B</ShortcutKey>
              </>
            }
          >
            <PanelLeftIcon className="size-3.5" strokeWidth={1.75} />
          </ToolbarTooltipButton>

          <ToolbarTooltipButton
            label="Terminal"
            pressed={terminalOpen}
            onClick={() => runCommand("toggleTerminal")}
            shortcut={
              <>
                <ModKey />
                <ShortcutKey>J</ShortcutKey>
              </>
            }
          >
            <PanelBottomIcon className="size-3.5" strokeWidth={1.75} />
          </ToolbarTooltipButton>

          <ToolbarTooltipButton
            label="AI"
            pressed={aiPanelOpen}
            onClick={() => runCommand("toggleAiPanel")}
            shortcut={
              <>
                <ModKey />
                <ShortcutKey>L</ShortcutKey>
              </>
            }
          >
            <PanelRightIcon className="size-3.5" strokeWidth={1.75} />
          </ToolbarTooltipButton>

          <Separator
            orientation="vertical"
            className="mx-1 data-[orientation=vertical]:h-4 data-[orientation=vertical]:bg-ws-border"
          />

          <WorkspaceGitMenu projectId={projectId} />
          <WorkspacePublishMenu projectId={projectId} />
        </div>

        <Separator
          orientation="vertical"
          className="mx-1.5 data-[orientation=vertical]:h-4 data-[orientation=vertical]:bg-ws-border"
        />

        <div className="flex items-center gap-1.5 pr-1 [&_.cl-userButtonAvatarBox]:size-6 [&_.cl-userButtonTrigger]:rounded-sm">
          {isLoaded && !isPro ? (
            <Button
              type="button"
              size="sm"
              onClick={() => openPricing()}
              className="h-6 rounded-sm bg-ws-accent px-2.5 text-[11px] font-medium text-white hover:bg-ws-accent-hover"
            >
              Upgrade
            </Button>
          ) : null}
          <AppUserButton
            onOpenSettings={() => openTab({ kind: "settings" })}
            appearance={{
              elements: {
                userButtonAvatarBox: "size-6",
                userButtonTrigger: "rounded-sm focus:shadow-none",
              },
            }}
          />
        </div>
      </header>
    </TooltipProvider>
  );
}
