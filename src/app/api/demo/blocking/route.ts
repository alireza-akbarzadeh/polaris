import { inngest } from "@/inngest/client";

export async function POST() {
  await inngest.send({
    name: "demo/blocking",
    data: {
      email: "test@example.com",
    },
  });

  return Response.json({ message: "Event sent" });
}
