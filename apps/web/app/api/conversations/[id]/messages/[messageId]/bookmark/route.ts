import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; messageId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    bookmarked?: unknown;
  } | null;

  if (typeof body?.bookmarked !== "boolean") {
    return Response.json(
      { error: "북마크 설정 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { id, messageId } = await params;
  const database = getDatabase();
  const message = await database.message.findFirst({
    where: {
      id: messageId,
      conversationId: id,
      conversation: {
        hospitalId: user.hospitalId,
      },
    },
    select: { id: true, direction: true },
  });

  if (!message) {
    return Response.json(
      { error: "메시지를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (message.direction !== "INBOUND") {
    return Response.json(
      { error: "내가 보낸 메시지는 북마크할 수 없습니다." },
      { status: 409 },
    );
  }

  const updatedMessage = await database.message.update({
    where: { id: message.id },
    data: {
      bookmarkedAt: body.bookmarked ? new Date() : null,
    },
    select: {
      id: true,
      bookmarkedAt: true,
    },
  });

  return Response.json(
    {
      message: {
        id: updatedMessage.id,
        bookmarkedAt: updatedMessage.bookmarkedAt?.toISOString() ?? null,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
