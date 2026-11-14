"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapMember } from "@/components/meetup-map";
import { Switch } from "@/components/ui/switch";
import { LOCATION_STALE_SECONDS } from "@/lib/config";
import { type LatLng, distanceM } from "@/lib/geo";
import type { GroupState } from "@/lib/group-state";
import type { Position } from "@/lib/locations";

const MeetupMap = dynamic(() => import("@/components/meetup-map"), {
  ssr: false,
  loading: () => <div className="bg-muted h-80 w-full animate-pulse rounded-lg" />,
});

const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const RELOAD_THROTTLE_MS = 2_000;

type Sharing = { on: boolean; notice: string; start: () => void; stop: (m?: string) => void };

export function MeetupTab({
  group,
  meId,
  now,
  locationVersion,
  sharing,
}: {
  group: GroupState;
  meId: string;
  now: Date;
  locationVersion: number;
  sharing: Sharing;
}) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [windowOpen, setWindowOpen] = useState(false);
  const lastLoad = useRef(0);
  const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    lastLoad.current = Date.now();
    const res = await fetch(`/api/groups/${group.id}/locations`, { cache: "no-store" });
    if (!res.ok) return;
    const body: { sharing: boolean; positions: Position[] } = await res.json();
    setWindowOpen(body.sharing);
    setPositions(body.positions);
  }, [group.id]);

  useEffect(() => {
    const wait = Math.max(0, lastLoad.current + RELOAD_THROTTLE_MS - Date.now());
    if (scheduled.current) clearTimeout(scheduled.current);
    scheduled.current = setTimeout(load, wait);
    return () => {
      if (scheduled.current) clearTimeout(scheduled.current);
    };
  }, [load, locationVersion, group.alarmTime]);

  const nickname = new Map(group.members.map((m) => [m.id, m.nickname]));
  const mapMembers: MapMember[] = positions
    .filter((p) => nickname.has(p.memberId))
    .map((p) => ({
      id: p.memberId,
      nickname: nickname.get(p.memberId)!,
      lat: p.lat,
      lng: p.lng,
      me: p.memberId === meId,
      stale: now.getTime() - p.updatedAt > LOCATION_STALE_SECONDS * 1000,
    }));
  const sharingIds = new Set(positions.map((p) => p.memberId));
  const notSharing = group.members.filter((m) => !sharingIds.has(m.id));

  const center = group.meetup ?? mapMembers.find((m) => m.me) ?? mapMembers[0] ?? DEFAULT_CENTER;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span>
          <span className="font-medium">위치 공유</span>
          <span className="text-muted-foreground block text-xs">
            켠 동안, 알람 후 정해진 시간에만 보내요. 저장하지 않아요.
          </span>
        </span>
        <Switch
          checked={sharing.on}
          onCheckedChange={(checked) => (checked ? sharing.start() : sharing.stop())}
        />
      </label>
      {sharing.notice && <p className="text-muted-foreground text-sm">{sharing.notice}</p>}
      {!windowOpen && !sharing.notice && (
        <p className="text-muted-foreground text-sm">지금은 공유 시간이 아니에요. 알람이 울리면 열려요.</p>
      )}

      <MeetupMap
        center={center}
        place={group.meetup}
        pending={null}
        members={mapMembers}
        onPick={null}
      />

      {!group.meetup && (
        <p className="text-muted-foreground text-xs">
          <Link href={`/g/${group.id}/settings`} className="underline underline-offset-4">
            설정
          </Link>
          에서 모임 장소를 정하면 도착할 때 자동으로 출석돼요.
        </p>
      )}

      <div className="flex flex-col divide-y rounded-lg border px-3 text-sm">
        {mapMembers.map((m) => (
          <p key={m.id} className={`flex justify-between py-2 ${m.stale ? "opacity-50" : ""}`}>
            <span>{m.nickname}</span>
            <span className="text-muted-foreground tabular-nums">
              {group.meetup ? `모임 장소까지 ${Math.round(distanceM(m, group.meetup))}m` : "공유 중"}
            </span>
          </p>
        ))}
        {notSharing.map((m) => (
          <p key={m.id} className="text-muted-foreground flex justify-between py-2">
            <span>{m.nickname}</span>
            <span>공유 안 함</span>
          </p>
        ))}
      </div>
    </div>
  );
}
