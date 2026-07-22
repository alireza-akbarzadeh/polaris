import { ProjectWorkspaceHome } from "@/features/workspace/views/project-workspace-home";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspaceHome projectId={projectId} />;
}
