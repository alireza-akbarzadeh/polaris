import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPreviewDocument } from "@/features/workspace/lib/preview-document.server";

const previewRequestSchema = z.object({
  code: z.string(),
  filePath: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = previewRequestSchema.parse(await request.json());
    const html = await buildPreviewDocument(body.code, body.filePath);

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
