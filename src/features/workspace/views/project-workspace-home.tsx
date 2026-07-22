"use client";

import { useEffect } from "react";
import Image from "next/image";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type ProjectWorkspaceHomeProps = {
  projectId: string;
};

/** Default content for `/projects/[projectId]`. */
export function ProjectWorkspaceHome({ projectId }: ProjectWorkspaceHomeProps) {
  const project = useProject({ projectId });
  const setBreadcrumb = useWorkspaceStore((s) => s.setBreadcrumb);

  useEffect(() => {
    setBreadcrumb([{ label: "Welcome" }]);
  }, [setBreadcrumb]);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="" width={28} height={28} className="size-7" />
        <div>
          <p className="text-[15px] font-medium text-[#dfdfdf]">
            {project?.name ?? "Your workspace"}
          </p>
          <p className="text-[12px] text-[#787878]">
            Click the logo in the header to rename or switch workspaces
          </p>
        </div>
      </div>

      <p className="mt-8 max-w-lg text-[13px] leading-relaxed text-[#9a9a9a]">
        Open a file from the project tree on the left, or add nested routes under{" "}
        <code className="rounded bg-[#2b2d30] px-1.5 py-0.5 font-mono text-[12px] text-[#bcbec4]">
          /projects/{projectId}/
        </code>
        . Use Polaris AI on the right for code help and planning.
      </p>
    </div>
  );
}
