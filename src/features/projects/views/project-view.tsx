"use client";

import { motion } from "motion/react";

import { ProjectsDashboard } from "@/features/projects/components/projects-dashboard";

/** Full-page projects shell (kept for deep links / fallbacks). Prefer the dialog. */
export function ProjectView() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 12% 18%, color-mix(in oklch, var(--ring) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 45% at 88% 82%, color-mix(in oklch, var(--accent) 55%, transparent), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-4xl px-6 py-10 md:px-10"
      >
        <ProjectsDashboard />
      </motion.div>
    </div>
  );
}
