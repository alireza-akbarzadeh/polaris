import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseLiveblocksRoomId } from "@/features/workspace/lib/liveblocks-room-id";
import { colorForUserIdClient } from "@/features/workspace/lib/collaborator-color";

function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured");
  }
  return new Liveblocks({ secret });
}

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    const body = (await request.json()) as { room?: string };
    const roomId = body.room?.trim();
    if (!roomId) {
      return new NextResponse("Missing room", { status: 400 });
    }

    const parsed = parseLiveblocksRoomId(roomId);
    if (!parsed) {
      return new NextResponse("Invalid room", { status: 400 });
    }

    const convexToken = await getToken({ template: "convex" });
    if (!convexToken) {
      return new NextResponse("Missing Convex auth token", { status: 401 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return new NextResponse("Convex URL not configured", { status: 500 });
    }

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(convexToken);
    const access = await convex.query(api.projects.getMyAccess, {
      projectId: parsed.projectId as Id<"projects">,
    });

    if (!access) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const name =
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress ||
      userId;
    const color = colorForUserIdClient(userId);

    const liveblocks = getLiveblocks();
    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name,
        avatar: user?.imageUrl,
        color,
      },
    });

    if (access.canEdit) {
      session.allow(roomId, session.FULL_ACCESS);
    } else {
      session.allow(roomId, session.READ_ACCESS);
    }

    const { status, body: authBody } = await session.authorize();
    return new NextResponse(authBody, { status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Liveblocks auth failed";
    console.error("[liveblocks-auth]", message);
    return new NextResponse(message, { status: 500 });
  }
}
