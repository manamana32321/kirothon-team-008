import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { requireGroupMember, requireMember } from "@/lib/auth";
import { CLIPS_DIR } from "@/lib/config";
import { clipDay, clipDayRange, hasVideo } from "@/lib/clip";
import { publish } from "@/lib/events";
import type { ClipHistory } from "@/lib/group-state";
import { error } from "@/lib/http";
import { clipDaySchema, clipMetaSchema } from "@/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireGroupMember(request, id);
  if ("response" in guard) return guard.response;

  const raw = new URL(request.url).searchParams.get("date");
  const parsed = raw === null ? null : clipDaySchema.safeParse(raw);
  if (parsed && !parsed.success) return error(400, "date는 YYYY-MM-DD 형식이어야 합니다");

  const all = await db.clip.findMany({ where: { groupId: id }, select: { createdAt: true } });
  const days = [...new Set(all.map((c) => clipDay(c.createdAt)))].sort().reverse();

  let members: ClipHistory["members"] = [];
  if (parsed) {
    const { start, end } = clipDayRange(parsed.data);
    const clips = await db.clip.findMany({
      where: { groupId: id, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
    });
    const byMember = Map.groupBy(clips, (c) => c.fromMemberId);
    members = [...byMember].map(([memberId, list]) => ({
      id: memberId,
      clips: list.map((c) => ({ id: c.id, mimeType: c.mimeType, hasVideo: c.hasVideo })),
    }));
  }

  const body: ClipHistory = { days, members };
  return Response.json(body);
}

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
    mimeType: file.type,
    size: file.size,
  });
  if (!parsed.success) {
    return Response.json({ error: "입력 오류", issues: parsed.error.issues }, { status: 400 });
  }
  const { fromMemberId, mimeType } = parsed.data;

  const owner = await requireMember(request, id, fromMemberId);
  if ("response" in owner) return owner.response;

  const clip = await db.clip.create({
    data: {
      groupId: id,
      fromMemberId,
      filePath: "",
      mimeType,
      hasVideo: hasVideo(mimeType),
    },
  });
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const filePath = path.join(/*turbopackIgnore: true*/ CLIPS_DIR, `${clip.id}.${ext}`);
  await mkdir(CLIPS_DIR, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  await db.clip.update({ where: { id: clip.id }, data: { filePath } });

  publish(id, "clip.created");
  return Response.json({ clipId: clip.id, hasVideo: clip.hasVideo }, { status: 201 });
}
