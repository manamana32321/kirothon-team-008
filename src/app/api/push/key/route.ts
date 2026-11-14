import { connection } from "next/server";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  await connection();
  return Response.json({ key: vapidPublicKey() });
}
