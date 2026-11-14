"use client";

import { ChevronLeft, Flame, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { ClipRecorder } from "@/components/clip-recorder";
import { MemberCard } from "@/components/member-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PushButton } from "@/components/push-button";
import { shouldRing } from "@/lib/alarm";
import { send } from "@/lib/api-client";
import type { GroupEvent } from "@/lib/events";
import type { GroupState } from "@/lib/group-state";
import { useMe } from "@/lib/use-me";

const EVENTS: GroupEvent[] = [
  "group.updated",
  "response.created",
  "clip.created",
  "penalty.applied",
  "poke.sent",
];

const POKE_FEEDBACK_MS = 2_700;

function pokeOrigin(nickname: string) {
  const card = document.querySelector(`[data-nickname="${CSS.escape(nickname)}"]`);
  card?.scrollIntoView({ block: "nearest" });
  const rect = card?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : {};
}
const POKE_VIBRATION = [120, 60, 120, 60, 240];

function vibrate(pattern: number[]) {
  const native = (window as { GymcallNative?: { vibrate(pattern: string): void } }).GymcallNative;
  if (native) native.vibrate(pattern.join(","));
  else navigator.vibrate?.(pattern);
}
const POKE_TONES = [1046, 1318];
const STREAK_WINDOW_MS = 10_000;
const STREAK_TIERS = [5, 10, 20] as const;

function streakTier(streak: number) {
  if (streak >= STREAK_TIERS[2]) return "streak-t4";
  if (streak >= STREAK_TIERS[1]) return "streak-t3";
  if (streak >= STREAK_TIERS[0]) return "streak-t2";
  return "streak-t1";
}

export function GroupView({ id }: { id: string }) {
  const { me, reload } = useMe();
  if (me === undefined) return <p className="p-6">불러오는 중</p>;
  if (!me.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6 pt-12">
        <h1 className="text-[28px]">로그인하고 입장해요</h1>
        <AuthForm onDone={reload} />
      </main>
    );
  }
  const memberId = me.groups.find((g) => g.groupId === id)?.memberId;
  if (!memberId) return <JoinInline groupId={id} onJoined={reload} />;
  return <MemberGroupView id={id} memberId={memberId} />;
}

function MemberGroupView({ id, memberId }: { id: string; memberId: string }) {
  const [group, setGroup] = useState<GroupState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [soundReady, setSoundReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [respondedLocal, setRespondedLocal] = useState(false);
  const [myChoice, setMyChoice] = useState<"going" | "skipping" | null>(null);
  const [recording, setRecording] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [poked, setPoked] = useState<{ from: string; key: string; x?: number; y?: number } | null>(null);
  const pokeAudio = useRef<AudioContext | null>(null);
  const [sentNotice, setSentNotice] = useState("");
  const [bump, setBump] = useState(0);
  const [streak, setStreak] = useState(0);
  const memberIdRef = useRef(memberId);
  const seenPoke = useRef<string | null | undefined>(undefined);

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
      setPoked({ from: mine.fromNickname, key: mine.at, ...pokeOrigin(mine.fromNickname) });
    }
    seenPoke.current = at;
  }, [id]);

  useEffect(() => {
    const source = new EventSource(`/api/groups/${id}/events`);
    const reload = () => load();
    EVENTS.forEach((e) => source.addEventListener(e, reload));
    source.onopen = () => {
      reload();
    };
    return () => source.close();
  }, [id, load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = new AudioContext();
    pokeAudio.current = ctx;
    const sync = () => setSoundReady(ctx.state === "running");
    ctx.addEventListener("statechange", sync);
    ctx.resume().catch(() => {});
    const unlock = () => ctx.resume().catch(() => {});
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      ctx.removeEventListener("statechange", sync);
      ctx.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!poked) return;
    vibrate(POKE_VIBRATION);
    const ctx = pokeAudio.current;
    if (ctx && ctx.state === "running") {
      POKE_TONES.forEach((freq, i) => {
        const at = ctx.currentTime + i * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.1);
      });
    }
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
  const currentChoice =
    myChoice ?? (me?.status === "going" || me?.status === "skipping" ? me.status : null);
  const anyClipSound = !!group?.members.some((m) => m.id !== memberId && m.clip);

  useEffect(() => {
    const ctx = pokeAudio.current;
    if (!ringing || anyClipSound || !soundReady || !ctx) return;
    const beep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    };
    beep();
    const timer = setInterval(beep, 1000);
    return () => clearInterval(timer);
  }, [ringing, anyClipSound, soundReady]);

  if (loadError) return <p className="p-6">{loadError}</p>;
  if (!group) return <p className="p-6">불러오는 중</p>;

  if (!me) return <p className="p-6">불러오는 중</p>;

  async function respond(choice: "going" | "skipping") {
    if (me?.status === choice) return;
    setMyChoice(choice);
    const result = await send(`/api/groups/${id}/respond`, {
      method: "POST",
      json: { memberId: me!.id, choice },
    });
    if (result.error !== undefined) {
      setMyChoice(null);
      setSentNotice(result.error);
    } else setRespondedLocal(true);
    await load();
    setMyChoice(null);
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
          className={`pointer-events-none fixed inset-0 z-30 overflow-hidden ${rippleClass}`}
          style={
            (poked?.x !== undefined ? { "--rx": `${poked.x}px`, "--ry": `${poked.y}px` } : undefined) as
              | React.CSSProperties
              | undefined
          }
          aria-hidden
        >
          <span className="ripple-ring" />
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
          <div className="flex items-start gap-1">
            <Link
              href="/"
              aria-label="그룹 목록"
              title="그룹 목록"
              className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <p className="text-muted-foreground text-sm">운동기</p>
              <h1 className="text-[28px]">{group.name}</h1>
            </div>
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
          <Link href={`/g/${id}/settings`} className="bg-muted rounded-(--radius) border-[3px] border-foreground p-4 text-center font-medium">
            모임 시간을 정해 주세요
          </Link>
        ) : (
          <div className="bg-secondary flex -skew-x-[8deg] items-center justify-between gap-3 rounded-(--radius) border-[3px] border-foreground p-4 shadow-[3px_3px_0_var(--foreground)]">
            <div>
              <p className="text-muted-foreground text-xs">{ringing ? "알람 울리는 중" : "매일 알람"}</p>
              <p className="font-heading text-[44px] leading-none tabular-nums">{group.alarmTime}</p>
            </div>
            {ringing && !soundReady && (
              <p className="text-muted-foreground max-w-[9rem] text-right text-xs">화면을 한 번 누르면 소리가 나요</p>
            )}
          </div>
        )}

        <PushButton groupId={id} memberId={me.id} />

        <p role="status" className="sr-only">
          {poked ? `${poked.from}님이 찔렀어요` : ""}
        </p>

        <Tabs defaultValue="status">
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
                  poking={poked?.from === m.nickname}
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
                        {p.date} {p.nickname} · {p.reason === "skipping" ? "No Go" : "무응답"}
                      </span>
                      <span className="tabular-nums">-{p.points}P</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="bg-background fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-foreground pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 p-4">
          {group.alarmTime !== null && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant={currentChoice === "going" ? "default" : "outline"}
                aria-pressed={currentChoice === "going"}
                className={ringing ? "h-14 text-lg" : "h-11"}
                onClick={() => respond("going")}
              >
                Go
              </Button>
              <Button
                size="lg"
                variant={currentChoice === "skipping" ? "secondary" : "outline"}
                aria-pressed={currentChoice === "skipping"}
                className={ringing ? "h-14 text-lg" : "h-11"}
                onClick={() => respond("skipping")}
              >
                No Go
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
              className={`h-12 w-full -skew-x-[8deg] text-base shadow-[4px_4px_0_var(--foreground)] transition-transform active:scale-95 ${
                bump === 0 ? "" : bump % 2 ? "poke-bump-a" : "poke-bump-b"
              }`}
              disabled={selected.size === 0}
              onClick={poke}
            >
              {selected.size > 0 ? `찌르기 (${selected.size}명)` : "찌르기"}
            </Button>
          </div>
        </div>
      </div>

      {recording && <ClipRecorder groupId={id} fromMemberId={me.id} onClose={() => setRecording(false)} />}
    </>
  );
}

function JoinInline({ groupId, onJoined }: { groupId: string; onJoined: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    send<{ name: string }>(`/api/groups/${groupId}/preview`, { method: "GET" }).then((r) => {
      if (!live) return;
      if (r.error !== undefined) setError(r.error);
      else setName(r.data.name);
    });
    return () => {
      live = false;
    };
  }, [groupId]);

  async function join() {
    const result = await send("/api/groups/join", { method: "POST", json: { groupId } });
    if (result.error !== undefined) return setError(result.error);
    onJoined();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6 pt-12">
      <h1 className="text-[28px]">{name ? `${name}에 참여` : "그룹 참여"}</h1>
      <Button disabled={!name} onClick={join}>
        참여
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </main>
  );
}
