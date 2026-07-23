import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

export function useProjectAccess(projectId: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.projects.getMyAccess,
    isAuthenticated
      ? { projectId: projectId as Id<"projects"> }
      : "skip",
  );
}

/**
 * Accept email invites for the signed-in user.
 * Uses Clerk emails via a Convex action (JWT often has no email claim).
 */
export function useAcceptPendingInvites() {
  const { isAuthenticated } = useConvexAuth();
  const syncMyInvites = useAction(api.sharing.syncMyInvites);
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || ran.current) return;
    ran.current = true;
    void syncMyInvites({}).catch(() => {
      // Allow retry on next mount if Clerk/Convex env isn't ready yet.
      ran.current = false;
    });
  }, [isAuthenticated, syncMyInvites]);
}
