export type ApiResult<T> =
  | { data: T; error?: undefined; status: number }
  | { data?: undefined; error: string; status: number };

export function isRetryable(status: number) {
  return status === 0 || status >= 500;
}

export async function send<T>(
  url: string,
  init: { method: string; json?: unknown; body?: BodyInit },
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      cache: "no-store",
      headers: init.json === undefined ? undefined : { "content-type": "application/json" },
      body: init.json === undefined ? init.body : JSON.stringify(init.json),
    });
  } catch {
    return { error: "네트워크에 연결할 수 없어요.", status: 0 };
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return { error: payload.error ?? `요청 실패 (${res.status})`, status: res.status };
  return { data: payload as T, status: res.status };
}
