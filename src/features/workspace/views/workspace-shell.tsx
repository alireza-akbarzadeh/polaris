"use client";

import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";
import { WorkspaceLayout } from "@/features/workspace/views/workspace-layout";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type WorkspaceShellProps = {
  projectId: string;
  children: React.ReactNode;
};

/** Client workspace chrome — wraps all `/projects/[projectId]/*` routes. */
export function WorkspaceShell({ projectId, children }: WorkspaceShellProps) {
  const project = useProject({ projectId });
  const { openProjects } = useProjectsDialog();

  if (project === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <Image src="/logo.svg" alt="" width={40} height={40} className="size-10" />
        <div className="max-w-md space-y-2">
          <h1
            className={cn(
              display.className,
              "text-2xl font-semibold tracking-tight text-foreground",
            )}
          >
            Project unavailable
          </h1>
          <p className="text-sm text-muted-foreground">
            This project doesn’t exist or isn’t owned by your current account.
            Open one from your projects list or create a new one.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openProjects()}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Open projects
          </button>
          <Link
            href="/projects/new"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            New project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout projectId={projectId} projectName={project.name}>
      {children}
    </WorkspaceLayout>
  );
}
