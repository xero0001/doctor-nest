"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  CircleAlert,
  CircleCheck,
  Clipboard,
  Clock3,
  ExternalLink,
  KeyRound,
  Link2,
  Languages,
  LoaderCircle,
  MessageCircleMore,
  RotateCcw,
  Save,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";

import { LineChannelIcon } from "@/features/channels/components/line-channel-icon";
import { InstagramChannelIcon } from "@/features/channels/components/instagram-channel-icon";
import { KakaoChannelIcon } from "@/features/channels/components/kakao-channel-icon";
import { NaverTalkChannelIcon } from "@/features/channels/components/naver-talk-channel-icon";
import { WeChatChannelIcon } from "@/features/channels/components/wechat-channel-icon";
import { WhatsAppChannelIcon } from "@/features/channels/components/whatsapp-channel-icon";

type ChannelType =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";
type ChannelCardType = ChannelType | "KAKAO_ALIMTALK" | "KAKAO_BRAND_MESSAGE";

type ConnectionStatus = "DISCONNECTED" | "CONFIGURING" | "CONNECTED" | "ERROR";

type Connection = {
  channel: ChannelType;
  status: ConnectionStatus;
  displayName: string | null;
  externalAccountId: string | null;
  webhookToken: string;
  hasCredentials: boolean;
};

type ChannelDefinition = {
  label: string;
  summary: string;
  owner: string;
  accountIdLabel: string;
  accountIdPlaceholder: string;
  badge: string;
  badgeClass: string;
  requirements: string[];
  steps: string[];
  guideUrl: string;
};

const channelOrder: ChannelCardType[] = [
  "KAKAO_ALIMTALK",
  "KAKAO",
  "KAKAO_BRAND_MESSAGE",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
];

const definitions: Record<ChannelCardType, ChannelDefinition> = {
  KAKAO_ALIMTALK: {
    label: "카카오 알림톡",
    summary: "정보성 알림과 자동화 안내 메시지를 알림톡으로 발송합니다.",
    owner: "병원 명의 카카오 비즈니스 채널",
    accountIdLabel: "발신 프로필 키",
    accountIdPlaceholder: "발신 프로필 키",
    badge: "K",
    badgeClass: "bg-[#fee500] text-[#252525]",
    requirements: ["비즈니스 채널", "발신프로필", "템플릿 승인"],
    steps: [],
    guideUrl: "https://business.kakao.com/info/bizmessage/",
  },
  KAKAO: {
    label: "카카오 상담톡",
    summary: "카카오톡 채널로 문의한 고객과 실시간 메시지를 주고받습니다.",
    owner: "병원 명의 카카오 비즈니스 채널",
    accountIdLabel: "채널 검색용 ID",
    accountIdPlaceholder: "@병원채널",
    badge: "K",
    badgeClass: "bg-[#fee500] text-[#252525]",
    requirements: ["비즈니스 채널", "비즈고 발신프로필", "상담톡 계약"],
    steps: [
      "병원 채널의 비즈니스 인증",
      "비즈고 발신프로필 등록",
      "닥터네스트 상담 웹훅 승인",
    ],
    guideUrl: "https://business.kakao.com/info/kakaotalkchannel/",
  },
  KAKAO_BRAND_MESSAGE: {
    label: "카카오 브랜드메시지",
    summary: "친구 여부와 관계없이 마케팅 자동화 메시지를 발송합니다.",
    owner: "병원 명의 카카오 비즈니스 채널",
    accountIdLabel: "채널 검색용 ID",
    accountIdPlaceholder: "@병원채널",
    badge: "K",
    badgeClass: "bg-[#fee500] text-[#252525]",
    requirements: ["비즈니스 채널", "브랜드메시지 계약", "수신 동의"],
    steps: [],
    guideUrl: "https://business.kakao.com/info/bizmessage/",
  },
  LINE: {
    label: "LINE",
    summary:
      "병원 LINE Official Account의 메시지를 Messaging API로 연결합니다.",
    owner: "",
    accountIdLabel: "Official Account Basic ID",
    accountIdPlaceholder: "@648wzhlw",
    badge: "L",
    badgeClass: "bg-[#06c755] text-white",
    requirements: ["Business ID", "Official Account", "Messaging API"],
    steps: [
      "병원 Provider 선택",
      "Messaging API 활성화",
      "웹훅과 Access Token 연결",
    ],
    guideUrl:
      "https://developers.line.biz/en/docs/messaging-api/getting-started/",
  },
  NAVER_TALK: {
    label: "네이버 톡톡",
    summary: "스마트플레이스와 연결된 병원 톡톡 문의를 통합합니다.",
    owner: "병원 사업자로 등록된 톡톡 계정",
    accountIdLabel: "톡톡 프로필 ID",
    accountIdPlaceholder: "w12345",
    badge: "N",
    badgeClass: "bg-[#03c75a] text-white",
    requirements: ["톡톡 파트너 계정", "챗봇 API", "Authorization"],
    steps: [
      "챗봇 API 사용 신청 및 약관 동의",
      "이벤트 받을 URL에 닥터네스트 웹훅 입력",
      "보내기 API Authorization 키 발급",
    ],
    guideUrl: "https://github.com/navertalk/chatbot-api",
  },
  WECHAT: {
    label: "WeChat",
    summary: "인증된 Service Official Account의 고객 문의를 연결합니다.",
    owner: "병원 명의 인증 Service Account",
    accountIdLabel: "Official Account AppID",
    accountIdPlaceholder: "wx1234567890",
    badge: "微",
    badgeClass: "bg-[#07c160] text-white",
    requirements: ["Service Account", "사업자 인증", "AppID·AppSecret"],
    steps: [
      "병원 Official Account 인증",
      "개발자 기본 설정 활성화",
      "AppID와 웹훅 검증",
    ],
    guideUrl:
      "https://developers.weixin.qq.com/doc/offiaccount/en/Getting_Started/Overview.html",
  },
  WHATSAPP: {
    label: "WhatsApp",
    summary: "병원의 WABA와 전화번호를 Meta Cloud API로 연결합니다.",
    owner: "병원 소유 WABA와 WhatsApp 전화번호",
    accountIdLabel: "WABA ID",
    accountIdPlaceholder: "123456789012345",
    badge: "W",
    badgeClass: "bg-[#25d366] text-white",
    requirements: ["Meta Business", "WABA", "전화번호 인증"],
    steps: [
      "Embedded Signup 진행",
      "병원 WABA 권한 승인",
      "전화번호와 웹훅 연결",
    ],
    guideUrl: "https://developers.facebook.com/docs/whatsapp/embedded-signup/",
  },
  INSTAGRAM: {
    label: "Instagram",
    summary: "병원 Instagram Professional 계정의 DM을 고객채팅으로 연결합니다.",
    owner: "병원 소유 Professional Account",
    accountIdLabel: "Instagram Account ID",
    accountIdPlaceholder: "17841400000000000",
    badge: "IG",
    badgeClass:
      "bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white",
    requirements: ["Professional 계정", "Meta Business 앱", "Messaging 권한"],
    steps: [
      "Professional 계정 확인",
      "Meta Business Login 승인",
      "DM 웹훅 구독",
    ],
    guideUrl:
      "https://developers.facebook.com/docs/messenger-platform/instagram/",
  },
};

const statusMeta: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  DISCONNECTED: { label: "미연동", className: "bg-[#f1f3f7] text-[#7d8496]" },
  CONFIGURING: { label: "설정 중", className: "bg-[#fff4d8] text-[#a66c00]" },
  CONNECTED: { label: "연동 완료", className: "bg-[#eaf8f1] text-[#178c56]" },
  ERROR: { label: "확인 필요", className: "bg-[#fff0f2] text-[#d8465b]" },
};

type AISettings = {
  translationContextEnabled: boolean;
  translationContextMessageCount: number;
  chatCoachContextEnabled: boolean;
  chatCoachContextMessageCount: number;
  autoResponseContextEnabled: boolean;
  autoResponseContextMessageCount: number;
  autoResponseDelayMinutes: number;
};

export function ChannelsClient({
  connections: initialConnections,
  organizationName,
  appUrl,
  instagramResult,
  instagramOAuthConfigured,
  aiSettings,
}: {
  connections: Connection[];
  organizationName: string;
  appUrl: string;
  instagramResult: string | null;
  instagramOAuthConfigured: boolean;
  aiSettings: AISettings;
}) {
  const [activeTab] = useState<"채널" | "AI 상담">("채널");
  const [connections, setConnections] = useState(initialConnections);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(
    null,
  );
  const [displayName, setDisplayName] = useState("");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");
  const [naverTalkAuthorization, setNaverTalkAuthorization] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [translationContextEnabled, setTranslationContextEnabled] = useState(
    aiSettings.translationContextEnabled,
  );
  const [translationContextMessageCount, setTranslationContextMessageCount] =
    useState(aiSettings.translationContextMessageCount);
  const [chatCoachContextEnabled, setChatCoachContextEnabled] = useState(
    aiSettings.chatCoachContextEnabled,
  );
  const [chatCoachContextMessageCount, setChatCoachContextMessageCount] =
    useState(aiSettings.chatCoachContextMessageCount);
  const [autoResponseContextEnabled, setAutoResponseContextEnabled] = useState(
    aiSettings.autoResponseContextEnabled,
  );
  const [autoResponseContextMessageCount, setAutoResponseContextMessageCount] =
    useState(aiSettings.autoResponseContextMessageCount);
  const [autoResponseDelayMinutes, setAutoResponseDelayMinutes] = useState(
    aiSettings.autoResponseDelayMinutes,
  );
  const [isSavingAISettings, setIsSavingAISettings] = useState(false);
  const [aiSettingsError, setAISettingsError] = useState("");
  const [aiSettingsSaved, setAISettingsSaved] = useState(false);

  const selectedConnection = useMemo(
    () =>
      connections.find(
        (connection) => connection.channel === selectedChannel,
      ) ?? null,
    [connections, selectedChannel],
  );

  function openConnection(channel: ChannelType) {
    const connection = connections.find((item) => item.channel === channel);
    setSelectedChannel(channel);
    setDisplayName(
      connection?.displayName ??
        `${organizationName} ${definitions[channel].label}`,
    );
    setExternalAccountId(connection?.externalAccountId ?? "");
    setLineChannelId("");
    setLineChannelSecret("");
    setLineChannelAccessToken("");
    setNaverTalkAuthorization("");
    setError("");
    setCopied(false);
  }

  async function saveConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel) return;

    setIsSaving(true);
    setError("");

    try {
      const hasNewLineCredentials =
        selectedChannel === "LINE" &&
        Boolean(lineChannelId || lineChannelSecret || lineChannelAccessToken);
      const hasNewNaverTalkCredentials =
        selectedChannel === "NAVER_TALK" && Boolean(naverTalkAuthorization);
      const response = await fetch(
        `/api/channel-connections/${selectedChannel}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            displayName,
            externalAccountId,
            lineCredentials: hasNewLineCredentials
              ? {
                  channelId: lineChannelId,
                  channelSecret: lineChannelSecret,
                  channelAccessToken: lineChannelAccessToken,
                }
              : undefined,
            naverTalkCredentials: hasNewNaverTalkCredentials
              ? { authorization: naverTalkAuthorization }
              : undefined,
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        status?: ConnectionStatus;
        displayName?: string;
        externalAccountId?: string;
        hasCredentials?: boolean;
      };

      if (!response.ok || !result.status) {
        setError(result.error ?? "연동 설정을 저장하지 못했습니다.");
        return;
      }

      setConnections((current) =>
        current.map((connection) =>
          connection.channel === selectedChannel
            ? {
                ...connection,
                status: result.status!,
                displayName: result.displayName ?? null,
                externalAccountId: result.externalAccountId ?? null,
                hasCredentials:
                  result.hasCredentials ?? connection.hasCredentials,
              }
            : connection,
        ),
      );
      setSelectedChannel(null);
    } catch {
      setError("연동 설정 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function disconnect(channel: ChannelType) {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/channel-connections/${channel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      const result = (await response.json()) as {
        status?: ConnectionStatus;
        error?: string;
      };

      if (!response.ok || !result.status) {
        setError(result.error ?? "연동을 해제하지 못했습니다.");
        return;
      }

      setConnections((current) =>
        current.map((connection) =>
          connection.channel === channel
            ? {
                ...connection,
                status: result.status!,
                externalAccountId: null,
                hasCredentials: false,
              }
            : connection,
        ),
      );
      setSelectedChannel(null);
    } catch {
      setError("연동 해제 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAISettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingAISettings(true);
    setAISettingsError("");
    setAISettingsSaved(false);

    try {
      const response = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translationContextEnabled,
          translationContextMessageCount,
          chatCoachContextEnabled,
          chatCoachContextMessageCount,
          autoResponseContextEnabled,
          autoResponseContextMessageCount,
          autoResponseDelayMinutes,
        }),
      });
      const result = (await response.json()) as Partial<AISettings> & {
        error?: string;
      };

      if (
        !response.ok ||
        typeof result.translationContextEnabled !== "boolean" ||
        typeof result.translationContextMessageCount !== "number" ||
        typeof result.chatCoachContextEnabled !== "boolean" ||
        typeof result.chatCoachContextMessageCount !== "number" ||
        typeof result.autoResponseContextEnabled !== "boolean" ||
        typeof result.autoResponseContextMessageCount !== "number" ||
        typeof result.autoResponseDelayMinutes !== "number"
      ) {
        setAISettingsError(
          result.error ?? "AI 상담 설정을 저장하지 못했습니다.",
        );
        return;
      }

      setTranslationContextEnabled(result.translationContextEnabled);
      setTranslationContextMessageCount(result.translationContextMessageCount);
      setChatCoachContextEnabled(result.chatCoachContextEnabled);
      setChatCoachContextMessageCount(result.chatCoachContextMessageCount);
      setAutoResponseContextEnabled(result.autoResponseContextEnabled);
      setAutoResponseContextMessageCount(
        result.autoResponseContextMessageCount,
      );
      setAutoResponseDelayMinutes(result.autoResponseDelayMinutes);
      setAISettingsSaved(true);
    } catch {
      setAISettingsError("AI 상담 설정 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSavingAISettings(false);
    }
  }

  const connectedCount = connections.filter(
    (connection) => connection.status === "CONNECTED",
  ).length;
  const configuringCount = connections.filter(
    (connection) => connection.status === "CONFIGURING",
  ).length;
  const selectedDefinition = selectedChannel
    ? definitions[selectedChannel]
    : null;
  const webhookUrl =
    selectedChannel && selectedConnection
      ? `${appUrl}/api/webhooks/${selectedChannel}/${selectedConnection.webhookToken}`
      : "";
  const usesMetaWebhook =
    selectedChannel === "WHATSAPP" || selectedChannel === "INSTAGRAM";
  const instagramResultMessage =
    instagramResult === "connected"
      ? {
          tone: "success",
          message: "Instagram 계정 연결과 DM 웹훅 구독을 완료했습니다.",
        }
      : instagramResult
        ? {
            tone: "error",
            message:
              instagramResult === "already_connected"
                ? "이 Instagram 계정은 이미 다른 병원에 연결되어 있습니다."
                : instagramResult === "session_expired"
                  ? "로그인 세션이 만료되었습니다. 다시 로그인한 뒤 연결해 주세요."
                  : instagramResult === "configuration_error"
                    ? "Instagram 앱 ID와 앱 시크릿 환경변수를 확인해 주세요."
                    : "Instagram 계정을 연결하지 못했습니다. 권한 승인 상태를 확인해 주세요.",
          }
        : null;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f7fb]">
      {activeTab === "채널" ? (
        <div className="mx-auto max-w-[1180px] px-8 py-7">
          {instagramResultMessage ? (
            <div
              role="status"
              className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
                instagramResultMessage.tone === "success"
                  ? "border-[#cdebdc] bg-[#eef9f4] text-[#178c56]"
                  : "border-[#ffd7dd] bg-[#fff3f5] text-[#c33d52]"
              }`}
            >
              {instagramResultMessage.tone === "success" ? (
                <CircleCheck className="size-4" />
              ) : (
                <CircleAlert className="size-4" />
              )}
              {instagramResultMessage.message}
            </div>
          ) : null}
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
              <p className="text-xs font-semibold text-[#8d94a6]">지원 채널</p>
              <p className="mt-2 text-2xl font-bold">{channelOrder.length}개</p>
            </div>
            <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
              <p className="text-xs font-semibold text-[#8d94a6]">연동 완료</p>
              <p className="mt-2 text-2xl font-bold text-[#15945a]">
                {connectedCount}개
              </p>
            </div>
            <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
              <p className="text-xs font-semibold text-[#8d94a6]">
                설정 진행 중
              </p>
              <p className="mt-2 text-2xl font-bold text-[#a66c00]">
                {configuringCount}개
              </p>
            </div>
          </section>

          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">고객 상담 채널</h2>
              <p className="mt-1 text-sm text-[#8b92a5]">
                운영 채널은 각 병원 명의 계정으로 연결됩니다.
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-[#edf8f2] px-3 py-1.5 text-xs font-bold text-[#1b965c]">
              <ShieldCheck className="size-3" /> 병원별 데이터 분리
            </span>
          </div>

          <section className="grid gap-4 lg:grid-cols-2">
            {channelOrder.map((channel) => {
              const definition = definitions[channel];
              const isComingSoon =
                channel === "KAKAO_ALIMTALK" ||
                channel === "KAKAO_BRAND_MESSAGE";
              const connection = isComingSoon
                ? null
                : connections.find((item) => item.channel === channel)!;
              const status = connection
                ? statusMeta[connection.status]
                : {
                    label: "준비 중",
                    className: "bg-[#f1f3f7] text-[#8b92a2]",
                  };

              return (
                <article
                  key={channel}
                  className="rounded-2xl border border-[#dfe4ef] bg-white p-5 shadow-[0_8px_30px_rgba(36,47,95,0.04)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {channel.startsWith("KAKAO") ? (
                        <KakaoChannelIcon size={44} />
                      ) : channel === "LINE" ? (
                        <LineChannelIcon size={44} />
                      ) : channel === "NAVER_TALK" ? (
                        <NaverTalkChannelIcon size={44} />
                      ) : channel === "WECHAT" ? (
                        <WeChatChannelIcon size={44} />
                      ) : channel === "WHATSAPP" ? (
                        <WhatsAppChannelIcon size={44} />
                      ) : channel === "INSTAGRAM" ? (
                        <InstagramChannelIcon size={44} />
                      ) : (
                        <span
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-xs font-extrabold shadow-sm ${definition.badgeClass}`}
                        >
                          {definition.badge}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold">
                            {definition.label}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#8c93a5]">
                          {connection?.externalAccountId ?? definition.owner}
                        </p>
                      </div>
                    </div>
                    {connection && connection.status !== "DISCONNECTED" ? (
                      <CircleCheck className="size-5 shrink-0 text-[#1aa464]" />
                    ) : (
                      <Link2 className="size-5 shrink-0 text-[#b2b7c4]" />
                    )}
                  </div>

                  <p className="mt-4 min-h-10 text-sm leading-6 text-[#6e768b]">
                    {definition.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {definition.requirements.map((requirement) => (
                      <span
                        key={requirement}
                        className="rounded-md bg-[#f2f4f8] px-2 py-1 text-xs font-semibold text-[#72798d]"
                      >
                        {requirement}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isComingSoon}
                    onClick={() => {
                      if (!isComingSoon) openConnection(channel);
                    }}
                    className={`mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                      isComingSoon
                        ? "cursor-not-allowed bg-[#eef0f4] text-[#9da3b1]"
                        : connection?.status === "DISCONNECTED"
                          ? "bg-[#3157f6] text-white"
                          : "border border-[#dce1eb] bg-white text-[#59617a] hover:bg-[#f8f9fc]"
                    }`}
                  >
                    {isComingSoon
                      ? "준비 중"
                      : connection?.status === "DISCONNECTED"
                        ? "연동 시작"
                        : "연동 설정 보기"}
                    {!isComingSoon ? <ArrowRight className="size-3.5" /> : null}
                  </button>
                </article>
              );
            })}
          </section>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#dce3f7] bg-[#f2f5ff] p-4">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#526ce4]" />
            <div className="text-sm leading-6 text-[#66708a]">
              <p className="font-bold text-[#4054b7]">외부 채널 승인 안내</p>
              <p>
                계정 식별자와 웹훅을 저장하면 설정 중 상태가 됩니다. 실제 메시지
                송수신은 각 플랫폼의 앱 심사, 사업자 인증 및 API 자격증명 검증이
                완료된 뒤 활성화됩니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1180px] px-8 py-7">
          <form onSubmit={saveAISettings} className="max-w-[860px] space-y-5">
            <section className="rounded-2xl border border-[#dfe4ef] bg-white p-6 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf1ff] text-[#3157f6]">
                    <Languages className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#2d3448]">
                      번역시 컨텍스트 참고
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#777f93]">
                      번역할 메시지 앞의 대화를 함께 확인해 시술명, 일정과
                      생략된 표현을 더 정확하게 번역합니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={translationContextEnabled}
                  aria-label="번역시 컨텍스트 참고"
                  onClick={() => {
                    setTranslationContextEnabled((current) => !current);
                    setAISettingsSaved(false);
                  }}
                  className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${
                    translationContextEnabled ? "bg-[#3157f6]" : "bg-[#cbd1dc]"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      translationContextEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div
                className={`mt-6 rounded-2xl border p-5 transition-colors ${
                  translationContextEnabled
                    ? "border-[#dce3f7] bg-[#f7f9ff]"
                    : "border-[#e5e8ef] bg-[#f8f9fb]"
                }`}
              >
                <label className="block max-w-[320px]">
                  <span className="text-sm font-bold text-[#596177]">
                    참고할 최근 메시지 수
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      disabled={!translationContextEnabled}
                      value={translationContextMessageCount}
                      onChange={(event) => {
                        setTranslationContextMessageCount(
                          Number(event.target.value),
                        );
                        setAISettingsSaved(false);
                      }}
                      className="h-11 w-28 rounded-xl border border-[#d9deea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10 disabled:cursor-not-allowed disabled:bg-[#eef0f4] disabled:text-[#9ba1af]"
                    />
                    <span className="text-sm text-[#777f93]">개</span>
                  </div>
                </label>
                <p className="mt-3 text-xs leading-5 text-[#8b92a5]">
                  번역 결과에는 새 메시지만 포함되며, 이전 메시지는 표현과
                  용어를 이해하는 데만 사용합니다.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe4ef] bg-white p-6 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0edff] text-[#6b55df]">
                    <MessageCircleMore className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#2d3448]">
                      AI 상담 코칭시 컨텍스트 참고
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#777f93]">
                      응대 가이드와 답변 예시를 만들 때 최근 대화를 함께
                      확인합니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={chatCoachContextEnabled}
                  aria-label="AI 상담 코칭시 컨텍스트 참고"
                  onClick={() => {
                    setChatCoachContextEnabled((current) => !current);
                    setAISettingsSaved(false);
                  }}
                  className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${
                    chatCoachContextEnabled ? "bg-[#6b55df]" : "bg-[#cbd1dc]"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      chatCoachContextEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div
                className={`mt-6 rounded-2xl border p-5 transition-colors ${
                  chatCoachContextEnabled
                    ? "border-[#e2dcfb] bg-[#faf8ff]"
                    : "border-[#e5e8ef] bg-[#f8f9fb]"
                }`}
              >
                <label className="block max-w-[320px]">
                  <span className="text-sm font-bold text-[#596177]">
                    코칭에 참고할 최근 메시지 수
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      disabled={!chatCoachContextEnabled}
                      value={chatCoachContextMessageCount}
                      onChange={(event) => {
                        setChatCoachContextMessageCount(
                          Number(event.target.value),
                        );
                        setAISettingsSaved(false);
                      }}
                      className="h-11 w-28 rounded-xl border border-[#d9deea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#8d78ea] focus:ring-3 focus:ring-[#6b55df]/10 disabled:cursor-not-allowed disabled:bg-[#eef0f4] disabled:text-[#9ba1af]"
                    />
                    <span className="text-sm text-[#777f93]">개</span>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dfe4ef] bg-white p-6 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf8f1] text-[#15945a]">
                    <Bot className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#2d3448]">
                      자동 응대 설정
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#777f93]">
                      자동 응대가 켜진 채팅은 마지막 고객 메시지 이후 설정한
                      시간이 지나면 AI가 답변을 생성해 발송합니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={autoResponseContextEnabled}
                  aria-label="자동 응대시 컨텍스트 참고"
                  onClick={() => {
                    setAutoResponseContextEnabled((current) => !current);
                    setAISettingsSaved(false);
                  }}
                  className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${
                    autoResponseContextEnabled ? "bg-[#15945a]" : "bg-[#cbd1dc]"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      autoResponseContextEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-6 grid gap-4 rounded-2xl border border-[#d7ede2] bg-[#f5fbf8] p-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[#596177]">
                    자동 응대시 참고할 최근 메시지 수
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      disabled={!autoResponseContextEnabled}
                      value={autoResponseContextMessageCount}
                      onChange={(event) => {
                        setAutoResponseContextMessageCount(
                          Number(event.target.value),
                        );
                        setAISettingsSaved(false);
                      }}
                      className="h-11 w-28 rounded-xl border border-[#d9deea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#62b68c] focus:ring-3 focus:ring-[#15945a]/10 disabled:cursor-not-allowed disabled:bg-[#eef0f4] disabled:text-[#9ba1af]"
                    />
                    <span className="text-sm text-[#777f93]">개</span>
                  </div>
                </label>

                <label className="block">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[#596177]">
                    <Clock3 className="size-4 text-[#15945a]" />
                    답변 전 대기시간
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={autoResponseDelayMinutes}
                      onChange={(event) => {
                        setAutoResponseDelayMinutes(Number(event.target.value));
                        setAISettingsSaved(false);
                      }}
                      className="h-11 w-28 rounded-xl border border-[#d9deea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#62b68c] focus:ring-3 focus:ring-[#15945a]/10"
                    />
                    <span className="text-sm text-[#777f93]">분</span>
                  </div>
                </label>
              </div>

              <p className="mt-3 text-xs leading-5 text-[#8b92a5]">
                직원이나 AI가 먼저 답변했거나 대기 중 새 메시지가 도착하면 이전
                메시지에 대한 자동 응대는 발송하지 않습니다. Cron은 1분마다
                대상을 확인합니다.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#8b92a5]">
                현재 실제 자동 발송은 LINE, 네이버 톡톡, Instagram 중 발신 API가
                연결된 채널에서 동작합니다.
              </p>
            </section>

            {aiSettingsError ? (
              <p
                role="alert"
                className="rounded-xl bg-[#fff0f2] px-4 py-3 text-sm font-semibold text-[#d8465b]"
              >
                {aiSettingsError}
              </p>
            ) : null}

            {aiSettingsSaved ? (
              <p className="rounded-xl bg-[#edf8f2] px-4 py-3 text-sm font-semibold text-[#178c56]">
                AI 상담 설정을 저장했습니다.
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  isSavingAISettings ||
                  !Number.isInteger(translationContextMessageCount) ||
                  translationContextMessageCount < 1 ||
                  translationContextMessageCount > 50 ||
                  !Number.isInteger(chatCoachContextMessageCount) ||
                  chatCoachContextMessageCount < 1 ||
                  chatCoachContextMessageCount > 50 ||
                  !Number.isInteger(autoResponseContextMessageCount) ||
                  autoResponseContextMessageCount < 1 ||
                  autoResponseContextMessageCount > 50 ||
                  !Number.isInteger(autoResponseDelayMinutes) ||
                  autoResponseDelayMinutes < 1 ||
                  autoResponseDelayMinutes > 1440
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSavingAISettings ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                설정 저장
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedChannel && selectedDefinition && selectedConnection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#13182c]/35 p-6 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedChannel(null)}
            aria-label="연동 설정 닫기"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedDefinition.label} 연동 설정`}
            className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl border border-[#e2e6ee] bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-[#e5e8ef] px-6 py-5">
              <div className="flex items-center gap-3">
                {selectedChannel === "KAKAO" ? (
                  <KakaoChannelIcon size={40} />
                ) : selectedChannel === "LINE" ? (
                  <LineChannelIcon size={40} />
                ) : selectedChannel === "NAVER_TALK" ? (
                  <NaverTalkChannelIcon size={40} />
                ) : selectedChannel === "WECHAT" ? (
                  <WeChatChannelIcon size={40} />
                ) : selectedChannel === "WHATSAPP" ? (
                  <WhatsAppChannelIcon size={40} />
                ) : selectedChannel === "INSTAGRAM" ? (
                  <InstagramChannelIcon size={40} />
                ) : (
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl text-xs font-extrabold ${selectedDefinition.badgeClass}`}
                  >
                    {selectedDefinition.badge}
                  </span>
                )}
                <div>
                  <h2 className="text-base font-bold">
                    {selectedDefinition.label} 연동
                  </h2>
                  {selectedDefinition.owner ? (
                    <p className="mt-0.5 text-xs text-[#8d94a6]">
                      {selectedDefinition.owner}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                aria-label="닫기"
                className="flex size-9 items-center justify-center rounded-lg text-[#858c9e] hover:bg-[#f2f4f8]"
              >
                <X className="size-4" />
              </button>
            </header>

            <form
              onSubmit={saveConnection}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6"
            >
              <section className="rounded-2xl border border-[#e0e5ef] bg-[#fafbfe] p-4">
                <p className="text-sm font-bold text-[#4f576d]">
                  연동 전에 확인해 주세요
                </p>
                <ol className="mt-3 space-y-2.5">
                  {selectedDefinition.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-center gap-2.5 text-sm text-[#72798c]"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e9edff] text-xs font-bold text-[#3157f6]">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <div className="mt-6 space-y-4">
                {selectedChannel !== "INSTAGRAM" ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        채널 표시 이름
                      </span>
                      <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dde2ec] px-3 focus-within:border-[#6f83f2] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                        <MessageCircleMore className="size-3.5 text-[#989fb1]" />
                        <input
                          value={displayName}
                          onChange={(event) =>
                            setDisplayName(event.target.value)
                          }
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                          placeholder={`${organizationName} ${selectedDefinition.label}`}
                        />
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        {selectedDefinition.accountIdLabel}
                      </span>
                      <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dde2ec] px-3 focus-within:border-[#6f83f2] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                        <KeyRound className="size-3.5 text-[#989fb1]" />
                        <input
                          value={externalAccountId}
                          onChange={(event) =>
                            setExternalAccountId(event.target.value)
                          }
                          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                          placeholder={selectedDefinition.accountIdPlaceholder}
                        />
                      </span>
                    </label>
                  </>
                ) : (
                  <section className="rounded-2xl border border-[#e0e5ef] bg-[#fafbfe] p-4">
                    <p className="text-sm font-bold text-[#4f576d]">
                      Instagram Business Login
                    </p>
                    {selectedConnection.status === "CONNECTED" ? (
                      <div className="mt-3 rounded-xl border border-[#d7eadf] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#178c56]">
                          <CircleCheck className="size-4" />
                          {selectedConnection.displayName ?? "Instagram 계정"}
                        </div>
                        <p className="mt-2 font-mono text-xs text-[#777f93]">
                          계정 ID {selectedConnection.externalAccountId}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#858c9e]">
                          이 병원으로 들어오는 Instagram DM이 고객채팅에
                          자동으로 표시됩니다.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs leading-5 text-[#777f93]">
                          병원 Instagram Business 계정으로 로그인하면 DM 권한과
                          웹훅 구독이 자동으로 설정됩니다. 비밀번호와 액세스
                          토큰은 화면에 입력하지 않습니다.
                        </p>
                        {!instagramOAuthConfigured ? (
                          <p className="mt-3 rounded-lg bg-[#fff0f2] px-3 py-2 text-xs font-semibold text-[#d8465b]">
                            서버의 Instagram 앱 ID와 앱 시크릿 설정이
                            필요합니다.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </section>
                )}

                {selectedChannel === "LINE" ? (
                  <div className="space-y-4 rounded-2xl border border-[#dfe5f0] bg-[#fafbfe] p-4">
                    <div>
                      <p className="text-sm font-bold text-[#4f576d]">
                        Messaging API 자격증명
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#858c9e]">
                        LINE Developers Console에서 확인한 값을 입력하세요.
                        {selectedConnection.hasCredentials
                          ? " 현재 자격증명이 등록되어 있으며, 변경할 때만 다시 입력하면 됩니다."
                          : ""}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        Channel ID
                      </span>
                      <input
                        value={lineChannelId}
                        onChange={(event) =>
                          setLineChannelId(event.target.value)
                        }
                        autoComplete="off"
                        className="h-11 w-full rounded-xl border border-[#dde2ec] bg-white px-3 font-mono text-xs outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : "1234567890"
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        Channel secret
                      </span>
                      <input
                        type="password"
                        value={lineChannelSecret}
                        onChange={(event) =>
                          setLineChannelSecret(event.target.value)
                        }
                        autoComplete="new-password"
                        className="h-11 w-full rounded-xl border border-[#dde2ec] bg-white px-3 font-mono text-xs outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : "Channel secret"
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        Channel access token
                      </span>
                      <textarea
                        value={lineChannelAccessToken}
                        onChange={(event) =>
                          setLineChannelAccessToken(event.target.value)
                        }
                        autoComplete="off"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#dde2ec] bg-white px-3 py-3 font-mono text-xs outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : "발급한 access token"
                        }
                      />
                    </label>
                  </div>
                ) : null}

                {selectedChannel === "NAVER_TALK" ? (
                  <div className="space-y-4 rounded-2xl border border-[#dfe5f0] bg-[#fafbfe] p-4">
                    <div>
                      <p className="text-sm font-bold text-[#4f576d]">
                        챗봇 보내기 API 자격증명
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#858c9e]">
                        톡톡 파트너센터의 챗봇API 설정에서 발급한 Authorization
                        키를 입력하세요.
                        {selectedConnection.hasCredentials
                          ? " 현재 키가 암호화되어 등록되어 있으며, 변경할 때만 다시 입력하면 됩니다."
                          : ""}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#596177]">
                        Authorization
                      </span>
                      <input
                        type="password"
                        value={naverTalkAuthorization}
                        onChange={(event) =>
                          setNaverTalkAuthorization(event.target.value)
                        }
                        autoComplete="new-password"
                        className="h-11 w-full rounded-xl border border-[#dde2ec] bg-white px-3 font-mono text-xs outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : "ct_..."
                        }
                      />
                    </label>

                    <p className="flex items-start gap-1.5 text-xs leading-5 text-[#858c9e]">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                      키는 병원별로 암호화 저장되며 저장 후 다시 표시되지
                      않습니다.
                    </p>
                  </div>
                ) : null}

                {!usesMetaWebhook ? (
                  <div>
                    <span className="mb-2 block text-sm font-bold text-[#596177]">
                      닥터네스트 웹훅 URL
                    </span>
                    <div className="flex items-center gap-2 rounded-xl border border-[#dde2ec] bg-[#f8f9fc] p-2">
                      <code className="min-w-0 flex-1 truncate px-1 text-xs text-[#697186]">
                        {webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(webhookUrl);
                          setCopied(true);
                        }}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce1eb] bg-white px-2.5 text-xs font-bold text-[#59617a]"
                      >
                        {copied ? (
                          <Check className="size-3 text-[#1aa464]" />
                        ) : (
                          <Clipboard className="size-3" />
                        )}
                        {copied ? "복사됨" : "복사"}
                      </button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#9298a8]">
                      <Webhook className="size-3" />
                      채널 개발자 콘솔의 이벤트 수신 URL에 입력합니다.
                    </p>
                  </div>
                ) : null}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-semibold text-[#d8465b]"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-2">
                {selectedConnection.status !== "DISCONNECTED" ? (
                  <button
                    type="button"
                    onClick={() => disconnect(selectedChannel)}
                    disabled={isSaving}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#e0e4ec] px-4 text-xs font-bold text-[#7a8194] hover:bg-[#f7f8fb]"
                  >
                    <RotateCcw className="size-3.5" /> 연동 해제
                  </button>
                ) : null}
                {selectedChannel === "INSTAGRAM" ? (
                  selectedConnection.status !== "CONNECTED" ? (
                    <a
                      href="/api/integrations/meta/instagram/connect"
                      aria-disabled={!instagramOAuthConfigured}
                      className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white ${
                        instagramOAuthConfigured
                          ? "bg-[#3157f6]"
                          : "pointer-events-none bg-[#aeb9e8]"
                      }`}
                    >
                      <Link2 className="size-3.5" />
                      Instagram 계정 연결
                    </a>
                  ) : (
                    <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf8f2] text-xs font-bold text-[#178c56]">
                      <CircleCheck className="size-3.5" />
                      DM 연동 중
                    </div>
                  )
                ) : (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3157f6] text-xs font-bold text-white disabled:opacity-60"
                  >
                    {isSaving ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-3.5" />
                    )}
                    연동 설정 저장
                  </button>
                )}
              </div>

              <a
                href={selectedDefinition.guideUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#75809c]"
              >
                {selectedDefinition.label} 공식 연동 가이드
                <ExternalLink className="size-3" />
              </a>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
