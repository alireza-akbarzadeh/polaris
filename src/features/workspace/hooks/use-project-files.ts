import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

function asProjectId(projectId: string): Id<"projects"> {
  return projectId as Id<"projects">;
}

export function useProjectFiles(projectId: string) {
  return useQuery(api.projectFiles.listByProject, {
    projectId: asProjectId(projectId),
  });
}

export function useProjectFile(projectId: string, path: string) {
  return useQuery(
    api.projectFiles.getByPath,
    path
      ? { projectId: asProjectId(projectId), path }
      : "skip",
  );
}

export function useSeedProjectFiles() {
  return useMutation(api.projectFiles.seedDefaults);
}

export function useCreateProjectFile() {
  return useMutation(api.projectFiles.create);
}

export function useUpdateProjectFileContent() {
  return useMutation(api.projectFiles.updateContent);
}

export function useRenameProjectFile() {
  return useMutation(api.projectFiles.rename);
}

export function useMoveProjectFile() {
  return useMutation(api.projectFiles.move);
}

export function useDuplicateProjectFile() {
  return useMutation(api.projectFiles.duplicate);
}

export function useDeleteProjectFile() {
  return useMutation(api.projectFiles.remove);
}

export function useChangedFiles(projectId: string) {
  return useQuery(api.projectFiles.listChangedFiles, {
    projectId: asProjectId(projectId),
  });
}

export function useSetFileStaged() {
  return useMutation(api.projectFiles.setFileStaged);
}

export function useSetAllChangedStaged() {
  return useMutation(api.projectFiles.setAllChangedStaged);
}

export function useDiscardFileChanges() {
  return useMutation(api.projectFiles.discardFileChanges);
}
