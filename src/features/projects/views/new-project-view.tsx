"use client";

import {
  ArrowLeftIcon,
  BoxIcon,
  FolderIcon,
  HexagonIcon,
  Loader2Icon,
  SparklesIcon,
  TriangleIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Manrope } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppUserButton } from "@/features/billing/components/app-user-button";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import {
  useCreateProject,
  useProjectTemplates,
} from "@/features/projects/hooks/use-projects";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type TemplateId = "empty" | "simple" | "nextjs" | "react" | "tanstack";

const TEMPLATE_ICONS: Record<TemplateId, typeof FolderIcon> = {
  empty: FolderIcon,
  simple: SparklesIcon,
  nextjs: TriangleIcon,
  react: HexagonIcon,
  tanstack: BoxIcon,
};

function randomProjectName() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    separator: "-",
    length: 3,
  });
}

export function NewProjectView() {
  const router = useRouter();
  const { openProjects } = useProjectsDialog();
  const templates = useProjectTemplates();
  const createProject = useCreateProject();
  const [name, setName] = useState(randomProjectName);
  const [templateId, setTemplateId] = useState<TemplateId>("nextjs");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Project name is required");
      return;
    }

    setCreating(true);
    try {
      const projectId = await createProject({
        name: trimmed,
        templateId,
      });
      toast.success("Project created");
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast.error(
        parseConvexErrorMessage(error, "Failed to create project"),
      );
      setCreating(false);
    }
  }

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
              onClick={() => {
                router.replace("/");
                openProjects();
              }}
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
          <div className="mb-6 max-w-xl">
            <h2
              className={cn(
                display.className,
                "text-2xl font-semibold tracking-tight",
              )}
            >
              Initialize workspace
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick a starter, name your project, and open it in the editor.
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <div className="flex gap-2">
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="my-project"
                autoFocus
                disabled={creating}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !creating) {
                    void handleCreate();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => setName(randomProjectName())}
              >
                Random
              </Button>
            </div>
          </div>

          <div className="mb-2">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Template
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(templates ?? []).map((template, index) => {
                const id = template.id as TemplateId;
                const Icon = TEMPLATE_ICONS[id] ?? FolderIcon;
                const selected = templateId === id;

                return (
                  <motion.button
                    key={template.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.04 * index,
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    disabled={creating}
                    onClick={() => setTemplateId(id)}
                    className={cn(
                      "group flex flex-col items-start gap-3 rounded-md border p-4 text-left transition-colors",
                      "outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
                      selected
                        ? "border-ring/50 bg-foreground/5"
                        : "border-border/60 bg-background/30 hover:border-border hover:bg-foreground/4",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-sm border transition-colors",
                        selected
                          ? "border-ring/40 text-ring"
                          : "border-border/60 text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium tracking-tight">
                        {template.name}
                      </span>
                      <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                        {template.description}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
              {templates === undefined ? (
                <div className="col-span-full flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading templates…
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border/60 pt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={creating}
              onClick={() => {
                router.replace("/");
                openProjects();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={creating || !name.trim() || templates === undefined}
              onClick={() => void handleCreate()}
            >
              {creating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create project"
              )}
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
