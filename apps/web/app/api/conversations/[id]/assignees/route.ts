import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    assigned?: unknown;
  } | null;

  if (typeof body?.userId !== "string" || typeof body.assigned !== "boolean") {
    return Response.json(
      { error: "담당자 설정 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (body.userId === currentUser.id) {
    return Response.json(
      { error: "현재 로그인한 계정은 담당자로 추가할 수 없습니다." },
      { status: 409 },
    );
  }

  const { id } = await params;
  const database = getDatabase();
  const [conversation, staffMember] = await Promise.all([
    database.conversation.findFirst({
      where: { id, hospitalId: currentUser.hospitalId },
      select: { id: true },
    }),
    database.authUser.findFirst({
      where: {
        id: body.userId,
        hospitalId: currentUser.hospitalId,
      },
      select: { id: true },
    }),
  ]);

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (!staffMember) {
    return Response.json(
      { error: "담당자를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (body.assigned) {
    await database.conversationAssignee.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: staffMember.id,
        },
      },
      create: {
        conversationId: conversation.id,
        userId: staffMember.id,
      },
      update: {},
    });
  } else {
    await database.conversationAssignee.deleteMany({
      where: {
        conversationId: conversation.id,
        userId: staffMember.id,
      },
    });
  }

  const assignees = await database.conversationAssignee.findMany({
    where: { conversationId: conversation.id },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return Response.json(
    {
      assignees: assignees.map(({ user }) => ({
        id: user.id,
        name: user.name,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
