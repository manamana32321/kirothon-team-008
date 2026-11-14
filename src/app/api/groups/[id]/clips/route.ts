import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { CLIPS_DIR } from "@/lib/config";
import { hasVideo } from "@/lib/clip";
import { publish } from "@/lib/events";
import { error } from "@/lib/http";
import { clipMetaSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "multipart 본문이 필요합니다");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return error(400, "file 필드가 필요합니다");

  const parsed = clipMetaSchema.safeParse({
    fromMemberId: form.get("fromMemberId"),
    toMemberId: form.get("toMemberId"),
    mimeType: file.type,
    size: file.size,
  });
  if (!parsed.success) {
    return Response.json({ error: "입력 오류", issues: parsed.error.issues }, { status: 400 });
  }
  const { fromMemberId, toMemberId, mimeType } = parsed.data;

  const count = await db.member.count({
    where: { groupId: id, id: { in: [fromMemberId, toMemberId] } },
  });
  if (count !== new Set([fromMemberId, toMemberId]).size) {
    return error(404, "그룹에 없는 멤버입니다");
  }

  const clip = await db.clip.create({
    data: {
      groupId: id,
      fromMemberId,
      toMemberId,
      filePath: "",
      mimeType,
      hasVideo: hasVideo(mimeType),
    },
  });
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const filePath = path.join(CLIPS_DIR, `${clip.id}.${ext}`);
  await mkdir(CLIPS_DIR, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  await db.clip.update({ where: { id: clip.id }, data: { filePath } });

  publish(id, "clip.created");
  return Response.json({ clipId: clip.id, hasVideo: clip.hasVideo }, { status: 201 });
}
