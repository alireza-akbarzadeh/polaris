/* eslint-disable react-hooks/purity */
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";


export function useProjects() {
  return useQuery(api.projects.getProject)
}
export function useProjectPartial({ limit }: { limit: number }) {
  return useQuery(api.projects.getPartial, { limit })
}
export function useCreateProject() {
  const { userId } = useAuth()
  return useMutation(api.projects.createProject).withOptimisticUpdate((localstore, args) => {
    const existingProjects = localstore.getQuery(api.projects.getProject);
    if (existingProjects !== undefined) {
      const now = Date.now();
      const newProject = {
        _id: crypto.randomUUID() as Id<"projects">,
        _creationTime: now,
        name: args.name,
        ownerId: userId ?? "anonymous",
        updatedAt: now,
      }
      localstore.setQuery(api.projects.getProject, {}, [...(existingProjects ?? []), newProject]);
    }
  });
}
