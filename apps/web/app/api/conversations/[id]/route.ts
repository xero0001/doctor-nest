import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function serializeConversation(
  conversation: NonNullable<
    Awaited<ReturnType<typeof findConversationForOrganization>>
  >,
) {
  return {
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    important: conversation.important,
    unreadCount: conversation.unreadCount,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    customer: {
      id: conversation.customer.id,
      externalRef: conversation.customer.externalRef,
      name: conversation.customer.name,
      phone: conversation.customer.phone,
      email: conversation.customer.email,
      gender: conversation.customer.gender,
      birthDate: conversation.customer.birthDate?.toISOString() ?? null,
      language: conversation.customer.language,
      notes: conversation.customer.notes,
      tags: conversation.customer.tags,
      appointments: conversation.customer.appointments.map((appointment) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt.toISOString(),
        doctorName: appointment.doctorName,
        treatment: appointment.treatment,
        status: appointment.status,
      })),
    },
    messages: conversation.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      sender: message.sender,
      content: message.content,
      sentAt: message.sentAt.toISOString(),
    })),
  };
}

function findConversationForOrganization(id: string, organizationId: string) {
  return getDatabase().conversation.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      customer: {
        include: {
          appointments: {
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await findConversationForOrganization(
    id,
    user.organizationId,
  );

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return Response.json(
    { conversation: serializeConversation(conversation) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    content?: string;
  } | null;
  const content = body?.content?.trim();

  if (!content) {
    return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
  }

  if (content.length > 4000) {
    return Response.json(
      { error: "메시지는 4,000자까지 입력할 수 있습니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const conversation = await database.conversation.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!conversation) {
    return Response.json(
      { error: "채팅을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const sentAt = new Date();
  const message = await database.$transaction(async (transaction) => {
    const storedMessage = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        sender: "STAFF",
        content,
        sentAt,
      },
    });

    await transaction.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: sentAt },
    });

    return storedMessage;
  });

  return Response.json(
    {
      message: {
        id: message.id,
        direction: message.direction,
        sender: message.sender,
        content: message.content,
        sentAt: message.sentAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
