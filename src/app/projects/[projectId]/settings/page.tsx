import { WorkspaceSettingsView } from "@/features/workspace/views/workspace-settings-view";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WorkspaceSettingsView projectId={projectId} />;
}
