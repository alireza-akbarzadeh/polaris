"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FolderPlusIcon,
  GiftIcon,
  InfoIcon,
  Loader2Icon,
  MoonIcon,
  PencilIcon,
  PlugIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Id } from "@/convex/_generated/dataModel";
import { useBilling } from "@/features/billing/hooks/use-billing";
import { usePricingDialog } from "@/features/billing/components/pricing-dialog";
import { getProjectsIcons } from "@/features/projects/components/project-row";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import {
  useProject,
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects";
import { useGitHubConnection } from "@/features/github/hooks/use-github-connection";
import { runCommand } from "@/features/workspace/commands/registry";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import { exportProjectAsZip } from "@/features/workspace/lib/export-project-zip";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  projectId: string;
  projectName?: string;
};

function MenuRow({
  icon,
  label,
  trailing,
  onClick,
  href,
  external,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-ws-text-secondary transition-colors",
    "hover:bg-ws-hover hover:text-ws-text",
  );

  const content = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center text-ws-text-muted [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
      {external ? (
        <ExternalLinkIcon className="size-3 shrink-0 text-ws-text-muted" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        onClick={onClick}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function WorkspaceSwitcher({
  projectId,
  projectName,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const projects = useProjects();
  const project = useProject({ projectId });
  const projectFiles = useProjectFiles(projectId);
  const updateProject = useUpdateProject();
  const { isLoaded, isPro } = useBilling();
  const { openPricing } = usePricingDialog();
  const { openProjects } = useProjectsDialog();
  const { isConnected, connection } = useGitHubConnection();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [open, setOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [draftName, setDraftName] = useState(projectName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = project?.name ?? projectName ?? "Project";
  const planLabel = !isLoaded ? "…" : isPro ? "Pro" : "Free";
  const planProgress = !isLoaded ? 0 : isPro ? 100 : 35;
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";

  useEffect(() => {
    setDraftName(projectName ?? project?.name ?? "");
  }, [projectName, project?.name]);

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  const close = () => setOpen(false);

  const exportProject = async () => {
    if (isExporting) return;
    if (projectFiles === undefined) {
      toast.message("Loading project files…");
      return;
    }

    setIsExporting(true);
    try {
      const result = exportProjectAsZip({
        projectName: displayName,
        files: projectFiles,
      });
      toast.success(`Exported ${result.fileCount} files as ${result.filename}`);
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export project",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === displayName) {
      setDraftName(displayName);
      setIsRenaming(false);
      return;
    }

    await updateProject({
      projectId: projectId as Id<"projects">,
      name: nextName,
    });
    setIsRenaming(false);
  };

  const otherProjects =
    projects?.filter((item) => item._id !== projectId) ?? [];

  const connectorLabel = isConnected
    ? connection?.username
      ? `GitHub · @${connection.username}`
      : "GitHub connected"
    : "Connect GitHub";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setIsRenaming(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="-ml-4 h-7 max-w-55 gap-2 rounded-sm text-ws-text hover:bg-ws-hover hover:text-white"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={19}
            height={19}
            className="size-5 shrink-0"
          />
          <span className="truncate text-[13px] font-medium">
            {displayName}
          </span>
          <ChevronRightIcon className="size-3 shrink-0 rotate-90 text-ws-text-muted" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-75 border-ws-border bg-ws-panel p-0 text-ws-text shadow-xl"
        sideOffset={8}
      >
        <div className="flex flex-col p-1.5">
          <MenuRow
            icon={<ArrowLeftIcon />}
            label="Go to Dashboard"
            onClick={() => {
              close();
              openProjects();
            }}
          />
        </div>

        <Separator className="bg-ws-border" />

        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ws-bg text-[12px] font-semibold text-ws-text">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    ref={inputRef}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void saveName();
                      if (event.key === "Escape") {
                        setDraftName(displayName);
                        setIsRenaming(false);
                      }
                    }}
                    className="h-7 border-ws-border bg-ws-bg text-[13px] text-ws-text"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    className="size-7 shrink-0 bg-ws-accent hover:bg-ws-accent-hover"
                    onClick={() => void saveName()}
                  >
                    <CheckIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="truncate text-[13px] font-medium leading-tight">
                  {displayName}
                  <span className="text-ws-text-muted"> · {planLabel}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => {
              close();
              openPricing();
            }}
            className="block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-ws-hover"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-ws-text">
                {isPro ? "Plan" : "Credits"}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[12px] text-ws-text-muted">
                {isPro ? "Pro" : "Free"}
                <ChevronRightIcon className="size-3.5" />
              </span>
            </div>
            <Progress
              value={planProgress}
              className="h-1.5 bg-ws-bg [&>[data-slot=progress-indicator]]:bg-ws-accent"
            />
            <p className="mt-1.5 text-[11px] text-ws-text-muted">
              {isPro
                ? "Pro features unlocked. Manage billing anytime."
                : "Free plan · upgrade for more AI capacity."}
            </p>
          </button>
        </div>

        <Separator className="bg-ws-border" />

        <div className="flex flex-col gap-0.5 p-1.5">
          {!isPro ? (
            <MenuRow
              icon={<GiftIcon />}
              label="Upgrade for more credits"
              onClick={() => {
                close();
                openPricing();
              }}
            />
          ) : null}

          <MenuRow
            icon={<SettingsIcon />}
            label="Settings"
            onClick={() => {
              close();
              runCommand("openSettings");
            }}
          />

          <MenuRow
            icon={<FolderPlusIcon />}
            label="Open new project"
            trailing={
              <span className="text-[11px] text-ws-text-muted">⌘N</span>
            }
            onClick={() => {
              close();
              runCommand("openNewProject");
            }}
          />

          <MenuRow
            icon={
              <Image
                src="/images/github.png"
                alt=""
                width={14}
                height={14}
                className="size-3.5 dark:invert"
              />
            }
            label="Project connectors"
            trailing={
              <span className="max-w-27.5 truncate text-[11px] text-ws-text-muted">
                {connectorLabel}
              </span>
            }
            onClick={() => {
              close();
              if (isConnected) {
                runCommand("showGit");
              } else {
                runCommand("openCloneFromGitHub");
              }
            }}
          />

          <MenuRow
            icon={<PlugIcon />}
            label={
              project?.source === "github" && project.githubRepoUrl
                ? "Open on GitHub"
                : "Publish to GitHub"
            }
            onClick={() => {
              close();
              if (project?.githubRepoUrl) {
                window.open(project.githubRepoUrl, "_blank", "noopener,noreferrer");
              } else {
                runCommand("showGit");
              }
            }}
          />

          <MenuRow
            icon={
              isExporting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <DownloadIcon />
              )
            }
            label={isExporting ? "Exporting…" : "Export as ZIP"}
            onClick={() => void exportProject()}
          />

          <MenuRow
            icon={<PencilIcon />}
            label="Rename project"
            onClick={() => setIsRenaming(true)}
          />

          <MenuRow
            icon={<InfoIcon />}
            label="Details"
            trailing={
              project?.updatedAt ? (
                <span className="text-[11px] text-ws-text-muted">
                  Updated{" "}
                  {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                </span>
              ) : null
            }
            onClick={() => {
              close();
              runCommand("openSettings");
            }}
          />
        </div>

        <Separator className="bg-ws-border" />

        <div className="max-h-40 overflow-y-auto p-1.5">
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ws-text-muted">
            Switch workspace
          </p>
          {projects === undefined ? (
            <p className="px-2 py-2 text-[12px] text-ws-text-muted">Loading…</p>
          ) : otherProjects.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-ws-text-muted">
              No other workspaces yet.
            </p>
          ) : (
            otherProjects.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  router.push(`/projects/${item._id}`);
                  close();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-ws-hover"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ws-bg">
                  {getProjectsIcons(item)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-[11px] text-ws-text-muted">
                    Updated{" "}
                    {formatDistanceToNow(item.updatedAt, {
                      addSuffix: true,
                    })}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <Separator className="bg-ws-border" />

        <div className="flex flex-col gap-0.5 p-1.5">
          <MenuRow
            icon={isDark ? <MoonIcon /> : <SunIcon />}
            label="Appearance"
            trailing={
              <span className="text-[11px] text-ws-text-muted">
                {isDark ? "Dark" : "Light"}
              </span>
            }
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
          <MenuRow
            icon={<InfoIcon />}
            label="Help & billing"
            onClick={() => {
              close();
              openPricing();
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
