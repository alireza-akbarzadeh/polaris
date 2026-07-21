import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";


export function useProjects() {
  return useQuery(api.projects.getProject)
}
export function useProjectPartial({ limit }: { limit: number }) {
  return useQuery(api.projects.getPartial, { limit })
}
