import { createHash, randomBytes } from "node:crypto";

import { getDatabase } from "@doctornest/database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "doctornest_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const database = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await database.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const database = getDatabase();
  const session = await database.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await database.session.delete({ where: { id: session.id } });
    }

    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?returnTo=/service/chatting");
  }

  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await getDatabase().session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}
