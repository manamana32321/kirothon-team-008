import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const STATE_FILE = path.join("data", "mock.json");
const MOCK_PASSWORD = "mock-password";

const MOCK_MEMBERS = [
  { nickname: "지아", color: "ff7ad9" },
  { nickname: "태호", color: "ffe14d" },
  { nickname: "하늘", color: "5ee6ff" },
];

type MockMember = { memberId: string; cookie: string };
type MockState = { groupId: string; inviteCode: string; members: Record<string, MockMember> };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function request(method: string, route: string, cookie: string | null, body?: unknown) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined && !(body instanceof FormData)) headers["content-type"] = "application/json";
  return fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
}

async function call<T>(method: string, route: string, cookie: string | null, body?: unknown): Promise<T> {
  const res = await request(method, route, cookie, body);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

async function signIn(username: string): Promise<string> {
  const payload = { username, password: MOCK_PASSWORD };
  let res = await request("POST", "/api/auth/signup", null, payload);
  if (res.status === 409) res = await request("POST", "/api/auth/login", null, payload);
  if (!res.ok) throw new Error(`sign in ${username} ${res.status} ${await res.text()}`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`sign in ${username}: 쿠키 없음`);
  return cookie;
}

function makeClip(color: string): Buffer | null {
  try {
    return execFileSync(
      "ffmpeg",
      ["-v", "error", "-f", "lavfi", "-i", `color=c=0x${color}:s=240x320:d=3:r=15`, "-c:v", "libvpx", "-b:v", "200k", "-an", "-f", "webm", "-"],
      { maxBuffer: 8 * 1024 * 1024 },
    );
  } catch {
    return null;
  }
}

async function seed() {
  const alarmTime = arg("alarm") ?? "06:30";
  const cookies: Record<string, string> = {};
  for (const m of MOCK_MEMBERS) cookies[m.nickname] = await signIn(m.nickname);

  const owner = MOCK_MEMBERS[0].nickname;
  const created = await call<{ groupId: string; inviteCode: string; memberId: string }>(
    "POST",
    "/api/groups",
    cookies[owner],
    { name: "[검증] 목업" },
  );
  const members: Record<string, MockMember> = { [owner]: { memberId: created.memberId, cookie: cookies[owner] } };
  for (const m of MOCK_MEMBERS.slice(1)) {
    const joined = await call<{ memberId: string }>("POST", "/api/groups/join", cookies[m.nickname], {
      inviteCode: created.inviteCode,
    });
    members[m.nickname] = { memberId: joined.memberId, cookie: cookies[m.nickname] };
  }
  await call("PUT", `/api/groups/${created.groupId}/alarm`, cookies[owner], { alarmTime, penaltyPoints: 10 });

  let clips = 0;
  for (const m of MOCK_MEMBERS) {
    const clip = makeClip(m.color);
    if (!clip) continue;
    const form = new FormData();
    form.set("fromMemberId", members[m.nickname].memberId);
    form.set("file", new File([new Uint8Array(clip)], "mock.webm", { type: "video/webm" }));
    await call("POST", `/api/groups/${created.groupId}/clips`, members[m.nickname].cookie, form);
    clips++;
  }

  mkdirSync("data", { recursive: true });
  const state: MockState = { groupId: created.groupId, inviteCode: created.inviteCode, members };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`group   ${BASE_URL}/g/${created.groupId}`);
  console.log(`invite  ${created.inviteCode}`);
  console.log(`members ${MOCK_MEMBERS.map((m) => m.nickname).join(", ")} (비밀번호 ${MOCK_PASSWORD})`);
  console.log(`alarm   ${alarmTime}`);
  console.log(`clips   ${clips}/${MOCK_MEMBERS.length}${clips === 0 ? " (ffmpeg 또는 libvpx 없음)" : ""}`);
}

async function poke() {
  const state: MockState = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  const groupId = arg("group") ?? state.groupId;
  const every = Number(arg("every") ?? 5);
  const times = Number(arg("times") ?? Infinity);
  const only = arg("to");
  const senders = Object.entries(state.members);
  const mockIds = new Set(senders.map(([, m]) => m.memberId));

  for (let n = 0; n < times; n++) {
    const group = await call<{ members: { id: string; nickname: string }[] }>(
      "GET",
      `/api/groups/${groupId}`,
      senders[0][1].cookie,
    );
    const targets = group.members.filter((m) => (only ? m.nickname === only : !mockIds.has(m.id)));
    const candidates = senders.filter(([, s]) => !targets.some((t) => t.id === s.memberId));
    if (targets.length === 0) {
      console.log("찌를 사람이 없음. 브라우저에서 입장 후 다시 실행하세요.");
    } else if (candidates.length === 0) {
      console.log("보낼 목업 멤버가 없음.");
    } else {
      const [nickname, sender] = candidates[n % candidates.length];
      await call("POST", `/api/groups/${groupId}/poke`, sender.cookie, {
        fromMemberId: sender.memberId,
        toMemberIds: targets.map((t) => t.id),
      });
      console.log(`${new Date().toLocaleTimeString()} ${nickname} -> ${targets.map((t) => t.nickname).join(", ")}`);
    }
    if (n + 1 < times) await new Promise((r) => setTimeout(r, every * 1000));
  }
}

const commands: Record<string, () => Promise<void>> = { seed, poke };
const run = commands[process.argv[2]];
if (!run) {
  console.error("usage: tsx scripts/mock.ts <seed|poke> [--alarm HH:MM] [--group id] [--to nickname] [--every sec] [--times n]");
  process.exit(1);
}
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
