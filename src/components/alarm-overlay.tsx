"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GroupState } from "@/lib/group-state";

type Me = GroupState["members"][number];

export function AlarmOverlay({
  me,
  audio,
  wakeFrom,
  onRespond,
  onAwake,
}: {
  me: Me;
  audio: AudioContext | null;
  wakeFrom?: string;
  onRespond: (choice: "going" | "skipping") => Promise<void>;
  onAwake?: () => Promise<void>;
}) {
  const [clipFailed, setClipFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const clip = clipFailed ? null : me.nextClip;
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    if (clip || !audio) return;
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
  }, [clip, audio]);

  useEffect(() => {
    mediaRef.current?.play().catch(() => {});
  }, [clip]);

  useEffect(() => {
    if (audio || !wakeFrom || !navigator.vibrate) return;
    const timer = setInterval(() => navigator.vibrate(400), 1000);
    return () => {
      clearInterval(timer);
      navigator.vibrate(0);
    };
  }, [audio, wakeFrom]);

  async function respond(choice: "going" | "skipping") {
    setBusy(true);
    mediaRef.current?.pause();
    await onRespond(choice);
    setBusy(false);
  }

  async function awake() {
    setBusy(true);
    mediaRef.current?.pause();
    await onAwake?.();
    setBusy(false);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-end bg-black text-white${
        wakeFrom && !audio ? " animate-pulse" : ""
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
          playsInline
          onError={() => setClipFailed(true)}
        />
      )}
      {clip && !clip.hasVideo && (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={`/api/clips/${clip.id}`}
          autoPlay
          loop
          onError={() => setClipFailed(true)}
        />
      )}
      <div className="relative flex w-full max-w-md flex-col gap-4 bg-gradient-to-t from-black/90 to-transparent p-6 pb-10">
        <p className="text-center text-4xl font-bold">ㅇㄷㄱ?</p>
        <p className="text-center text-sm text-white/80">
          {wakeFrom
            ? `${wakeFrom}님이 깨우는 중`
            : clip
              ? `${clip.fromNickname}님이 깨우는 중`
              : "운동 갈 시간이에요"}
        </p>
        {!audio && (
          <p className="text-center text-xs text-yellow-300">
            &quot;알람 켜기&quot;를 누르지 않아서 소리가 안 날 수 있어요.
          </p>
        )}
        {wakeFrom ? (
          <Button size="lg" className="h-16 text-xl" disabled={busy} onClick={awake}>
            일어났다
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-16 text-xl"
              disabled={busy}
              onClick={() => respond("going")}
            >
              간다
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-16 text-xl"
              disabled={busy}
              onClick={() => respond("skipping")}
            >
              못 간다
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
