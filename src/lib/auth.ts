import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { error } from "@/lib/http";

export const SESSION_COOKIE = "gymcall_session";
const SESSION_DAYS = 90;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
const KEY_LEN = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieAttrs(maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.authSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  });
  return `${SESSION_COOKIE}=${token}; ${cookieAttrs(SESSION_MAX_AGE)}`;
}

export function clearCookie() {
  return `${SESSION_COOKIE}=; ${cookieAttrs(0)}`;
}

export function readToken(request: Request) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function endSession(request: Request) {
  const token = readToken(request);
  if (token) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function currentUser(request: Request) {
  const token = readToken(request);
  if (!token) return null;
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.user;
}

export async function requireUser(request: Request) {
  const user = await currentUser(request);
  if (!user) return { response: error(401, "로그인이 필요합니다") };
  return { user };
}

export async function requireMember(request: Request, groupId: string, memberId: string) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth;
  const member = await db.member.findFirst({
    where: { id: memberId, groupId, userId: auth.user.id },
  });
  if (!member) return { response: error(403, "내 멤버가 아닙니다") };
  return { user: auth.user, member };
}
