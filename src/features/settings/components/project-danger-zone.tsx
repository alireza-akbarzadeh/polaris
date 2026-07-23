"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { useDeleteProject } from "@/features/projects/hooks/use-projects";
import { useProjectsDialog } from "@/features/projects/components/projects-dialog";

type ProjectDangerZoneProps = {
  projectId: string;
  projectName: string;
};

export function ProjectDangerZone({
  projectId,
  projectName,
}: ProjectDangerZoneProps) {
  const router = useRouter();
  const { openProjects } = useProjectsDialog();
  const deleteProject = useDeleteProject();
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const nameMatches = confirmName.trim() === projectName;

  async function handleDelete() {
    if (!nameMatches || deleting) return;

    setDeleting(true);
    try {
      await deleteProject({
        projectId: projectId as Id<"projects">,
        confirmName: confirmName.trim(),
      });
      toast.success("Project deleted");
      router.replace("/projects");
      openProjects();
    } catch (error) {
      toast.error(parseConvexErrorMessage(error, "Failed to delete project"));
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-md border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangleIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Danger zone
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Permanently delete{" "}
            <span className="font-medium text-foreground">{projectName}</span>
            . This removes all project files and cannot be undone.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-delete-name" className="text-[12px]">
          Type <span className="font-mono text-foreground">{projectName}</span>{" "}
          to confirm
        </Label>
        <Input
          id="confirm-delete-name"
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          placeholder={projectName}
          autoComplete="off"
          spellCheck={false}
          disabled={deleting}
          className="font-mono text-[13px]"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="destructive"
          loading={deleting}
          disabled={!nameMatches}
          onClick={() => void handleDelete()}
        >
          {deleting ? "Deleting…" : "Delete project"}
        </Button>
      </div>
    </section>
  );
}
