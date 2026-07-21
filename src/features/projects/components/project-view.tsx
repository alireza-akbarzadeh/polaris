"use client";

import { FolderPlusIcon, SparklesIcon } from "lucide-react";
import { motion } from "motion/react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import type { ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";
import { ProjectList } from "@/features/projects/components/project-list";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function ActionRow({
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

export function ProjectView() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      {/* Atmosphere — Fleet / New UI inspired, not VS Code chrome */}
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
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-10 md:px-10"
      >
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:bg-card/55">
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Left — brand + primary actions */}
            <section className="flex flex-col border-b border-border/60 p-7 md:border-b-0 md:border-r md:p-8">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 flex items-center gap-3"
              >
                <Image
                  src="/logo.svg"
                  alt=""
                  width={36}
                  height={36}
                  className="size-9"
                  priority
                />
                <div className="min-w-0">
                  <h1
                    className={cn(
                      display.className,
                      "text-[1.65rem] leading-none font-semibold tracking-tight",
                    )}
                  >
                    Polaris
                  </h1>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    AI workspace for building software
                  </p>
                </div>
              </motion.div>

              <div className="mt-auto flex flex-col gap-0.5">
                <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Start
                </p>
                <ActionRow
                  icon={<SparklesIcon className="size-4" />}
                  title="New project"
                  description="Spin up a blank workspace"
                  shortcut="⌘N"
                  delay={0.08}
                  onClick={() => { }}
                />
                <ActionRow
                  icon={<FolderPlusIcon className="size-4" />}
                  title="Open local"
                  description="Import an existing folder"
                  shortcut="⌘O"
                  delay={0.12}
                  onClick={() => { }}
                />
                <ActionRow
                  icon={
                    <Image
                      src="/images/github.png"
                      alt=""
                      width={16}
                      height={16}
                      className="size-4 dark:invert"
                    />
                  }
                  title="Clone from GitHub"
                  description="Pull a repository into Polaris"
                  shortcut="⌘I"
                  delay={0.16}
                  onClick={() => { }}
                />
              </div>
            </section>

            {/* Right — recent projects */}
            <section className="flex min-h-80 flex-col p-5 md:min-h-105 md:p-6">
              <ProjectList onViewAll={() => { }} />
            </section>
          </div>

          <footer className="flex items-center justify-between border-t border-border/60 px-6 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Image src="/images/github.png" alt="github" width={12} height={12} className="size-3 opacity-70" />
              Connected via Clerk
            </span>
            <span className="font-mono tabular-nums opacity-70">v0.1.0</span>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
