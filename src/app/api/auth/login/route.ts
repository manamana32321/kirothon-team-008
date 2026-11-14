import { db } from "@/db";
import { startSession, verifyPassword } from "@/lib/auth";
import { error, parseJson } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const input = await parseJson(request, loginSchema);
  if ("response" in input) return input.response;
  const { username, password } = input.data;

  const user = await db.user.findUnique({ where: { username } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return error(401, "닉네임 또는 비밀번호가 틀렸습니다");

  const cookie = await startSession(user.id);
  return Response.json(
    { user: { id: user.id, username: user.username } },
    { headers: { "set-cookie": cookie } },
  );
}
