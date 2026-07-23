import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";

export function useProjectAccess(projectId: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.projects.getMyAccess,
    isAuthenticated
      ? { projectId: projectId as Id<"projects"> }
      : "skip",
  );
}

/** Accept email invites for the signed-in user once per session mount. */
export function useAcceptPendingInvites() {
  const { isAuthenticated } = useConvexAuth();
  const accept = useMutation(api.sharing.acceptPendingInvites);

  useEffect(() => {
    if (!isAuthenticated) return;
    void accept({});
  }, [accept, isAuthenticated]);
}
