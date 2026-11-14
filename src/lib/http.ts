import { z } from "zod";

export function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: error(400, "JSON 본문이 필요합니다") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: Response.json({ error: "입력 오류", issues: parsed.error.issues }, { status: 400 }) };
  }
  return { data: parsed.data };
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}
