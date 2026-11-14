"use client";

import { useCallback, useEffect, useState } from "react";
import { send } from "@/lib/api-client";

export type Me =
  | { user: null }
  | {
      user: { id: string; username: string };
      groups: { groupId: string; name: string; memberId: string }[];
    };

async function fetchMe(): Promise<Me> {
  const result = await send<Me>("/api/auth/me", { method: "GET" });
  return result.error === undefined ? result.data : { user: null };
}

export function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    fetchMe().then((next) => {
      if (live) setMe(next);
    });
    return () => {
      live = false;
    };
  }, [version]);

  const reload = useCallback(async () => setVersion((v) => v + 1), []);

  return { me, reload };
}
