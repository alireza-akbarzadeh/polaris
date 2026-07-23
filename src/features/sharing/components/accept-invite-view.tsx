"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { Manrope } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type AcceptInviteViewProps = {
  token: string;
};

export function AcceptInviteView({ token }: AcceptInviteViewProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const invite = useQuery(api.sharing.getInviteByToken, { token });
  const acceptInvite = useMutation(api.sharing.acceptInviteByToken);
  const [accepting, setAccepting] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || invite === undefined || invite === null) return;
    if (invite.status === "accepted") {
      router.replace(`/projects/${invite.projectId}`);
      return;
    }
    if (invite.status !== "pending") return;
    if (attempted.current || accepting) return;

    attempted.current = true;
    setAccepting(true);
    void acceptInvite({ token })
      .then((result) => {
        toast.success(
          result.alreadyAccepted ? "You're already a member" : "Invite accepted",
        );
        router.replace(`/projects/${result.projectId}`);
      })
      .catch((error) => {
        attempted.current = false;
        setAccepting(false);
        toast.error(parseConvexErrorMessage(error, "Failed to accept invite"));
      });
  }, [acceptInvite, accepting, invite, isAuthenticated, router, token]);

  if (invite === undefined || authLoading) {
    return (
      <Shell>
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading invite…</p>
      </Shell>
    );
  }

  if (invite === null) {
    return (
      <Shell>
        <h1 className={cn(display.className, "text-2xl font-semibold")}>
          Invite not found
        </h1>
        <p className="text-sm text-muted-foreground">
          This link is invalid or has expired. Ask the project owner for a new
          invite.
        </p>
        <Button onClick={() => router.push("/projects")}>Go to projects</Button>
      </Shell>
    );
  }

  if (invite.status === "revoked") {
    return (
      <Shell>
        <h1 className={cn(display.className, "text-2xl font-semibold")}>
          Invite revoked
        </h1>
        <p className="text-sm text-muted-foreground">
          Access to <span className="text-foreground">{invite.projectName}</span>{" "}
          was revoked. Ask the owner to invite you again.
        </p>
        <Button onClick={() => router.push("/projects")}>Go to projects</Button>
      </Shell>
    );
  }

  if (invite.status === "accepted" && isAuthenticated) {
    return (
      <Shell>
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Opening project…</p>
      </Shell>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = `/invite/${token}`;
    if (invite.status === "accepted") {
      return (
        <Shell>
          <h1 className={cn(display.className, "text-2xl font-semibold")}>
            Invite already accepted
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to open{" "}
            <span className="text-foreground">{invite.projectName}</span>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </Shell>
      );
    }

    return (
      <Shell>
        <h1 className={cn(display.className, "text-2xl font-semibold")}>
          Join {invite.projectName}
        </h1>
        <p className="text-sm text-muted-foreground">
          You were invited as{" "}
          <span className="capitalize text-foreground">{invite.role}</span>
          {invite.email ? (
            <>
              {" "}
              for <span className="text-foreground">{invite.email}</span>
            </>
          ) : null}
          . Sign in to accept this invite.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
            <Button>Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
            <Button variant="outline">Create account</Button>
          </SignUpButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Accepting invite to {invite.projectName}…
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Image src="/logo.svg" alt="" width={40} height={40} className="size-10" />
      <div className="flex max-w-md flex-col items-center gap-4">{children}</div>
    </div>
  );
}
