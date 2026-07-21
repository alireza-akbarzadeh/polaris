"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, FolderOpenIcon } from "lucide-react";
import { motion } from "motion/react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Doc } from "@/convex/_generated/dataModel";
import { useProjectPartial } from "@/features/projects/hooks/use-projects";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  onViewAll: () => void;
  onOpenProject?: (project: Doc<"projects">) => void;
}

function ProjectRow({
  project,
  index,
  onOpen,
}: {
  project: Doc<"projects">;
  index: number;
  onOpen?: (project: Doc<"projects">) => void;
}) {
  const status =
    project.importStatus === "importing"
      ? "Importing…"
      : project.exportStatus === "exporting"
        ? "Exporting…"
        : null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen?.(project)}
      className={cn(
        "group relative flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none",
        "rounded-sm transition-colors duration-150",
        "hover:bg-foreground/6 focus-visible:bg-foreground/6",
        "focus-visible:ring-1 focus-visible:ring-ring/40",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-foreground/6 text-muted-foreground transition-colors group-hover:bg-ring/15 group-hover:text-ring">
        <FolderOpenIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium tracking-tight text-foreground">
          {project.name}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {status ??
            `Updated ${formatDistanceToNow(project.updatedAt, { addSuffix: true })}`}
        </span>
      </span>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-150 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
    </motion.button>
  );
}

function ProjectListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-8 rounded-sm" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectList({ onViewAll, onOpenProject }: ProjectListProps) {
  const projects = useProjectPartial({ limit: 6 });

  if (projects === undefined) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-baseline justify-between px-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Recent
          </h2>
        </div>
        <ProjectListSkeleton />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-[13px] font-medium text-foreground/80">No projects yet</p>
        <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
          Create a workspace or pull one from GitHub to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between px-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Recent
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </button>
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {projects.map((project, index) => (
          <ProjectRow
            key={project._id}
            project={project}
            index={index}
            onOpen={onOpenProject}
          />
        ))}
      </div>
    </div>
  );
}
