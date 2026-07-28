import { getDatabase } from "@doctornest/database";

const supportedChannels = [
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
] as const;

type SupportedChannel = (typeof supportedChannels)[number];

type InboundEvent = {
  externalCustomerId?: string;
  externalThreadId?: string;
  externalMessageId?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  language?: string;
  message?: string;
  sentAt?: string;
};

type RouteContext = {
  params: Promise<{ channel: string; token: string }>;
};

function isSupportedChannel(channel: string): channel is SupportedChannel {
  return supportedChannels.some((supported) => supported === channel);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { channel, token } = await params;

  if (!isSupportedChannel(channel)) {
    return Response.json({ error: "Unknown channel" }, { status: 404 });
  }

  const connection = await getDatabase().channelConnection.findFirst({
    where: {
      channel,
      webhookToken: token,
    },
    select: { id: true, organizationId: true },
  });

  if (!connection) {
    return Response.json({ error: "Unknown webhook" }, { status: 404 });
  }

  const event = (await request.json().catch(() => null)) as InboundEvent | null;
  const externalCustomerId = event?.externalCustomerId?.trim();
  const message = event?.message?.trim();

  if (!event || !externalCustomerId || !message) {
    return Response.json(
      {
        error:
          "externalCustomerId와 message가 포함된 정규화 이벤트가 필요합니다.",
      },
      { status: 400 },
    );
  }

  const externalThreadId =
    event.externalThreadId?.trim() || externalCustomerId;
  const sentAt = event.sentAt ? new Date(event.sentAt) : new Date();

  if (Number.isNaN(sentAt.getTime())) {
    return Response.json(
      { error: "sentAt 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const result = await database.$transaction(async (transaction) => {
    const customer = await transaction.customer.upsert({
      where: {
        organizationId_externalRef: {
          organizationId: connection.organizationId,
          externalRef: `${channel}:${externalCustomerId}`,
        },
      },
      update: {
        name: event.customerName?.trim() || undefined,
        phone: event.phone?.trim() || undefined,
        email: event.email?.trim() || undefined,
        language: event.language?.trim() || undefined,
      },
      create: {
        organizationId: connection.organizationId,
        externalRef: `${channel}:${externalCustomerId}`,
        name: event.customerName?.trim() || `${channel} 고객`,
        phone: event.phone?.trim() || null,
        email: event.email?.trim() || null,
        language: event.language?.trim() || "ko",
        tags: [],
      },
    });

    const externalMessageId = event.externalMessageId?.trim();
    const conversationKey = {
      organizationId: connection.organizationId,
      channel,
      externalThreadId,
    };
    const existingConversation = await transaction.conversation.findUnique({
      where: {
        organizationId_channel_externalThreadId: conversationKey,
      },
    });

    if (existingConversation && externalMessageId) {
      const existingMessage = await transaction.message.findUnique({
        where: {
          conversationId_externalMessageId: {
            conversationId: existingConversation.id,
            externalMessageId,
          },
        },
      });

      if (existingMessage) {
        return {
          customerId: customer.id,
          conversationId: existingConversation.id,
          messageId: existingMessage.id,
        };
      }
    }

    const conversation = existingConversation
      ? await transaction.conversation.update({
          where: { id: existingConversation.id },
          data: {
            customerId: customer.id,
            status: "OPEN",
            unreadCount: { increment: 1 },
            lastMessageAt: sentAt,
          },
        })
      : await transaction.conversation.create({
          data: {
            ...conversationKey,
            customerId: customer.id,
            unreadCount: 1,
            lastMessageAt: sentAt,
          },
        });

    const storedMessage = await transaction.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: externalMessageId || null,
        direction: "INBOUND",
        sender: "CUSTOMER",
        content: message,
        sentAt,
      },
    });

    return {
      customerId: customer.id,
      conversationId: conversation.id,
      messageId: storedMessage.id,
    };
  });

  return Response.json({ received: true, ...result }, { status: 202 });
}
