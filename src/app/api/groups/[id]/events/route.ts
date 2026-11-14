import { requireGroupMember } from "@/lib/auth";
import { subscribe } from "@/lib/events";

const KEEP_ALIVE_MS = 25_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireGroupMember(request, id);
  if ("response" in guard) return guard.response;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const unsubscribe = subscribe(id, (event) =>
        send(`event: ${event}\ndata: ${event}\n\n`),
      );
      const timer = setInterval(() => send(": keep-alive\n\n"), KEEP_ALIVE_MS);
      cleanup = () => {
        clearInterval(timer);
        unsubscribe();
      };
      request.signal.addEventListener(
        "abort",
        () => {
          cleanup();
          controller.close();
        },
        { once: true },
      );
      send(": connected\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
