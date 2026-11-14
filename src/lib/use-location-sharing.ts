"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_SEND_INTERVAL_SECONDS, SHARE_WINDOW_MINUTES } from "@/lib/config";
import { inShareWindow } from "@/lib/meetup";

const OUT_OF_WINDOW = `알람 후 ${SHARE_WINDOW_MINUTES}분 동안만 공유돼요.`;
const DENIED =
  "위치 권한이 필요해요. 주소창 왼쪽의 사이트 설정에서 위치를 허용한 뒤 다시 켜 주세요.";

export function useLocationSharing(groupId: string, memberId: string, alarmTime: string | null) {
  const [on, setOn] = useState(false);
  const [notice, setNotice] = useState("");
  const latest = useRef<GeolocationPosition | null>(null);
  const url = `/api/groups/${groupId}/location`;

  const remove = useCallback(
    (keepalive = false) =>
      fetch(url, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId }),
        keepalive,
      }).catch(() => {}),
    [url, memberId],
  );

  const stop = useCallback(
    (message = "") => {
      setOn(false);
      setNotice(message);
    },
    [],
  );

  const start = useCallback(() => {
    if (!inShareWindow(new Date(), alarmTime)) return setNotice(OUT_OF_WINDOW);
    if (!("geolocation" in navigator)) return setNotice("이 브라우저는 위치를 지원하지 않아요.");
    setNotice("");
    setOn(true);
  }, [alarmTime]);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;

    async function sendLatest() {
      const p = latest.current;
      if (!p || cancelled) return;
      if (!inShareWindow(new Date(), alarmTime)) return stop(OUT_OF_WINDOW);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracyM: p.coords.accuracy,
        }),
      }).catch(() => null);
      if (res?.status === 409) stop(OUT_OF_WINDOW);
    }

    let sentFirst = false;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        latest.current = p;
        if (!sentFirst) {
          sentFirst = true;
          sendLatest();
        }
      },
      (e) => stop(e.code === e.PERMISSION_DENIED ? DENIED : "위치를 가져오지 못했어요."),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    const timer = setInterval(sendLatest, MIN_SEND_INTERVAL_SECONDS * 1000 + 200);
    const onHide = () => remove(true);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      latest.current = null;
      remove();
    };
  }, [on, url, memberId, alarmTime, stop, remove]);

  return { on, notice, start, stop };
}
