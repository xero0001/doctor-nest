import { getDatabase } from "@doctornest/database";

import type {
  AutoReplyChannel,
  ChannelAutoReplyRecord,
} from "@/features/settings/components/channel-auto-reply-client";
import { getCurrentUser } from "@/lib/auth";

const allowedChannels = new Set<AutoReplyChannel>([
  "KAKAO",
  "INSTAGRAM",
  "NAVER_TALK",
  "LINE",
  "WECHAT",
  "WHATSAPP",
]);

type ParsedSetting = Omit<ChannelAutoReplyRecord, "connected">;

function parseSetting(value: unknown): ParsedSetting | null {
  if (!value || typeof value !== "object") return null;
  const setting = value as Record<string, unknown>;
  if (
    typeof setting.channel !== "string" ||
    !allowedChannels.has(setting.channel as AutoReplyChannel) ||
    typeof setting.delayMinutes !== "number" ||
    !Number.isInteger(setting.delayMinutes) ||
    setting.delayMinutes < 1 ||
    setting.delayMinutes > 1_440 ||
    typeof setting.businessHoursEnabled !== "boolean" ||
    typeof setting.businessHoursMessage !== "string" ||
    setting.businessHoursMessage.length > 2_000 ||
    typeof setting.outsideBusinessHoursEnabled !== "boolean" ||
    typeof setting.outsideBusinessHoursMessage !== "string" ||
    setting.outsideBusinessHoursMessage.length > 2_000
  ) {
    return null;
  }
  if (
    (setting.businessHoursEnabled && !setting.businessHoursMessage.trim()) ||
    (setting.outsideBusinessHoursEnabled &&
      !setting.outsideBusinessHoursMessage.trim())
  ) {
    return null;
  }
  return {
    channel: setting.channel as AutoReplyChannel,
    delayMinutes: setting.delayMinutes,
    businessHoursEnabled: setting.businessHoursEnabled,
    businessHoursMessage: setting.businessHoursMessage.trim(),
    outsideBusinessHoursEnabled: setting.outsideBusinessHoursEnabled,
    outsideBusinessHoursMessage: setting.outsideBusinessHoursMessage.trim(),
  };
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    settings?: unknown[];
  } | null;
  if (!Array.isArray(body?.settings)) {
    return Response.json(
      { error: "자동응대 설정을 확인해 주세요." },
      { status: 400 },
    );
  }
  const settings = body.settings.map(parseSetting);
  if (
    settings.some((setting) => !setting) ||
    new Set(settings.map((setting) => setting?.channel)).size !==
      settings.length
  ) {
    return Response.json(
      { error: "메시지가 활성화된 항목은 안내 내용을 입력해 주세요." },
      { status: 400 },
    );
  }

  const parsedSettings = settings as ParsedSetting[];
  const database = getDatabase();
  await database.$transaction(
    parsedSettings.map((setting) =>
      database.channelAutoReplySetting.upsert({
        where: {
          hospitalId_channel: {
            hospitalId: user.hospitalId,
            channel: setting.channel,
          },
        },
        update: setting,
        create: { hospitalId: user.hospitalId, ...setting },
      }),
    ),
  );

  const [connections, savedSettings] = await Promise.all([
    database.channelConnection.findMany({
      where: { hospitalId: user.hospitalId },
      select: { channel: true, status: true },
    }),
    database.channelAutoReplySetting.findMany({
      where: { hospitalId: user.hospitalId },
    }),
  ]);
  return Response.json({
    settings: parsedSettings.map((setting) => {
      const saved = savedSettings.find(
        (item) => item.channel === setting.channel,
      );
      return {
        channel: setting.channel,
        connected: connections.some(
          (connection) =>
            connection.channel === setting.channel &&
            connection.status === "CONNECTED",
        ),
        delayMinutes: saved?.delayMinutes ?? setting.delayMinutes,
        businessHoursEnabled:
          saved?.businessHoursEnabled ?? setting.businessHoursEnabled,
        businessHoursMessage:
          saved?.businessHoursMessage ?? setting.businessHoursMessage,
        outsideBusinessHoursEnabled:
          saved?.outsideBusinessHoursEnabled ??
          setting.outsideBusinessHoursEnabled,
        outsideBusinessHoursMessage:
          saved?.outsideBusinessHoursMessage ??
          setting.outsideBusinessHoursMessage,
      };
    }),
  });
}
