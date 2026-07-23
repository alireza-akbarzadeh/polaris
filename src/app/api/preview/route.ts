import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPreviewDocument } from "@/features/workspace/lib/preview-document.server";

const previewRequestSchema = z.object({
  files: z.record(z.string(), z.string()),
  activePath: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = previewRequestSchema.parse(await request.json());
    const html = await buildPreviewDocument({
      files: body.files,
      activePath: body.activePath,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
