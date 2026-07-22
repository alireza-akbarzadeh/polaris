"use client";

import { useEffect } from "react";

import { filePathToBreadcrumb } from "@/features/workspace/lib/sample-files";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
import type { BreadcrumbSegment } from "@/features/workspace/store/workspace-store";

function breadcrumbKey(segments: BreadcrumbSegment[]) {
  return segments.map((s) => `${s.label}:${s.href ?? ""}`).join("|");
}

/** Syncs workspace breadcrumb (and editor tab title) to the current view. */
export function useWorkspaceBreadcrumb(segments: BreadcrumbSegment[]) {
  const setBreadcrumb = useWorkspaceStore((s) => s.setBreadcrumb);
  const key = breadcrumbKey(segments);

  useEffect(() => {
    setBreadcrumb(segments);
  }, [setBreadcrumb, key]);
}

/** Sets breadcrumb from a project file path like `src/app/page.tsx`. */
export function useFileBreadcrumb(projectId: string, filePath: string) {
  const setBreadcrumb = useWorkspaceStore((s) => s.setBreadcrumb);

  useEffect(() => {
    if (!filePath) {
      setBreadcrumb([]);
      return;
    }
    setBreadcrumb(filePathToBreadcrumb(projectId, filePath));
  }, [projectId, filePath, setBreadcrumb]);
}
