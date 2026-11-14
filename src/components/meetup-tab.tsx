"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapMember } from "@/components/meetup-map";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { send } from "@/lib/api-client";
import { LOCATION_STALE_SECONDS, MEETUP_RADII_M } from "@/lib/config";
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
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState<number>(group.meetup?.radiusM ?? 100);
  const [error, setError] = useState("");
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

  const center =
    pending ?? group.meetup ?? mapMembers.find((m) => m.me) ?? mapMembers[0] ?? DEFAULT_CENTER;

  async function saveMeetup() {
    if (!pending) return;
    setError("");
    const result = await send(`/api/groups/${group.id}/meetup`, {
      method: "PUT",
      json: { ...pending, radiusM },
    });
    if (result.error !== undefined) return setError(result.error);
    setPicking(false);
    setPending(null);
  }

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
        pending={pending ? { ...pending, radiusM } : null}
        members={mapMembers}
        onPick={picking ? setPending : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        {picking ? (
          <>
            <span className="text-sm">{pending ? "반경" : "지도를 눌러 장소를 고르세요"}</span>
            {MEETUP_RADII_M.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={radiusM === r ? "default" : "outline"}
                onClick={() => setRadiusM(r)}
              >
                {r}m
              </Button>
            ))}
            <Button size="sm" disabled={!pending} onClick={saveMeetup}>
              저장
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPicking(false);
                setPending(null);
              }}
            >
              취소
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
            {group.meetup ? `모임 장소 바꾸기 (지금 ${group.meetup.radiusM}m)` : "모임 장소 정하기"}
          </Button>
        )}
      </div>
      {!group.meetup && !picking && (
        <p className="text-muted-foreground text-xs">모임 장소가 있어야 도착하면 자동으로 출석돼요.</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

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
