"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { send } from "@/lib/api-client";
import { MEETUP_RADII_M } from "@/lib/config";
import type { LatLng } from "@/lib/geo";
import type { GroupState } from "@/lib/group-state";

const MeetupMap = dynamic(() => import("@/components/meetup-map"), {
  ssr: false,
  loading: () => <div className="bg-muted h-72 w-full animate-pulse rounded-lg" />,
});

const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const DEFAULT_PENALTY = 10;

function inMinutes(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function GroupSettings({ id }: { id: string }) {
  const [group, setGroup] = useState<GroupState | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`, { cache: "no-store" });
    if (!res.ok) return setLoadError("그룹을 찾을 수 없어요.");
    setGroup(await res.json());
  }, [id]);

  useEffect(() => {
    const source = new EventSource(`/api/groups/${id}/events`);
    source.addEventListener("group.updated", () => load());
    source.onopen = () => load();
    return () => source.close();
  }, [id, load]);

  if (loadError) return <p className="p-6">{loadError}</p>;
  if (!group) return <p className="p-6">불러오는 중</p>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center gap-1 pt-4">
        <Link
          href={`/g/${id}`}
          aria-label="그룹 화면으로 돌아가기"
          title="돌아가기"
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-muted-foreground text-sm">{group.name}</p>
          <h1 className="text-2xl font-bold">모임 설정</h1>
        </div>
      </header>

      <TimeSection key={`t-${group.alarmTime}`} group={group} />
      <PenaltySection key={`p-${group.penaltyPoints}`} group={group} />
      <PlaceSection key={`m-${group.meetup?.lat}-${group.meetup?.radiusM}`} group={group} />
      <InviteSection group={group} />
    </main>
  );
}

function useSave() {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function run(url: string, init: { method: string; json?: unknown }) {
    setError("");
    setSaved(false);
    const result = await send(url, init);
    if (result.error !== undefined) setError(result.error);
    else setSaved(true);
    return result.error === undefined;
  }
  return { error, saved, run };
}

function TimeSection({ group }: { group: GroupState }) {
  const [time, setTime] = useState(group.alarmTime ?? "08:00");
  const { error, saved, run } = useSave();
  const save = (alarmTime: string) =>
    run(`/api/groups/${group.id}/alarm`, {
      method: "PUT",
      json: { alarmTime, penaltyPoints: group.penaltyPoints },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>모임 시간</CardTitle>
        <CardDescription>매일 이 시간에 알람이 울려요.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-36" />
          <Button onClick={() => save(time)}>저장</Button>
        </div>
        <Button variant="outline" size="sm" className="self-start" onClick={() => save(inMinutes(1))}>
          1분 뒤로 맞추기 (시연용)
        </Button>
        {saved && <p className="text-muted-foreground text-sm">저장했어요.</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}

function PenaltySection({ group }: { group: GroupState }) {
  const [on, setOn] = useState(group.penaltyPoints > 0);
  const [points, setPoints] = useState(group.penaltyPoints > 0 ? group.penaltyPoints : DEFAULT_PENALTY);
  const { error, saved, run } = useSave();
  const canSave = group.alarmTime !== null;
  const save = (penaltyPoints: number) =>
    run(`/api/groups/${group.id}/alarm`, {
      method: "PUT",
      json: { alarmTime: group.alarmTime, penaltyPoints },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          벌금
          <Switch
            checked={on}
            disabled={!canSave}
            onCheckedChange={(checked) => {
              setOn(checked);
              save(checked ? points : 0);
            }}
          />
        </CardTitle>
        <CardDescription>
          {canSave ? "못 가거나 응답이 없으면 포인트가 깎여요. 가상 포인트예요." : "모임 시간을 먼저 정해 주세요."}
        </CardDescription>
      </CardHeader>
      {on && (
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-muted-foreground text-sm">P / 1회</span>
            <Button onClick={() => save(points)} disabled={points < 1}>
              저장
            </Button>
          </div>
          {saved && <p className="text-muted-foreground text-sm">저장했어요.</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      )}
    </Card>
  );
}

function PlaceSection({ group }: { group: GroupState }) {
  const [pending, setPending] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState<number>(group.meetup?.radiusM ?? 100);
  const { error, run } = useSave();
  const place = pending ?? group.meetup;

  async function save() {
    if (!place) return;
    if (
      await run(`/api/groups/${group.id}/meetup`, {
        method: "PUT",
        json: { lat: place.lat, lng: place.lng, radiusM },
      })
    )
      setPending(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>모임 장소 (선택)</CardTitle>
        <CardDescription>정해 두면 여기 도착할 때 자동으로 출석돼요. 지도를 눌러 고르세요.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <MeetupMap
          center={place ?? DEFAULT_CENTER}
          place={pending ? null : group.meetup}
          pending={pending ? { ...pending, radiusM } : null}
          members={[]}
          onPick={setPending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">반경</span>
          {MEETUP_RADII_M.map((r) => (
            <Button key={r} size="sm" variant={radiusM === r ? "default" : "outline"} onClick={() => setRadiusM(r)}>
              {r}m
            </Button>
          ))}
          <Button size="sm" disabled={!place || (!pending && radiusM === group.meetup?.radiusM)} onClick={save}>
            저장
          </Button>
          {group.meetup && !pending && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run(`/api/groups/${group.id}/meetup`, { method: "DELETE" })}
            >
              장소 없애기
            </Button>
          )}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}

function InviteSection({ group }: { group: GroupState }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLink(`${window.location.origin}/g/${group.id}`), 0);
    return () => clearTimeout(timer);
  }, [group.id]);

  async function copy(text: string, what: string) {
    await navigator.clipboard?.writeText(text);
    setCopied(what);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>친구 초대</CardTitle>
        <CardDescription>QR을 찍거나, 코드를 첫 화면에 넣으면 들어와요.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {link && (
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={link} size={176} />
          </div>
        )}
        <button
          className="font-mono text-3xl font-bold tracking-[0.3em]"
          onClick={() => copy(group.inviteCode, "코드")}
          title="눌러서 복사"
        >
          {group.inviteCode}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(group.inviteCode, "코드")}>
            코드 복사
          </Button>
          <Button variant="outline" size="sm" disabled={!link} onClick={() => copy(link, "링크")}>
            링크 복사
          </Button>
        </div>
        {copied && <p className="text-muted-foreground text-sm">{copied}를 복사했어요.</p>}
      </CardContent>
    </Card>
  );
}
