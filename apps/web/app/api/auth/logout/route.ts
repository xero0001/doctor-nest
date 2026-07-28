import { deleteCurrentSession } from "@/lib/auth";

export async function POST() {
  await deleteCurrentSession();
  return Response.json({ ok: true });
}
