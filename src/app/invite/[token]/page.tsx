import { AcceptInviteView } from "@/features/sharing/components/accept-invite-view";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <AcceptInviteView token={token} />;
}
