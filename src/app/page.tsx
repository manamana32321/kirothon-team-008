"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { send } from "@/lib/api-client";
import { memberKey } from "@/lib/group-state";

type Joined = { groupId: string; memberId: string };

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter(url: string, json: unknown) {
    setBusy(true);
    setError("");
    const result = await send<Joined>(url, { method: "POST", json });
    setBusy(false);
    if (result.error !== undefined) return setError(result.error);
    localStorage.setItem(memberKey(result.data.groupId), result.data.memberId);
    router.push(`/g/${result.data.groupId}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 pt-8">
        <h1 className="text-3xl font-bold">운동기</h1>
        <p className="text-muted-foreground">알람 끄기가 곧 &quot;운동 간다&quot;. ㅇㄷㄱ?</p>
      </header>

      <Input
        placeholder="내 닉네임"
        value={nickname}
        maxLength={20}
        onChange={(e) => setNickname(e.target.value)}
      />

      <Card>
        <CardHeader>
          <CardTitle>그룹 만들기</CardTitle>
          <CardDescription>초대 코드가 생겨요. 친구에게 보내 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="그룹 이름 (예: 새벽 헬스)"
            value={groupName}
            maxLength={30}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button
            disabled={busy || !nickname.trim() || !groupName.trim()}
            onClick={() => enter("/api/groups", { name: groupName, nickname })}
          >
            만들기
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>초대 코드로 참여</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="6자리 코드"
            value={code}
            maxLength={32}
            className="uppercase"
            onChange={(e) => setCode(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={busy || !nickname.trim() || !code.trim()}
            onClick={() => enter("/api/groups/join", { inviteCode: code, nickname })}
          >
            참여
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}
    </main>
  );
}
