import { clearCookie, endSession } from "@/lib/auth";

export async function POST(request: Request) {
  await endSession(request);
  return new Response(null, { status: 204, headers: { "set-cookie": clearCookie() } });
}
