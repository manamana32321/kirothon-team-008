"use client";

import { useCallback, useEffect, useState } from "react";
import { send } from "@/lib/api-client";

export type PushState = "unsupported" | "idle" | "on" | "denied";

function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function usePush(groupId: string, memberId: string) {
  const [state, setState] = useState<PushState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const apply = (next: PushState) => {
      if (!cancelled) setState(next);
    };
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return apply("unsupported");
      if (Notification.permission === "denied") return apply("denied");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") apply("on");
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const enable = useCallback(async () => {
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { key } = (await (await fetch("/api/push/key")).json()) as { key: string };
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const result = await send(`/api/groups/${groupId}/push`, {
        method: "POST",
        json: { memberId, subscription: sub.toJSON() },
      });
      if (result.error) return setError(result.error);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림 설정에 실패했어요.");
    }
  }, [groupId, memberId]);

  return { state, error, enable };
}
