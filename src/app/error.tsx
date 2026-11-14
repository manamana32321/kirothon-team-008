"use client";

import { LoadError } from "@/components/load-error";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <LoadError message="문제가 생겼어요." onRetry={reset} showHome />;
}
