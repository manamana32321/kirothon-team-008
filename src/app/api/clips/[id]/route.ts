import { readFile } from "node:fs/promises";
import { db } from "@/db";
import { error } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clip = await db.clip.findUnique({ where: { id } });
  if (!clip || !clip.filePath) return error(404, "없는 클립입니다");

  let body: Buffer;
  try {
    body = await readFile(clip.filePath);
  } catch {
    return error(404, "클립 파일이 없습니다");
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": clip.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
