"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { send } from "@/lib/api-client";

export function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const result = await send(`/api/auth/${mode}`, { method: "POST", json: { username, password } });
    setBusy(false);
    if (result.error !== undefined) return setError(result.error);
    onDone();
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Input
        placeholder="닉네임"
        value={username}
        maxLength={20}
        autoComplete="username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        type="password"
        placeholder="비밀번호 (8자 이상)"
        value={password}
        maxLength={128}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" disabled={busy || !username.trim() || !password}>
        {mode === "login" ? "로그인" : "가입하기"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "처음이에요 (가입)" : "이미 계정이 있어요 (로그인)"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
