import { getDatabase } from "@doctornest/database";

import { getCurrentUser } from "@/lib/auth";
import {
  decryptInstagramCredentials,
  encryptChannelCredentials,
  type LineCredentials,
} from "@/lib/channel-credentials";
import { unsubscribeInstagramWebhooks } from "@/lib/instagram-api";

const supportedChannels = new Set([
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
]);

type RouteContext = {
  params: Promise<{ channel: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channel } = await params;

  if (!supportedChannels.has(channel)) {
    return Response.json(
      { error: "지원하지 않는 채널입니다." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "save" | "disconnect";
    displayName?: string;
    externalAccountId?: string;
    lineCredentials?: Partial<LineCredentials>;
  } | null;

  if (body?.action === "disconnect") {
    if (channel === "INSTAGRAM") {
      const existingConnection =
        await getDatabase().channelConnection.findUnique({
          where: {
            hospitalId_channel: {
              hospitalId: user.hospitalId,
              channel: "INSTAGRAM",
            },
          },
          select: { credentialsEncrypted: true },
        });

      if (existingConnection?.credentialsEncrypted) {
        try {
          const credentials = decryptInstagramCredentials(
            existingConnection.credentialsEncrypted,
          );
          await unsubscribeInstagramWebhooks(
            credentials.instagramUserId,
            credentials.accessToken,
          );
        } catch {
          // Clear inaccessible local credentials even if Meta cannot be reached.
        }
      }
    }

    const connection = await getDatabase().channelConnection.update({
      where: {
        hospitalId_channel: {
          hospitalId: user.hospitalId,
          channel: channel as
            | "KAKAO"
            | "LINE"
            | "NAVER_TALK"
            | "WECHAT"
            | "WHATSAPP"
            | "INSTAGRAM",
        },
      },
      data: {
        status: "DISCONNECTED",
        externalAccountId: null,
        connectedAt: null,
        credentialsEncrypted: null,
      },
    });

    return Response.json({
      status: connection.status,
      displayName: connection.displayName,
      externalAccountId: connection.externalAccountId,
    });
  }

  const displayName = body?.displayName?.trim();
  const externalAccountId = body?.externalAccountId?.trim();

  if (!displayName || !externalAccountId) {
    return Response.json(
      { error: "채널 이름과 계정 식별자를 입력해 주세요." },
      { status: 400 },
    );
  }

  let credentialsEncrypted: string | undefined;

  if (channel === "LINE" && body?.lineCredentials) {
    const channelId = body.lineCredentials.channelId?.trim();
    const channelSecret = body.lineCredentials.channelSecret?.trim();
    const channelAccessToken = body.lineCredentials.channelAccessToken?.trim();

    if (!channelId || !channelSecret || !channelAccessToken) {
      return Response.json(
        {
          error:
            "LINE Channel ID, Channel secret, Channel access token을 모두 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
      cache: "no-store",
    }).catch(() => null);

    if (!botInfoResponse?.ok) {
      return Response.json(
        { error: "LINE Channel access token을 확인하지 못했습니다." },
        { status: 400 },
      );
    }

    const botInfo = (await botInfoResponse.json().catch(() => null)) as {
      basicId?: string;
    } | null;

    if (botInfo?.basicId && botInfo.basicId !== externalAccountId) {
      return Response.json(
        {
          error:
            "Channel access token이 입력한 Official Account Basic ID와 일치하지 않습니다.",
        },
        { status: 400 },
      );
    }

    credentialsEncrypted = encryptChannelCredentials({
      channelId,
      channelSecret,
      channelAccessToken,
    });
  }

  const connection = await getDatabase().channelConnection.upsert({
    where: {
      hospitalId_channel: {
        hospitalId: user.hospitalId,
        channel: channel as
          "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM",
      },
    },
    update: {
      displayName,
      externalAccountId,
      status: "CONFIGURING",
      credentialsEncrypted,
      connectedAt: null,
    },
    create: {
      hospitalId: user.hospitalId,
      channel: channel as
        "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM",
      displayName,
      externalAccountId,
      status: "CONFIGURING",
      credentialsEncrypted,
    },
  });

  return Response.json({
    status: connection.status,
    displayName: connection.displayName,
    externalAccountId: connection.externalAccountId,
    hasCredentials: Boolean(connection.credentialsEncrypted),
  });
}
