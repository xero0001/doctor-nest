import { getDatabase } from "@doctornest/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/better-auth";

export async function getCurrentUser() {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!currentSession?.user.hospitalId) {
    return null;
  }

  const hospital = await getDatabase().hospital.findUnique({
    where: { id: currentSession.user.hospitalId },
  });

  if (!hospital) {
    return null;
  }

  return {
    id: currentSession.user.id,
    hospitalId: currentSession.user.hospitalId,
    username: currentSession.user.username ?? "",
    name: currentSession.user.name,
    role: currentSession.user.role,
    hospital,
  };
}

export async function requireUser(returnTo = "/service/chatting") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return user;
}
