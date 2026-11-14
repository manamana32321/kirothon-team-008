"use client";

import { Button } from "@/components/ui/button";
import { usePush } from "@/lib/use-push";

export function PushButton({ groupId, memberId }: { groupId: string; memberId: string }) {
  const { state, error, enable } = usePush(groupId, memberId);

  if (state === "on" || state === "native") return null;
  if (state === "unsupported") {
    return (
      <p className="text-muted-foreground bg-muted rounded-(--radius) border-[3px] border-foreground p-3 text-center text-sm">
        알림을 받으려면 Safari 공유 버튼에서 &quot;홈 화면에 추가&quot;를 하고, 그 아이콘으로 열어 주세요.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-muted-foreground bg-muted rounded-(--radius) border-[3px] border-foreground p-3 text-center text-sm">
        알림이 꺼져 있어요. 기기 설정에서 운동기 알림을 허용해 주세요.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" onClick={enable}>
        알림 받기
      </Button>
      {error && <p className="text-destructive text-center text-xs">{error}</p>}
    </div>
  );
}
