"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { send } from "@/lib/api-client";
import { useMe } from "@/lib/use-me";

type Joined = { groupId: string };

export default function Home() {
  const router = useRouter();
  const { me, reload } = useMe();
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
    router.push(`/g/${result.data.groupId}`);
  }

  async function logout() {
    await send("/api/auth/logout", { method: "POST" });
    await reload();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 pt-8">
        <h1 className="text-[28px]">운동기</h1>
        <p className="text-muted-foreground">알람 끄기가 곧 &quot;운동 간다&quot;. ㅇㄷㄱ?</p>
      </header>

      {me === undefined && <p>불러오는 중</p>}

      {me && !me.user && <AuthForm onDone={reload} />}

      {me?.user && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-medium">{me.user.username}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              로그아웃
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>내 그룹</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {me.groups.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  아직 그룹이 없어요. 아래에서 만들거나 코드로 참여해요.
                </p>
              )}
              {me.groups.map((g) => (
                <Link
                  key={g.groupId}
                  href={`/g/${g.groupId}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground text-sm">
                      멤버 {g.memberCount}명 · {g.alarmTime ? `알람 ${g.alarmTime}` : "알람 없음"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </Link>
              ))}
            </CardContent>
          </Card>

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
                disabled={busy || !groupName.trim()}
                onClick={() => enter("/api/groups", { name: groupName })}
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
                disabled={busy || !code.trim()}
                onClick={() => enter("/api/groups/join", { inviteCode: code })}
              >
                참여
              </Button>
            </CardContent>
          </Card>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </>
      )}
    </main>
  );
}
