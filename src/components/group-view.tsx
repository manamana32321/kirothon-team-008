"use client";

import { Flame, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipRecorder } from "@/components/clip-recorder";
import { MeetupTab } from "@/components/meetup-tab";
import { MemberCard } from "@/components/member-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shouldRing } from "@/lib/alarm";
import { send } from "@/lib/api-client";
import type { GroupEvent } from "@/lib/events";
import { type GroupState, LAST_GROUP_KEY, memberKey } from "@/lib/group-state";
import { useLocationSharing } from "@/lib/use-location-sharing";

const EVENTS: GroupEvent[] = [
  "group.updated",
  "response.created",
  "clip.created",
  "penalty.applied",
  "poke.sent",
];

const POKE_FEEDBACK_MS = 2_700;
const STREAK_WINDOW_MS = 10_000;
const STREAK_TIERS = [5, 10, 20] as const;

function streakTier(streak: number) {
  if (streak >= STREAK_TIERS[2]) return "streak-t4";
  if (streak >= STREAK_TIERS[1]) return "streak-t3";
  if (streak >= STREAK_TIERS[0]) return "streak-t2";
  return "streak-t1";
}

export function GroupView({ id }: { id: string }) {
  const [group, setGroup] = useState<GroupState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [memberId, setMemberId] = useState<string | null | undefined>(() =>
    typeof window === "undefined" ? undefined : localStorage.getItem(memberKey(id)),
  );
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [respondedLocal, setRespondedLocal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [poked, setPoked] = useState<{ from: string; key: string } | null>(null);
  const [sentNotice, setSentNotice] = useState("");
  const [bump, setBump] = useState(0);
  const [streak, setStreak] = useState(0);
  const [locationVersion, setLocationVersion] = useState(0);
  const sharing = useLocationSharing(id, memberId ?? "", group?.alarmTime ?? null);
  const memberIdRef = useRef(memberId);
  const seenPoke = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (memberId) localStorage.setItem(LAST_GROUP_KEY, id);
  }, [id, memberId]);

  useEffect(() => {
    memberIdRef.current = memberId;
  }, [memberId]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`, { cache: "no-store" });
    if (!res.ok) return setLoadError("그룹을 찾을 수 없어요.");
    const next: GroupState = await res.json();
    setGroup(next);
    const mine = next.members.find((m) => m.id === memberIdRef.current)?.lastPoke ?? null;
    const at = mine?.at ?? null;
    if (seenPoke.current !== undefined && mine && at !== seenPoke.current) {
      setPoked({ from: mine.fromNickname, key: mine.at });
    }
    seenPoke.current = at;
  }, [id]);

  useEffect(() => {
    const source = new EventSource(`/api/groups/${id}/events`);
    const reload = () => load();
    EVENTS.forEach((e) => source.addEventListener(e, reload));
    source.addEventListener("location.updated", () => setLocationVersion((v) => v + 1));
    source.onopen = () => {
      reload();
      setLocationVersion((v) => v + 1);
    };
    return () => source.close();
  }, [id, load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!poked) return;
    const timer = setTimeout(() => setPoked(null), POKE_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [poked]);

  useEffect(() => {
    if (!sentNotice) return;
    const timer = setTimeout(() => setSentNotice(""), 2_000);
    return () => clearTimeout(timer);
  }, [sentNotice]);

  useEffect(() => {
    if (streak === 0) return;
    const timer = setTimeout(() => setStreak(0), STREAK_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [streak, bump]);

  const me = group?.members.find((m) => m.id === memberId);
  const responded = respondedLocal || me?.status === "going" || me?.status === "skipping";
  const ringing = !!group && !!me && shouldRing(now, group.alarmTime, responded);
  const anyClipSound = !!group?.members.some((m) => m.id !== memberId && m.clip);

  useEffect(() => {
    if (!ringing || anyClipSound || !audio) return;
    const beep = () => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.4);
    };
    beep();
    const timer = setInterval(beep, 1000);
    return () => clearInterval(timer);
  }, [ringing, anyClipSound, audio]);

  if (loadError) return <p className="p-6">{loadError}</p>;
  if (!group || memberId === undefined) return <p className="p-6">불러오는 중</p>;

  if (!me) {
    return (
      <JoinInline
        group={group}
        onJoined={(mid) => {
          localStorage.setItem(memberKey(id), mid);
          localStorage.setItem(LAST_GROUP_KEY, id);
          setMemberId(mid);
        }}
      />
    );
  }

  async function armAlarm() {
    const ctx = new AudioContext();
    await ctx.resume();
    setAudio(ctx);
  }

  async function respond(choice: "going" | "skipping") {
    const result = await send(`/api/groups/${id}/respond`, {
      method: "POST",
      json: { memberId: me!.id, choice },
    });
    if (result.error === undefined || result.error.includes("이미")) setRespondedLocal(true);
    await load();
  }

  function poke() {
    const toMemberIds = [...selected];
    setStreak((s) => s + 1);
    setBump((n) => n + 1);
    send(`/api/groups/${id}/poke`, {
      method: "POST",
      json: { fromMemberId: me!.id, toMemberIds },
    }).then((result) => {
      if (result.error === undefined) return;
      setStreak((s) => Math.max(0, s - 1));
      setSentNotice(result.error);
    });
  }

  function toggle(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  const penaltyOn = group.penaltyPoints > 0 || group.penalties.length > 0;
  const rippleClass = poked ? "ripple-strong" : ringing ? "ripple-calm" : "";
  const ordered = [me, ...group.members.filter((m) => m.id !== me.id)];

  return (
    <>
      {rippleClass && (
        <div
          key={poked?.key ?? "calm"}
          className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${rippleClass}`}
          aria-hidden
        >
          <span className="ripple-ring" />
          <span className="ripple-ring" />
          <span className="ripple-ring" />
        </div>
      )}

      <main
        className={`relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-40 ${
          poked ? "poke-shake" : ""
        }`}
      >
        <header className="flex items-start justify-between pt-4">
          <div>
            <p className="text-muted-foreground text-sm">운동기</p>
            <h1 className="text-2xl font-bold">{group.name}</h1>
          </div>
          <Link
            href={`/g/${id}/settings`}
            aria-label="모임 설정"
            title="모임 설정"
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            <Settings className="size-5" />
          </Link>
        </header>

        {group.alarmTime === null ? (
          <Link href={`/g/${id}/settings`} className="bg-muted rounded-lg p-4 text-center font-medium">
            모임 시간을 정해 주세요
          </Link>
        ) : (
          <div className="bg-background/80 flex items-center justify-between gap-3 rounded-lg border p-4 backdrop-blur">
            <div>
              <p className="text-muted-foreground text-xs">{ringing ? "알람 울리는 중" : "매일 알람"}</p>
              <p className="text-3xl font-bold tabular-nums">{group.alarmTime}</p>
            </div>
            <Button onClick={armAlarm} disabled={audio !== null} size="lg">
              {audio ? "알람 켜짐" : "알람 켜기"}
            </Button>
          </div>
        )}

        {poked && (
          <p role="status" className="bg-primary text-primary-foreground rounded-lg p-3 text-center font-semibold">
            {poked.from}님이 찔렀어요
          </p>
        )}

        <Tabs defaultValue="status">
          <TabsList className="w-full">
            <TabsTrigger value="status">현황</TabsTrigger>
            <TabsTrigger value="map">지도{sharing.on ? " · 공유 중" : ""}</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {ordered.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isMe={m.id === me.id}
                  selected={selected.has(m.id)}
                  audible={ringing && m.id !== me.id}
                  showPoints={penaltyOn}
                  onToggle={() => toggle(m.id)}
                  onRecord={() => setRecording(true)}
                />
              ))}
            </div>

            {penaltyOn && (
              <Card>
                <CardHeader>
                  <CardTitle>벌금 장부</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <p className="text-muted-foreground text-xs">가상 포인트예요. 실제 결제가 아니에요.</p>
                  {group.penalties.length === 0 && <p className="text-muted-foreground">아직 차감이 없어요.</p>}
                  {group.penalties.map((p) => (
                    <p key={`${p.memberId}-${p.date}`} className="flex justify-between">
                      <span>
                        {p.date} {p.nickname} · {p.reason === "skipping" ? "못 간다" : "무응답"}
                      </span>
                      <span className="tabular-nums">-{p.points}P</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="map">
            <MeetupTab
              group={group}
              meId={me.id}
              now={now}
              locationVersion={locationVersion}
              sharing={sharing}
            />
          </TabsContent>
        </Tabs>
      </main>

      <div className="bg-background/90 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 p-4">
          {ringing && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" className="h-14 text-lg" onClick={() => respond("going")}>
                간다
              </Button>
              <Button size="lg" variant="secondary" className="h-14 text-lg" onClick={() => respond("skipping")}>
                못 간다
              </Button>
            </div>
          )}
          {sentNotice && <p className="text-muted-foreground text-center text-sm">{sentNotice}</p>}
          <div className="relative">
            {streak >= 2 && (
              <span aria-live="polite" className="pointer-events-none absolute -top-3 -left-2 z-10">
                <span className={`streak-scale ${streakTier(streak)}`}>
                  <span className="streak-badge px-2.5 py-0.5 font-black text-white tabular-nums">
                  <span className="streak-bg streak-bg-1" />
                  <span className="streak-bg streak-bg-2" />
                  <span className="streak-bg streak-bg-3" />
                  <span className="streak-bg streak-bg-4" />
                  <span className="streak-content">
                    <Flame className="streak-flame size-4" aria-hidden />
                    <span key={streak} className="streak-num">
                      {streak}
                    </span>
                    연타
                  </span>
                  {(STREAK_TIERS as readonly number[]).includes(streak) && (
                    <span key={`burst-${streak}`} className="streak-burst" />
                  )}
                  </span>
                </span>
              </span>
            )}
            <Button
              size="lg"
              variant={ringing ? "outline" : "default"}
              className={`h-12 w-full text-base transition-transform active:scale-95 ${
                bump === 0 ? "" : bump % 2 ? "poke-bump-a" : "poke-bump-b"
              }`}
              disabled={selected.size === 0}
              onClick={poke}
            >
              {selected.size > 0 ? `찌르기 (${selected.size}명)` : "친구를 골라 찌르기"}
            </Button>
          </div>
        </div>
      </div>

      {recording && <ClipRecorder groupId={id} fromMemberId={me.id} onClose={() => setRecording(false)} />}
    </>
  );
}

function JoinInline({ group, onJoined }: { group: GroupState; onJoined: (memberId: string) => void }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  async function join() {
    const result = await send<{ memberId: string }>("/api/groups/join", {
      method: "POST",
      json: { inviteCode: group.inviteCode, nickname },
    });
    if (result.error !== undefined) return setError(result.error);
    onJoined(result.data.memberId);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6 pt-12">
      <h1 className="text-2xl font-bold">{group.name}에 참여</h1>
      <div className="flex gap-2">
        <Input placeholder="내 닉네임" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
        <Button disabled={!nickname.trim()} onClick={join}>
          참여
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </main>
  );
}
