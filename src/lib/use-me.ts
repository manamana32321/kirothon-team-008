"use client";

import { useCallback, useEffect, useState } from "react";
import { send } from "@/lib/api-client";

export type Me =
  | { user: null }
  | {
      user: { id: string; username: string };
      groups: {
        groupId: string;
        name: string;
        memberId: string;
        memberCount: number;
        alarmTime: string | null;
      }[];
    };

export function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    send<Me>("/api/auth/me", { method: "GET" }).then((result) => {
      if (!live) return;
      if (result.error !== undefined) return setError(result.error);
      setError("");
      setMe(result.data);
    });
    return () => {
      live = false;
    };
  }, [version]);

  const reload = useCallback(async () => setVersion((v) => v + 1), []);

  return { me, error, reload };
}
