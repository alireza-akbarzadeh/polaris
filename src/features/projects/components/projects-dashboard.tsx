"use client";

import {
  FolderPlusIcon,
  LayoutTemplateIcon,
} from "lucide-react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppUserButton } from "@/features/billing/components/app-user-button";
import { usePricingDialog } from "@/features/billing/components/pricing-dialog";
import { CloneFromGitHubDialog } from "@/features/github/components/clone-from-github-dialog";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { ProjectActionRow } from "@/features/projects/components/project-action-row";
import { ProjectCommandDialog } from "@/features/projects/components/project-command-dialog";
import { ProjectList } from "@/features/projects/components/project-list";
import { ThemeSection } from "@/features/projects/components/theme-sections";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type ProjectsDashboardProps = {
  /** Tighter chrome when embedded in the projects dialog. */
  compact?: boolean;
};

export function ProjectsDashboard({ compact = false }: ProjectsDashboardProps) {
  const router = useRouter();
  const { openPricing } = usePricingDialog();
  const [commandOpen, setCommandOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "n" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        router.push("/projects/new");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <>
      <div
        className={cn(
          "overflow-hidden border-border/70 bg-card/70 backdrop-blur-xl dark:bg-card/55",
          compact
            ? "rounded-none border-0 shadow-none"
            : "rounded-lg border shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)]",
        )}
      >
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section
            className={cn(
              "flex flex-col border-b border-border/60 md:border-b-0 md:border-r",
              compact ? "p-5 md:p-6" : "p-7 md:p-8",
            )}
          >
            {!compact ? (
              <div className="mb-8 flex items-center gap-3">
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
              </div>
            ) : null}

            <div className={cn("flex flex-col gap-0.5", !compact && "mt-auto")}>
              <p className="mb-2 px-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Start
              </p>
              <ProjectActionRow
                icon={<LayoutTemplateIcon className="size-4" />}
                title="New project"
                description="Start from a template"
                shortcut="⌘N"
                delay={0.08}
                onClick={() => router.push("/projects/new")}
              />
              <ProjectActionRow
                icon={<FolderPlusIcon className="size-4" />}
                title="Open local"
                description="Import an existing folder"
                shortcut="⌘O"
                delay={0.12}
                onClick={() => {}}
              />
              <ProjectActionRow
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
                onClick={() => setCloneOpen(true)}
              />
              <ThemeSection />
            </div>
          </section>

          <section
            className={cn(
              "flex min-h-80 flex-col md:min-h-105",
              compact ? "p-4 md:p-5" : "p-5 md:p-6",
            )}
          >
            <ProjectList onViewAll={() => setCommandOpen(true)} />
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-border/60 px-6 py-2.5 text-[11px] text-muted-foreground">
          <AppUserButton />
          <GitHubConnectionStatus />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openPricing()}
              className="transition-colors hover:text-foreground"
            >
              Pricing
            </button>
            <span className="font-mono tabular-nums opacity-70">v0.1.0</span>
          </div>
        </footer>
      </div>

      <ProjectCommandDialog open={commandOpen} onOpenChange={setCommandOpen} />
      <CloneFromGitHubDialog open={cloneOpen} onOpenChange={setCloneOpen} />
    </>
  );
}
