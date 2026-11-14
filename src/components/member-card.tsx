"use client";

import { Check, Mic, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttendanceStatus } from "@/lib/attendance";
import type { GroupState } from "@/lib/group-state";

type Member = GroupState["members"][number];

const STATUS: Record<AttendanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "응답 전", variant: "outline" },
  going: { label: "간다", variant: "default" },
  skipping: { label: "못 간다", variant: "secondary" },
  no_response: { label: "무응답", variant: "destructive" },
};

const ARRIVED = { label: "도착", variant: "default" } as const;

export function MemberCard({
  member,
  isMe,
  selected,
  audible,
  showPoints,
  onToggle,
  onRecord,
}: {
  member: Member;
  isMe: boolean;
  selected: boolean;
  audible: boolean;
  showPoints: boolean;
  onToggle: () => void;
  onRecord: () => void;
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const clip = member.clip;
  const status = member.source === "auto" ? ARRIVED : STATUS[member.status];

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !audible;
    if (clip?.hasVideo || audible) el.play().catch(() => {});
    else el.pause();
  }, [audible, clip?.id, clip?.hasVideo]);

  function press() {
    if (isMe) setShowRecord((v) => !v);
    else onToggle();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={press}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          press();
        }
      }}
      aria-pressed={isMe ? undefined : selected}
      aria-label={isMe ? "내 카드" : `${member.nickname} ${selected ? "선택 해제" : "선택"}`}
      className={`bg-muted relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl outline-offset-2 transition select-none ${
        selected ? "ring-primary ring-4" : ""
      }`}
    >
      {clip?.hasVideo && (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={`/api/clips/${clip.id}`}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      {clip && !clip.hasVideo && (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={`/api/clips/${clip.id}`}
          loop
          muted
        />
      )}
      {!clip?.hasVideo && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
          {clip ? (
            <Mic className="size-10" aria-hidden />
          ) : (
            <span className="text-3xl font-bold">{member.nickname.slice(0, 1)}</span>
          )}
        </div>
      )}

      {!isMe && (
        <span
          className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-2 ${
            selected ? "bg-primary border-primary text-primary-foreground" : "border-white/80 bg-black/20"
          }`}
        >
          {selected && <Check className="size-4" aria-hidden />}
        </span>
      )}

      {isMe && showRecord && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              setShowRecord(false);
              onRecord();
            }}
          >
            <Video data-icon="inline-start" aria-hidden />
            클립 만들기
          </Button>
        </div>
      )}

      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-white">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {member.nickname}
            {isMe && " (나)"}
          </span>
          {showPoints && <span className="text-xs text-white/80 tabular-nums">{member.points}P</span>}
        </span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </span>
    </div>
  );
}
