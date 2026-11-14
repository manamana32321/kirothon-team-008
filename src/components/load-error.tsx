"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export function LoadError({
  message,
  onRetry,
  showHome = false,
}: {
  message: string;
  onRetry?: () => void;
  showHome?: boolean;
}) {
  return (
    <main role="alert" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-6 pt-12">
      <p>{message}</p>
      <div className="flex gap-2">
        {onRetry && <Button onClick={onRetry}>다시 시도</Button>}
        {showHome && (
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            홈으로
          </Link>
        )}
      </div>
    </main>
  );
}
