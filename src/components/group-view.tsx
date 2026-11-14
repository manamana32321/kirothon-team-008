"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlarmOverlay } from "@/components/alarm-overlay";
import { ClipRecorder } from "@/components/clip-recorder";
import { MeetupTab } from "@/components/meetup-tab";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shouldRing } from "@/lib/alarm";
import { send } from "@/lib/api-client";
import type { AttendanceStatus } from "@/lib/attendance";
import type { GroupEvent } from "@/lib/events";
import { type GroupState, memberKey } from "@/lib/group-state";
import { useLocationSharing } from "@/lib/use-location-sharing";

const EVENTS: GroupEvent[] = ["group.updated", "response.created", "clip.created", "penalty.applied"];

const STATUS: Record<AttendanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "응답 전", variant: "outline" },
  going: { label: "간다", variant: "default" },
  skipping: { label: "못 간다", variant: "secondary" },
  no_response: { label: "무응답", variant: "destructive" },
};

const ARRIVED = { label: "도착", variant: "default" } as const;

export function GroupView({ id }: { id: string }) {
  const [group, setGroup] = useState<GroupState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [memberId, setMemberId] = useState<string | null | undefined>(() =>
    typeof window === "undefined" ? undefined : localStorage.getItem(memberKey(id)),
  );
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [respondedLocal, setRespondedLocal] = useState(false);
  const [target, setTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [locationVersion, setLocationVersion] = useState(0);
  const sharing = useLocationSharing(id, memberId ?? "", group?.alarmTime ?? null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`, { cache: "no-store" });
    if (!res.ok) return setLoadError("그룹을 찾을 수 없어요.");
    setGroup(await res.json());
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

  if (loadError) return <p className="p-6">{loadError}</p>;
  if (!group || memberId === undefined) return <p className="p-6">불러오는 중</p>;

  const me = group.members.find((m) => m.id === memberId);
  if (!me) {
    return (
      <JoinInline
        group={group}
        onJoined={(mid) => {
          localStorage.setItem(memberKey(id), mid);
          setMemberId(mid);
        }}
      />
    );
  }

  const responded = respondedLocal || me.status === "going" || me.status === "skipping";
  const ringing = shouldRing(now, group.alarmTime, responded);

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

  const penaltyOn = group.penaltyPoints > 0 || group.penalties.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
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
        <Link
          href={`/g/${id}/settings`}
          className="bg-muted rounded-lg p-4 text-center font-medium"
        >
          모임 시간을 정해 주세요
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="text-muted-foreground text-xs">매일 알람</p>
            <p className="text-3xl font-bold tabular-nums">{group.alarmTime}</p>
          </div>
          <Button onClick={armAlarm} disabled={audio !== null} size="lg">
            {audio ? "알람 켜짐" : "알람 켜기"}
          </Button>
        </div>
      )}
      {group.alarmTime !== null && !audio && (
        <p className="text-muted-foreground -mt-2 text-xs">알람은 이 탭이 열려 있을 때만 울려요.</p>
      )}

      {me.nextClip && !responded && (
        <p className="bg-muted rounded-md p-3 text-sm">
          {me.nextClip.fromNickname}님이 보낸 {me.nextClip.hasVideo ? "영상" : "음성"}이 다음 알람에 울려요.
        </p>
      )}

      <Tabs defaultValue="status">
        <TabsList className="w-full">
          <TabsTrigger value="status">현황</TabsTrigger>
          <TabsTrigger value="map">지도{sharing.on ? " · 공유 중" : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="status" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>오늘 ({group.date})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {group.members.map((m) => {
                const s = m.source === "auto" ? ARRIVED : STATUS[m.status];
                const canWake = m.id !== me.id && (m.status === "pending" || m.status === "no_response");
                return (
                  <div key={m.id} className="flex items-center gap-2 py-2">
                    <span className="flex-1 font-medium">
                      {m.nickname}
                      {m.id === me.id && <span className="text-muted-foreground"> (나)</span>}
                    </span>
                    {penaltyOn && (
                      <span className="text-muted-foreground w-14 text-right text-sm tabular-nums">{m.points}P</span>
                    )}
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {canWake && (
                      <Button size="sm" variant="outline" onClick={() => setTarget({ id: m.id, nickname: m.nickname })}>
                        깨우기
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

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

      {target && (
        <ClipRecorder groupId={id} fromMemberId={me.id} to={target} onClose={() => setTarget(null)} />
      )}
      {ringing && <AlarmOverlay me={me} audio={audio} onRespond={respond} />}
    </main>
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
