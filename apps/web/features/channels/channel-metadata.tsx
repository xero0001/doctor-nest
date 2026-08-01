import type { ComponentType } from "react";

import { InstagramChannelIcon } from "@/features/channels/components/instagram-channel-icon";
import { KakaoChannelIcon } from "@/features/channels/components/kakao-channel-icon";
import { LineChannelIcon } from "@/features/channels/components/line-channel-icon";
import { NaverTalkChannelIcon } from "@/features/channels/components/naver-talk-channel-icon";
import { WeChatChannelIcon } from "@/features/channels/components/wechat-channel-icon";
import { WhatsAppChannelIcon } from "@/features/channels/components/whatsapp-channel-icon";

export type ChannelType =
  | "KAKAO"
  | "LINE"
  | "NAVER_TALK"
  | "WECHAT"
  | "WHATSAPP"
  | "INSTAGRAM";

export type ChannelCardType =
  | ChannelType
  | "KAKAO_ALIMTALK"
  | "KAKAO_BRAND_MESSAGE";

type ChannelIconProps = {
  size: number;
  className?: string;
};

type ChannelMetadata = {
  label: string;
  icon: ComponentType<ChannelIconProps>;
};

export const CHANNEL_METADATA: Record<ChannelCardType, ChannelMetadata> = {
  KAKAO_ALIMTALK: {
    label: "카카오 알림톡",
    icon: KakaoChannelIcon,
  },
  KAKAO: {
    label: "카카오 상담톡",
    icon: KakaoChannelIcon,
  },
  KAKAO_BRAND_MESSAGE: {
    label: "카카오 브랜드메시지",
    icon: KakaoChannelIcon,
  },
  LINE: {
    label: "LINE",
    icon: LineChannelIcon,
  },
  NAVER_TALK: {
    label: "네이버 톡톡",
    icon: NaverTalkChannelIcon,
  },
  WECHAT: {
    label: "WeChat",
    icon: WeChatChannelIcon,
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: WhatsAppChannelIcon,
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: InstagramChannelIcon,
  },
};

export const CHANNEL_CARD_ORDER: ChannelCardType[] = [
  "KAKAO_ALIMTALK",
  "KAKAO",
  "KAKAO_BRAND_MESSAGE",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
];

export const AUTO_REPLY_CHANNEL_ORDER: ChannelType[] = [
  "KAKAO",
  "INSTAGRAM",
  "NAVER_TALK",
  "LINE",
  "WECHAT",
  "WHATSAPP",
];

export function ChannelIcon({
  channel,
  size,
  className,
}: ChannelIconProps & { channel: ChannelCardType }) {
  const Icon = CHANNEL_METADATA[channel].icon;
  return <Icon size={size} className={className} />;
}
