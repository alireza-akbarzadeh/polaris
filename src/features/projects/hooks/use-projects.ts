/* eslint-disable react-hooks/purity */
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";


export function useProjects() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.projects.getProject, isAuthenticated ? {} : "skip");
}

export function useProject({ projectId }: { projectId: string }) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.projects.getProjectById,
    isAuthenticated
      ? { projectId: projectId as Id<"projects"> }
      : "skip",
  );
}
export function useProjectPartial({ limit }: { limit: number }) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.projects.getPartial,
    isAuthenticated ? { limit } : "skip",
  );
}

export function useProjectTemplates() {
  return useQuery(api.projects.listTemplates);
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
        source: "template" as const,
        templateId: args.templateId,
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

export function useDeleteProject() {
  return useMutation(api.projects.deleteProject).withOptimisticUpdate(
    (localstore, args) => {
      localstore.setQuery(
        api.projects.getProjectById,
        { projectId: args.projectId },
        null,
      );

      const projects = localstore.getQuery(api.projects.getProject);
      if (projects !== undefined) {
        localstore.setQuery(
          api.projects.getProject,
          {},
          projects.filter((item) => item._id !== args.projectId),
        );
      }
    },
  );
}
