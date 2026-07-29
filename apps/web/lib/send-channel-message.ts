import { getDatabase } from "@doctornest/database";

import {
  decryptInstagramCredentials,
  decryptLineCredentials,
  decryptNaverTalkCredentials,
} from "@/lib/channel-credentials";
import { sendInstagramTextMessage } from "@/lib/instagram-api";
import { sendNaverTalkTextMessage } from "@/lib/naver-talk-api";

type SendableChannel = "LINE" | "NAVER_TALK" | "INSTAGRAM";
type ChatChannel =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

export class ChannelMessageDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelMessageDeliveryError";
  }
}

function assertSendableChannel(channel: ChatChannel): SendableChannel {
  if (
    channel !== "LINE" &&
    channel !== "NAVER_TALK" &&
    channel !== "INSTAGRAM"
  ) {
    throw new ChannelMessageDeliveryError(
      `${channel} 채널의 발신 API 연동이 아직 완료되지 않았습니다.`,
    );
  }

  return channel;
}

export async function sendChannelTextMessage({
  hospitalId,
  channel,
  externalCustomerId,
  text,
}: {
  hospitalId: string;
  channel: ChatChannel;
  externalCustomerId: string;
  text: string;
}) {
  const sendableChannel = assertSendableChannel(channel);
  const connection = await getDatabase().channelConnection.findUnique({
    where: {
      hospitalId_channel: {
        hospitalId,
        channel: sendableChannel,
      },
    },
    select: {
      status: true,
      credentialsEncrypted: true,
    },
  });

  if (!connection?.credentialsEncrypted) {
    throw new ChannelMessageDeliveryError(
      `${sendableChannel} 채널 자격증명이 없습니다.`,
    );
  }

  if (sendableChannel === "LINE") {
    const { channelAccessToken } = decryptLineCredentials(
      connection.credentialsEncrypted,
    );
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: externalCustomerId,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      throw new ChannelMessageDeliveryError(
        "LINE 메시지를 발송하지 못했습니다.",
      );
    }

    const result = (await response.json().catch(() => null)) as {
      sentMessages?: Array<{ id?: string }>;
    } | null;
    return result?.sentMessages?.[0]?.id ?? null;
  }

  if (sendableChannel === "NAVER_TALK") {
    const { authorization } = decryptNaverTalkCredentials(
      connection.credentialsEncrypted,
    );
    await sendNaverTalkTextMessage({
      authorization,
      userId: externalCustomerId,
      text,
    });
    return null;
  }

  if (connection.status !== "CONNECTED") {
    throw new ChannelMessageDeliveryError(
      "Instagram 채널 연결이 완료되지 않았습니다.",
    );
  }

  const credentials = decryptInstagramCredentials(
    connection.credentialsEncrypted,
  );
  const result = await sendInstagramTextMessage({
    instagramUserId: credentials.instagramUserId,
    recipientId: externalCustomerId,
    accessToken: credentials.accessToken,
    text,
  });
  return result?.message_id ?? null;
}
