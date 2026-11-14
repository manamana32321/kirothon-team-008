export async function send<T>(
  url: string,
  init: { method: string; json?: unknown; body?: BodyInit },
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  const res = await fetch(url, {
    method: init.method,
    headers: init.json === undefined ? undefined : { "content-type": "application/json" },
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return { error: payload.error ?? `요청 실패 (${res.status})` };
  return { data: payload as T };
}
