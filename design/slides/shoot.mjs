import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = "https://gymcall.json-server.win";
const OUT = process.argv[2];
const PW = "shot-pass-" + Date.now();
const sfx = String(Date.now()).slice(-3);
const names = { a: `새벽곰${sfx}`, b: `아침여우${sfx}`, c: `늦잠거북${sfx}` };

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const mk = async () =>
  browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ko-KR", timezoneId: "Asia/Seoul" });

const ctx = { a: await mk(), b: await mk(), c: await mk() };
for (const k of ["a", "b", "c"]) {
  const r = await ctx[k].request.post(`${BASE}/api/auth/signup`, { data: { username: names[k], password: PW } });
  if (!r.ok()) throw new Error(`signup ${k} ${r.status()} ${await r.text()}`);
}
const g = await (await ctx.a.request.post(`${BASE}/api/groups`, { data: { name: "새벽 헬스" } })).json();
const mem = { a: g.memberId };
for (const k of ["b", "c"]) {
  const j = await (await ctx[k].request.post(`${BASE}/api/groups/join`, { data: { inviteCode: g.inviteCode } })).json();
  mem[k] = j.memberId;
}
for (const [k, file] of [["a", "clip-a.webm"], ["b", "clip-b.webm"]]) {
  const r = await ctx[k].request.post(`${BASE}/api/groups/${g.groupId}/clips`, {
    multipart: { fromMemberId: mem[k], file: { name: file, mimeType: "video/webm", buffer: fs.readFileSync(`${OUT}/${file}`) } },
  });
  if (!r.ok()) throw new Error(`clip ${k} ${r.status()}`);
}
const t = new Date(Date.now() - 60_000);
const hhmm = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
await ctx.a.request.put(`${BASE}/api/groups/${g.groupId}/alarm`, { data: { alarmTime: hhmm, penaltyPoints: 10 } });

const pa = await ctx.a.newPage();
await pa.goto(`${BASE}/g/${g.groupId}`, { waitUntil: "load" });
await pa.waitForTimeout(3500);
await pa.screenshot({ path: `${OUT}/s1-ringing.png` });

const cards = pa.locator('[aria-pressed]');
const n = await cards.count();
for (let i = 0; i < n; i++) {
  const label = (await cards.nth(i).getAttribute("aria-label")) || "";
  if (label.includes(names.c)) await cards.nth(i).click();
}
await pa.waitForTimeout(600);
await pa.screenshot({ path: `${OUT}/s2-selected.png` });

const pc = await ctx.c.newPage();
await pc.goto(`${BASE}/g/${g.groupId}`, { waitUntil: "load" });
await pc.waitForTimeout(2500);
const pokeBtn = pa.getByRole("button", { name: /찌르기/ });
for (let i = 0; i < 6; i++) {
  await pokeBtn.click();
  await pa.waitForTimeout(150);
}
await pa.waitForTimeout(400);
await pa.screenshot({ path: `${OUT}/s3-streak.png` });
await pc.waitForTimeout(700);
await pc.screenshot({ path: `${OUT}/s4-poked.png` });

await ctx.b.request.post(`${BASE}/api/groups/${g.groupId}/respond`, { data: { memberId: mem.b, choice: "going" } });
const ps = await ctx.a.newPage();
await ps.goto(`${BASE}/g/${g.groupId}/settings`, { waitUntil: "load" });
await ps.waitForTimeout(2500);
await ps.screenshot({ path: `${OUT}/s5-settings.png`, fullPage: true });

console.log(JSON.stringify({ group: g.groupId, code: g.inviteCode, names }));
await browser.close();
