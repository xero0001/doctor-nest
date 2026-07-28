import { getDatabase } from "@doctornest/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/better-auth";

export async function getCurrentUser() {
  const currentSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!currentSession?.user.organizationId) {
    return null;
  }

  const organization = await getDatabase().organization.findUnique({
    where: { id: currentSession.user.organizationId },
  });

  if (!organization) {
    return null;
  }

  return {
    id: currentSession.user.id,
    organizationId: currentSession.user.organizationId,
    username: currentSession.user.username ?? "",
    name: currentSession.user.name,
    role: currentSession.user.role,
    organization,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?returnTo=/service/chatting");
  }

  return user;
}
