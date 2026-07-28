import { getDatabase } from "@doctornest/database";

import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;
  const username = body?.username?.trim();
  const password = body?.password;

  if (!username || !password) {
    return Response.json(
      { error: "아이디와 비밀번호를 입력해 주세요." },
      { status: 400 },
    );
  }

  const user = await getDatabase().user.findUnique({
    where: { username },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  await createSession(user.id);

  return Response.json({ ok: true });
}
