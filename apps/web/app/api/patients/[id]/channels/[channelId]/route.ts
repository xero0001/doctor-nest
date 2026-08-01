import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; channelId: string }>;
};

export async function PATCH(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id, channelId } = await params;
  const database = getDatabase();
  const channelAccount = await database.patientChannel.findFirst({
    where: {
      id: channelId,
      patientId: id,
      hospitalId: user.hospitalId,
    },
    select: { id: true },
  });

  if (!channelAccount) {
    return Response.json(
      { error: "연결된 채팅 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await database.$transaction([
    database.patientChannel.updateMany({
      where: { patientId: id, hospitalId: user.hospitalId },
      data: { isPrimary: false },
    }),
    database.patientChannel.update({
      where: { id: channelAccount.id },
      data: { isPrimary: true },
    }),
  ]);

  return Response.json({ channelId: channelAccount.id, isPrimary: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id, channelId } = await params;
  const database = getDatabase();
  const channelAccount = await database.patientChannel.findFirst({
    where: {
      id: channelId,
      patientId: id,
      hospitalId: user.hospitalId,
    },
    select: { id: true, isPrimary: true },
  });

  if (!channelAccount) {
    return Response.json(
      { error: "연결된 채팅 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const replacement = channelAccount.isPrimary
    ? await database.patientChannel.findFirst({
        where: {
          patientId: id,
          hospitalId: user.hospitalId,
          id: { not: channelAccount.id },
        },
        select: { id: true },
        orderBy: { linkedAt: "asc" },
      })
    : null;

  await database.$transaction([
    database.patientChannel.update({
      where: { id: channelAccount.id },
      data: {
        patientId: null,
        isPrimary: false,
        linkMethod: null,
        linkedAt: null,
      },
    }),
    database.conversation.updateMany({
      where: {
        hospitalId: user.hospitalId,
        patientChannelId: channelAccount.id,
      },
      data: { patientId: null },
    }),
    ...(replacement
      ? [
          database.patientChannel.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          }),
        ]
      : []),
  ]);

  return Response.json({ channelId: channelAccount.id, unlinked: true });
}
