"use client";

import { Manrope } from "next/font/google";
import { Separator } from "@/components/ui/separator";

import { EditorSettingsPanel } from "@/features/settings/components/editor-settings-panel";
import { ProjectDangerZone } from "@/features/settings/components/project-danger-zone";
import { ProjectSharingPanel } from "@/features/settings/components/project-sharing-panel";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useWorkspaceBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SETTINGS_BREADCRUMB = [{ label: "Settings" }] as const;

type WorkspaceSettingsViewProps = {
  projectId: string;
};

/** Settings opened as an editor tab inside the workspace shell. */
export function WorkspaceSettingsView({
  projectId,
}: WorkspaceSettingsViewProps) {
  const project = useProject({ projectId });
  useWorkspaceBreadcrumb([...SETTINGS_BREADCRUMB]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-8">
      <header className="mb-6">
        <h1
          className={cn(
            display.className,
            "text-lg font-semibold tracking-tight text-ws-text",
          )}
        >
          Settings
        </h1>
        <p className="mt-1 text-[12px] text-ws-text-muted">
          Editor preferences and project management
        </p>
      </header>

      <section className="mb-10">
        <h2
          className={cn(
            display.className,
            "mb-4 text-sm font-semibold tracking-tight text-ws-text",
          )}
        >
          Editor
        </h2>
        <EditorSettingsPanel />
      </section>

      <Separator className="mb-10" />

      <section className="mb-10">
        <h2
          className={cn(
            display.className,
            "mb-4 text-sm font-semibold tracking-tight text-ws-text",
          )}
        >
          Sharing
        </h2>
        {project ? (
          <ProjectSharingPanel
            projectId={projectId}
            canManage={Boolean(project.canManage)}
          />
        ) : (
          <p className="text-[13px] text-ws-text-muted">Loading project…</p>
        )}
      </section>

      <Separator className="mb-10" />

      <section>
        <h2
          className={cn(
            display.className,
            "mb-4 text-sm font-semibold tracking-tight text-ws-text",
          )}
        >
          Project
        </h2>
        {project?.name && project.canManage ? (
          <ProjectDangerZone
            projectId={projectId}
            projectName={project.name}
          />
        ) : project?.name ? (
          <p className="text-[13px] text-ws-text-muted">
            Only the project owner can delete this project.
          </p>
        ) : (
          <p className="text-[13px] text-ws-text-muted">Loading project…</p>
        )}
      </section>
    </div>
  );
}
