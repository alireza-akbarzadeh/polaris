import { WorkspaceNewProjectView } from "@/features/workspace/views/workspace-new-project-view";

export default async function ProjectNewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WorkspaceNewProjectView projectId={projectId} />;
}
