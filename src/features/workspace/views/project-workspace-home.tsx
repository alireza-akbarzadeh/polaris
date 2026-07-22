"use client";

import Image from "next/image";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useWorkspaceBreadcrumb } from "@/features/workspace/hooks/use-workspace-breadcrumb";

const WELCOME_BREADCRUMB = [{ label: "Welcome" }] as const;

type ProjectWorkspaceHomeProps = {
  projectId: string;
};

/** Default content for `/projects/[projectId]`. */
export function ProjectWorkspaceHome({ projectId }: ProjectWorkspaceHomeProps) {
  const project = useProject({ projectId });

  useWorkspaceBreadcrumb([...WELCOME_BREADCRUMB]);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="" width={28} height={28} className="size-7" />
        <div>
          <p className="text-[15px] font-medium text-ws-text">
            {project?.name ?? "Your workspace"}
          </p>
          <p className="text-[12px] text-ws-text-muted">
            Click the logo in the header to rename or switch workspaces
          </p>
        </div>
      </div>

      <p className="mt-8 max-w-lg text-[13px] leading-relaxed text-ws-text-muted">
        Open a file from the project tree on the left, or add nested routes under{" "}
        <code className="rounded bg-ws-panel px-1.5 py-0.5 font-mono text-[12px] text-ws-text-secondary">
          /projects/{projectId}/
        </code>
        . Use Polaris AI on the right for code help and planning.
      </p>
    </div>
  );
}
