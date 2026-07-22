"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";



export function ProjectActionRow({
  icon,
  title,
  description,
  shortcut,
  onClick,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  shortcut?: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-sm px-3 py-2.5 text-left outline-none",
        "transition-colors duration-150",
        "hover:bg-foreground/6 focus-visible:bg-foreground/6",
        "focus-visible:ring-1 focus-visible:ring-ring/40",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/40 text-muted-foreground transition-colors group-hover:border-ring/30 group-hover:text-ring">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium tracking-tight text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {description}
        </span>
      </span>
      {shortcut ? (
        <Kbd className="border border-border/50 bg-transparent text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100">
          {shortcut}
        </Kbd>
      ) : null}
    </motion.button>
  );
}

