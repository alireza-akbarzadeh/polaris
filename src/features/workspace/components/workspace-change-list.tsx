"use client";

import { FileIcon } from "@react-symbols/icons/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  MinusIcon,
  PlusIcon,
  Undo2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useProject } from "@/features/projects/hooks/use-projects";
import {
  useChangedFiles,
  useDiscardFileChanges,
  useSetAllChangedStaged,
  useSetFileStaged,
} from "@/features/workspace/hooks/use-project-files";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type ChangedFile = {
  _id: Id<"projectFiles">;
  path: string;
  name: string;
  updatedAt: number;
  staged: boolean;
  isNew: boolean;
};

type WorkspaceChangeListProps = {
  projectId: string;
  emptyMessage?: string;
  interactive?: boolean;
};

export function WorkspaceChangeList({
  projectId,
  emptyMessage = "No modified files",
  interactive = false,
}: WorkspaceChangeListProps) {
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const pathname = usePathname();
  const setFileStaged = useSetFileStaged();
  const setAllChangedStaged = useSetAllChangedStaged();
  const discardFileChanges = useDiscardFileChanges();
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  if (project === undefined || changedFiles === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading changes…
      </div>
    );
  }

  if (!project.syncedAt) {
    return (
      <p className="px-3 py-4 text-[11px] leading-relaxed text-[#787878]">
        Change tracking is not available for this project yet. Re-import from
        GitHub or create a new project to enable the change list.
      </p>
    );
  }

  if (changedFiles.length === 0) {
    return (
      <p className="px-3 py-4 text-[11px] text-[#787878]">{emptyMessage}</p>
    );
  }

  if (!interactive) {
    return (
      <ul className="space-y-0.5 p-1.5">
        {changedFiles.map((file) => (
          <ChangeRow
            key={file._id}
            projectId={projectId}
            file={file}
            active={pathname === `/projects/${projectId}/files/${file.path}`}
          />
        ))}
      </ul>
    );
  }

  const staged = changedFiles.filter((file) => file.staged);
  const unstaged = changedFiles.filter((file) => !file.staged);

  const runAction = async (path: string, action: () => Promise<unknown>) => {
    setBusyPath(path);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyPath(null);
    }
  };

  return (
    <div className="flex flex-col gap-1 p-1.5">
      <ChangeSection
        title="Staged Changes"
        count={staged.length}
        open={stagedOpen}
        onToggle={() => setStagedOpen((value) => !value)}
        actionLabel="Unstage All"
        onAction={
          staged.length > 0
            ? () =>
                void runAction("__all__", () =>
                  setAllChangedStaged({
                    projectId: projectId as Id<"projects">,
                    staged: false,
                  }),
                )
            : undefined
        }
      >
        {staged.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-[#6f737a]">
            No staged changes
          </p>
        ) : (
          staged.map((file) => (
            <ChangeRow
              key={file._id}
              projectId={projectId}
              file={file}
              active={pathname === `/projects/${projectId}/files/${file.path}`}
              interactive
              busy={busyPath === file.path}
              onUnstage={() =>
                void runAction(file.path, () =>
                  setFileStaged({
                    projectId: projectId as Id<"projects">,
                    path: file.path,
                    staged: false,
                  }),
                )
              }
            />
          ))
        )}
      </ChangeSection>

      <ChangeSection
        title="Changes"
        count={unstaged.length}
        open={unstagedOpen}
        onToggle={() => setUnstagedOpen((value) => !value)}
        actionLabel="Stage All"
        onAction={
          unstaged.length > 0
            ? () =>
                void runAction("__all__", () =>
                  setAllChangedStaged({
                    projectId: projectId as Id<"projects">,
                    staged: true,
                  }),
                )
            : undefined
        }
      >
        {unstaged.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-[#6f737a]">
            No unstaged changes
          </p>
        ) : (
          unstaged.map((file) => (
            <ChangeRow
              key={file._id}
              projectId={projectId}
              file={file}
              active={pathname === `/projects/${projectId}/files/${file.path}`}
              interactive
              busy={busyPath === file.path}
              onStage={() =>
                void runAction(file.path, () =>
                  setFileStaged({
                    projectId: projectId as Id<"projects">,
                    path: file.path,
                    staged: true,
                  }),
                )
              }
              onDiscard={() =>
                void runAction(file.path, () =>
                  discardFileChanges({
                    projectId: projectId as Id<"projects">,
                    path: file.path,
                  }),
                )
              }
            />
          ))
        )}
      </ChangeSection>
    </div>
  );
}

function ChangeSection({
  title,
  count,
  open,
  onToggle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex h-6 items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1 text-left text-[11px] font-medium text-[#9a9a9a] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
        >
          {open ? (
            <ChevronDownIcon className="size-3 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-3 shrink-0" />
          )}
          <span className="truncate">{title}</span>
          <span className="ml-auto tabular-nums text-[#6f737a]">{count}</span>
        </button>
        {onAction && actionLabel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={actionLabel}
            aria-label={actionLabel}
            onClick={onAction}
            className="size-5 rounded-sm text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
          >
            {actionLabel.startsWith("Stage") ? (
              <PlusIcon className="size-3" />
            ) : (
              <MinusIcon className="size-3" />
            )}
          </Button>
        ) : null}
      </div>
      {open ? <ul className="space-y-0.5">{children}</ul> : null}
    </div>
  );
}

function ChangeRow({
  projectId,
  file,
  active,
  interactive = false,
  busy = false,
  onStage,
  onUnstage,
  onDiscard,
}: {
  projectId: string;
  file: ChangedFile;
  active: boolean;
  interactive?: boolean;
  busy?: boolean;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}) {
  const href = `/projects/${projectId}/files/${file.path}`;
  const marker = file.isNew ? "A" : "M";
  const markerColor = file.isNew ? "text-[#589df6]" : "text-[#6a8759]";

  return (
    <li
      className={cn(
        "group flex items-center gap-0.5 rounded-sm pr-1 pl-1.5 text-[12px]",
        active
          ? "bg-[#3c3f41] text-[#dfdfdf]"
          : "text-[#9a9a9a] hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
      )}
    >
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5"
      >
        <span className={cn("size-3.5 shrink-0 text-center text-[11px] font-medium", markerColor)}>
          {marker}
        </span>
        <span className="size-3.5 shrink-0 [&_svg]:size-full">
          <FileIcon fileName={file.name} autoAssign />
        </span>
        <span className="min-w-0 flex-1 truncate">{file.path}</span>
      </Link>

      {interactive ? (
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {busy ? (
            <Loader2Icon className="size-3.5 animate-spin text-[#787878]" />
          ) : (
            <>
              {onStage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Stage"
                  aria-label={`Stage ${file.path}`}
                  onClick={onStage}
                  className="size-5 rounded-sm text-[#afb1b3] hover:bg-[#2b2d30] hover:text-[#dfdfdf]"
                >
                  <PlusIcon className="size-3" />
                </Button>
              ) : null}
              {onUnstage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Unstage"
                  aria-label={`Unstage ${file.path}`}
                  onClick={onUnstage}
                  className="size-5 rounded-sm text-[#afb1b3] hover:bg-[#2b2d30] hover:text-[#dfdfdf]"
                >
                  <MinusIcon className="size-3" />
                </Button>
              ) : null}
              {onDiscard ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Discard Changes"
                  aria-label={`Discard changes to ${file.path}`}
                  onClick={onDiscard}
                  className="size-5 rounded-sm text-[#afb1b3] hover:bg-[#2b2d30] hover:text-[#ff8a85]"
                >
                  <Undo2Icon className="size-3" />
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
