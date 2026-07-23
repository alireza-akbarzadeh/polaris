"use client";

import { ArrowLeftIcon } from "lucide-react";
import { motion } from "motion/react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { AppUserButton } from "@/features/billing/components/app-user-button";
import { NewProjectForm } from "@/features/projects/components/new-project-form";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export function NewProjectView() {
  const router = useRouter();
  const { openProjects } = useProjectsDialog();

  const goBack = () => {
    router.replace("/");
    openProjects();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
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

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              aria-label="Back to projects"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
              priority
            />
            <div className="min-w-0">
              <h1
                className={cn(
                  display.className,
                  "text-lg leading-none font-semibold tracking-tight",
                )}
              >
                New project
              </h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Choose a template to get started
              </p>
            </div>
          </div>
          <AppUserButton />
        </header>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-border/70 bg-card/70 p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8 dark:bg-card/55"
        >
          <NewProjectForm onCancel={goBack} />
        </motion.section>
      </div>
    </div>
  );
}
