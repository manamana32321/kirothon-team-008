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
  going: { label: "Go", variant: "default" },
  skipping: { label: "No Go", variant: "secondary" },
  no_response: { label: "무응답", variant: "destructive" },
};

const ARRIVED = { label: "도착", variant: "default" } as const;

export function MemberCard({
  member,
  isMe,
  selected,
  audible,
  showPoints,
  poking,
  onToggle,
  onRecord,
}: {
  member: Member;
  isMe: boolean;
  selected: boolean;
  audible: boolean;
  showPoints: boolean;
  poking: boolean;
  onToggle: () => void;
  onRecord: () => void;
}) {
  const mediaRefs = useRef<(HTMLMediaElement | null)[]>([]);
  const [showRecord, setShowRecord] = useState(false);
  const [index, setIndex] = useState(0);
  const clips = member.clips;
  const status = member.source === "auto" ? ARRIVED : STATUS[member.status];

  useEffect(() => {
    mediaRefs.current.forEach((el, i) => {
      const c = clips[i];
      if (!el || !c) return;
      const active = i === index;
      el.muted = !(active && audible);
      if (active && (c.hasVideo || audible)) el.play().catch(() => {});
      else el.pause();
    });
  }, [audible, index, clips]);

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
      data-nickname={member.nickname}
      aria-pressed={isMe ? undefined : selected}
      aria-label={isMe ? "내 카드" : `${member.nickname} ${selected ? "선택 해제" : "선택"}`}
      className={`bg-muted relative aspect-[3/4] cursor-pointer overflow-hidden rounded-(--radius) border-[3px] border-foreground shadow-[3px_3px_0_var(--foreground)] outline-offset-2 transition select-none ${poking ? "poke-hit" : ""} ${
        selected ? "border-primary shadow-[3px_3px_0_var(--primary)]" : ""
      }`}
    >
      {poking && <span className="poke-tag">콕!</span>}

      {clips.length === 0 ? (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold">{member.nickname.slice(0, 1)}</span>
        </div>
      ) : (
        <div
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {clips.map((c, i) => (
            <div key={c.id} className="relative h-full w-full shrink-0 snap-center">
              {c.hasVideo ? (
                <video
                  ref={(el) => {
                    mediaRefs.current[i] = el;
                  }}
                  src={`/api/clips/${c.id}`}
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay={i === 0}
                  loop
                  muted
                  playsInline
                />
              ) : (
                <>
                  <audio
                    ref={(el) => {
                      mediaRefs.current[i] = el;
                    }}
                    src={`/api/clips/${c.id}`}
                    loop
                    muted
                  />
                  <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
                    <Mic className="size-10" aria-hidden />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {clips.length > 0 && (
        <span className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center">
          <span className="bg-card flex gap-1.5 rounded-full border-2 border-foreground px-2 py-1">
            {clips.map((c, i) => (
              <span
                key={c.id}
                className={`size-2.5 rounded-full border-2 border-foreground ${i === index ? "bg-primary" : "bg-card"}`}
              />
            ))}
          </span>
        </span>
      )}

      {!isMe && (
        <span
          className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-2 ${
            selected ? "bg-primary border-foreground text-primary-foreground" : "border-foreground bg-card"
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

      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-card text-foreground border-t-[3px] border-foreground p-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {member.nickname}
            {isMe && " (나)"}
          </span>
          {showPoints && <span className="text-foreground/70 text-xs tabular-nums">{member.points}P</span>}
        </span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </span>
    </div>
  );
}
