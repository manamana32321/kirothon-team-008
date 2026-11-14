import { db } from "@/db";
import { hashPassword, startSession } from "@/lib/auth";
import { error, isUniqueViolation, parseJson } from "@/lib/http";
import { signupSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const input = await parseJson(request, signupSchema);
  if ("response" in input) return input.response;
  const { username, password } = input.data;

  try {
    const user = await db.user.create({
      data: { username, passwordHash: await hashPassword(password) },
    });
    const cookie = await startSession(user.id);
    return Response.json(
      { user: { id: user.id, username: user.username } },
      { status: 201, headers: { "set-cookie": cookie } },
    );
  } catch (e) {
    if (isUniqueViolation(e)) return error(409, "이미 쓰는 닉네임입니다");
    throw e;
  }
}
