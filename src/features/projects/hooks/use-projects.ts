/* eslint-disable react-hooks/purity */
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";


export function useProjects() {
  return useQuery(api.projects.getProject)
}

export function useProject({ projectId }: { projectId: string }) {
  return useQuery(api.projects.getProjectById, { projectId: projectId as Id<"projects"> })
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

export function useUpdateProject() {
  return useMutation(api.projects.updateProject).withOptimisticUpdate(
    (localstore, args) => {
      const now = Date.now();
      const project = localstore.getQuery(api.projects.getProjectById, {
        projectId: args.projectId,
      });
      if (project !== undefined && project !== null) {
        localstore.setQuery(
          api.projects.getProjectById,
          { projectId: args.projectId },
          { ...project, name: args.name, updatedAt: now },
        );
      }

      const projects = localstore.getQuery(api.projects.getProject);
      if (projects !== undefined) {
        localstore.setQuery(
          api.projects.getProject,
          {},
          projects.map((item) =>
            item._id === args.projectId
              ? { ...item, name: args.name, updatedAt: now }
              : item,
          ),
        );
      }
    },
  );
}

