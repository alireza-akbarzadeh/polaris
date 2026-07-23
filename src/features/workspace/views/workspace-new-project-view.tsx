"use client";

import { Manrope } from "next/font/google";

import { NewProjectForm } from "@/features/projects/components/new-project-form";
import { useEditorTabs } from "@/features/workspace/hooks/use-editor-tabs";
import { useWorkspaceBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const NEW_PROJECT_BREADCRUMB = [{ label: "New Project" }] as const;

type WorkspaceNewProjectViewProps = {
  projectId: string;
};

/** New project form opened as an editor tab inside the workspace shell. */
export function WorkspaceNewProjectView({
  projectId,
}: WorkspaceNewProjectViewProps) {
  const { closeTab } = useEditorTabs(projectId);
  useWorkspaceBreadcrumb([...NEW_PROJECT_BREADCRUMB]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-8">
      <header className="mb-6">
        <h1
          className={cn(
            display.className,
            "text-lg font-semibold tracking-tight text-ws-text",
          )}
        >
          New project
        </h1>
        <p className="mt-1 text-[12px] text-ws-text-muted">
          Create another workspace without leaving the editor
        </p>
      </header>
      <NewProjectForm onCancel={() => closeTab("new-project")} />
    </div>
  );
}
