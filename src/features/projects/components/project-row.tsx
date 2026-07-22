"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon } from "lucide-react";
import { motion } from "motion/react";

import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import { AlertCircleIcon, FolderOpenIcon, Loader2Icon } from "lucide-react";
import Image from "next/image";

export const getProjectsIcons = (project: Doc<"projects">) => {
  if (project.importStatus === "completed") {
    return <Image src="/images/github.png" alt="GitHub" width={14} height={14} className="size-3.5 dark:invert" />;
  }
  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-3.5 text-muted-foreground" />;
  }
  if (project.importStatus === "importing") {
    return <Loader2Icon className="size-3.5 text-muted-foreground animate-spin" />;
  }
  return <FolderOpenIcon className="size-3.5 text-muted-foreground " />
};


export function ProjectRow({
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
        {getProjectsIcons(project)}
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



