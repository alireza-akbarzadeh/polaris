"use client";

import { useProject } from "@/features/projects/hooks/use-projects";
import { WorkspaceLayout } from "@/features/workspace/views/workspace-layout";

type WorkspaceShellProps = {
  projectId: string;
  children: React.ReactNode;
};

/** Client workspace chrome — wraps all `/projects/[projectId]/*` routes. */
export function WorkspaceShell({ projectId, children }: WorkspaceShellProps) {
  const project = useProject({ projectId });

  return (
    <WorkspaceLayout projectId={projectId} projectName={project?.name}>
      {children}
    </WorkspaceLayout>
  );
}
