import { createHmac, timingSafeEqual } from "node:crypto";

import { getDatabase } from "@doctornest/database";

import { decryptInstagramCredentials } from "@/lib/channel-credentials";
import {
  persistInboundEvent,
  scheduleInboundTranslation,
  type WebhookConnection,
} from "@/lib/inbound-messages";
import { getInstagramCustomerProfile } from "@/lib/instagram-api";

export const runtime = "nodejs";

type InstagramMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

type InstagramWebhookEntry = {
  id?: string;
  messaging?: InstagramMessagingEvent[];
};

type InstagramWebhookPayload = {
  object?: string;
  entry?: InstagramWebhookEntry[];
};

function hasValidSignature(
  rawBody: string,
  signature: string,
  appSecret: string,
) {
  const [algorithm, receivedHex] = signature.split("=");

  if (
    algorithm !== "sha256" ||
    !receivedHex ||
    !/^[a-f0-9]{64}$/i.test(receivedHex)
  ) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, "hex");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

async function processEntry(entry: InstagramWebhookEntry) {
  const instagramUserId = entry.id?.trim();
  if (!instagramUserId || !Array.isArray(entry.messaging)) return 0;

  const connection = await getDatabase().channelConnection.findFirst({
    where: {
      channel: "INSTAGRAM",
      externalAccountId: instagramUserId,
      status: "CONNECTED",
    },
    select: {
      id: true,
      hospitalId: true,
      credentialsEncrypted: true,
    },
  });
  if (!connection?.credentialsEncrypted) return 0;

  let credentials;
  try {
    credentials = decryptInstagramCredentials(connection.credentialsEncrypted);
  } catch {
    return 0;
  }

  let processed = 0;
  const profileCache = new Map<
    string,
    Awaited<ReturnType<typeof getInstagramCustomerProfile>>
  >();

  for (const messagingEvent of entry.messaging) {
    const senderId = messagingEvent.sender?.id?.trim();
    const messageText = messagingEvent.message?.text?.trim();
    const isBusinessEcho =
      messagingEvent.message?.is_echo ||
      senderId === credentials.instagramUserId;

    if (!senderId || !messageText || isBusinessEcho) continue;

    let profile = profileCache.get(senderId);
    if (profile === undefined) {
      profile = await getInstagramCustomerProfile(
        senderId,
        credentials.accessToken,
      );
      profileCache.set(senderId, profile);
    }

    try {
      const result = await persistInboundEvent(
        connection satisfies WebhookConnection,
        "INSTAGRAM",
        {
          externalCustomerId: senderId,
          externalThreadId: senderId,
          externalMessageId: messagingEvent.message?.mid,
          customerName:
            profile?.name?.trim() ||
            (profile?.username ? `@${profile.username}` : undefined),
          message: messageText,
          sentAt: messagingEvent.timestamp
            ? new Date(messagingEvent.timestamp).toISOString()
            : undefined,
        },
      );
      scheduleInboundTranslation(connection, result, messageText);
      if (!result.duplicate) processed += 1;
    } catch {
      // Meta retries the full delivery. Skip malformed individual events while
      // still acknowledging valid events in the same webhook payload.
    }
  }

  if (processed > 0) {
    await getDatabase().channelConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        connectedAt: new Date(),
      },
    });
  }

  return processed;
}

export async function GET(request: Request) {
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    return Response.json(
      { error: "Meta Webhook 인증 토큰이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || verifyToken !== expectedToken || !challenge) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    return Response.json(
      { error: "Instagram 앱 시크릿이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature || !hasValidSignature(rawBody, signature, appSecret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return Response.json(
      { error: "올바른 Instagram Webhook JSON이 필요합니다." },
      { status: 400 },
    );
  }

  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) {
    return Response.json(
      { error: "지원하지 않는 Instagram Webhook입니다." },
      { status: 400 },
    );
  }

  let processed = 0;
  for (const entry of payload.entry) {
    processed += await processEntry(entry);
  }

  return Response.json({ received: true, processed });
}
