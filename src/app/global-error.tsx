"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ padding: 24 }}>
        <p>문제가 생겼어요.</p>
        <button onClick={reset}>다시 시도</button>
      </body>
    </html>
  );
}
