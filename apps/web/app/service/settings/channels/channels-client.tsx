"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
  Clipboard,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  MessageCircleMore,
  RotateCcw,
  Settings,
  ShieldCheck,
  Webhook,
  X,
} from "lucide-react";

type ChannelType =
  "KAKAO" | "LINE" | "NAVER_TALK" | "WECHAT" | "WHATSAPP" | "INSTAGRAM";

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

const channelOrder: ChannelType[] = [
  "KAKAO",
  "LINE",
  "NAVER_TALK",
  "WECHAT",
  "WHATSAPP",
  "INSTAGRAM",
];

const definitions: Record<ChannelType, ChannelDefinition> = {
  KAKAO: {
    label: "카카오",
    summary: "알림톡과 카카오톡 채널 1:1 상담을 고객채팅으로 연결합니다.",
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
  LINE: {
    label: "LINE",
    summary:
      "병원 LINE Official Account의 메시지를 Messaging API로 연결합니다.",
    owner: "병원 명의 Official Account와 Provider",
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
      "병원 톡톡 계정 생성",
      "챗봇 API 사용 신청",
      "Authorization과 이벤트 URL 설정",
    ],
    guideUrl: "https://partner.talk.naver.com/",
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

const settingTabs = ["병원 정보", "사용자", "채널", "AI 상담", "보안"];

export function ChannelsClient({
  connections: initialConnections,
  organizationName,
  appUrl,
  lineEnvironmentConfigured,
}: {
  connections: Connection[];
  organizationName: string;
  appUrl: string;
  lineEnvironmentConfigured: {
    channelId: boolean;
    channelSecret: boolean;
  };
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(
    null,
  );
  const [displayName, setDisplayName] = useState("");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        Boolean(
          lineChannelId || lineChannelSecret || lineChannelAccessToken,
        );
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

  return (
    <div className="h-full overflow-y-auto bg-[#f5f7fb]">
      <header className="border-b border-[#e5e8f0] bg-white px-8 pt-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8b92a5]">
                <Settings className="size-3.5" />
                환경설정
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                채널 연동
              </h1>
              <p className="mt-2 text-sm text-[#777f93]">
                {organizationName}으로 들어오는 모든 고객 문의를 닥터네스트에서
                관리하세요.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#e0e5f0] bg-[#fafbfe] px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#edf1ff] text-[#3157f6]">
                <Building2 className="size-4" />
              </span>
              <div>
                <p className="text-[9px] font-semibold text-[#9198aa]">
                  현재 병원
                </p>
                <p className="mt-0.5 text-xs font-bold">{organizationName}</p>
              </div>
            </div>
          </div>

          <nav className="mt-7 flex gap-7" aria-label="환경설정 탭">
            {settingTabs.map((tab) => (
              <button
                type="button"
                key={tab}
                disabled={tab !== "채널"}
                className={`relative pb-3 text-xs font-semibold ${
                  tab === "채널"
                    ? "text-[#3157f6]"
                    : "cursor-not-allowed text-[#a0a6b5]"
                }`}
              >
                {tab}
                {tab === "채널" ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#3157f6]" />
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-8 py-7">
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
            <p className="text-[10px] font-semibold text-[#8d94a6]">
              지원 채널
            </p>
            <p className="mt-2 text-2xl font-bold">6개</p>
          </div>
          <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
            <p className="text-[10px] font-semibold text-[#8d94a6]">
              연동 완료
            </p>
            <p className="mt-2 text-2xl font-bold text-[#15945a]">
              {connectedCount}개
            </p>
          </div>
          <div className="rounded-2xl border border-[#e1e5ef] bg-white p-4">
            <p className="text-[10px] font-semibold text-[#8d94a6]">
              설정 진행 중
            </p>
            <p className="mt-2 text-2xl font-bold text-[#a66c00]">
              {configuringCount}개
            </p>
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">고객 상담 채널</h2>
            <p className="mt-1 text-[11px] text-[#8b92a5]">
              운영 채널은 각 병원 명의 계정으로 연결됩니다.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-[#edf8f2] px-3 py-1.5 text-[9px] font-bold text-[#1b965c]">
            <ShieldCheck className="size-3" /> 병원별 데이터 분리
          </span>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          {channelOrder.map((channel) => {
            const definition = definitions[channel];
            const connection = connections.find(
              (item) => item.channel === channel,
            )!;
            const status = statusMeta[connection.status];

            return (
              <article
                key={channel}
                className="rounded-2xl border border-[#dfe4ef] bg-white p-5 shadow-[0_8px_30px_rgba(36,47,95,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-xs font-extrabold shadow-sm ${definition.badgeClass}`}
                    >
                      {definition.badge}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold">
                          {definition.label}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[8px] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[#8c93a5]">
                        {connection.externalAccountId ?? definition.owner}
                      </p>
                    </div>
                  </div>
                  {connection.status !== "DISCONNECTED" ? (
                    <CircleCheck className="size-5 shrink-0 text-[#1aa464]" />
                  ) : (
                    <Link2 className="size-5 shrink-0 text-[#b2b7c4]" />
                  )}
                </div>

                <p className="mt-4 min-h-10 text-[11px] leading-5 text-[#6e768b]">
                  {definition.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {definition.requirements.map((requirement) => (
                    <span
                      key={requirement}
                      className="rounded-md bg-[#f2f4f8] px-2 py-1 text-[8.5px] font-semibold text-[#72798d]"
                    >
                      {requirement}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openConnection(channel)}
                  className={`mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-bold ${
                    connection.status === "DISCONNECTED"
                      ? "bg-[#3157f6] text-white"
                      : "border border-[#dce1eb] bg-white text-[#59617a] hover:bg-[#f8f9fc]"
                  }`}
                >
                  {connection.status === "DISCONNECTED"
                    ? "연동 시작"
                    : "연동 설정 보기"}
                  <ArrowRight className="size-3.5" />
                </button>
              </article>
            );
          })}
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#dce3f7] bg-[#f2f5ff] p-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#526ce4]" />
          <div className="text-[10px] leading-5 text-[#66708a]">
            <p className="font-bold text-[#4054b7]">외부 채널 승인 안내</p>
            <p>
              계정 식별자와 웹훅을 저장하면 설정 중 상태가 됩니다. 실제 메시지
              송수신은 각 플랫폼의 앱 심사, 사업자 인증 및 API 자격증명 검증이
              완료된 뒤 활성화됩니다.
            </p>
          </div>
        </div>
      </div>

      {selectedChannel && selectedDefinition && selectedConnection ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#13182c]/30 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedChannel(null)}
            aria-label="연동 설정 닫기"
          />
          <aside className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-20px_0_60px_rgba(27,34,70,0.16)]">
            <header className="flex items-center justify-between border-b border-[#e5e8ef] px-6 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl text-xs font-extrabold ${selectedDefinition.badgeClass}`}
                >
                  {selectedDefinition.badge}
                </span>
                <div>
                  <h2 className="text-base font-bold">
                    {selectedDefinition.label} 연동
                  </h2>
                  <p className="mt-0.5 text-[10px] text-[#8d94a6]">
                    {selectedDefinition.owner}
                  </p>
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
                <p className="text-[10px] font-bold text-[#4f576d]">
                  연동 전에 확인해 주세요
                </p>
                <ol className="mt-3 space-y-2.5">
                  {selectedDefinition.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-center gap-2.5 text-[10px] text-[#72798c]"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e9edff] text-[8px] font-bold text-[#3157f6]">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                    채널 표시 이름
                  </span>
                  <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dde2ec] px-3 focus-within:border-[#6f83f2] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                    <MessageCircleMore className="size-3.5 text-[#989fb1]" />
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                      placeholder={`${organizationName} ${selectedDefinition.label}`}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                    {selectedDefinition.accountIdLabel}
                  </span>
                  <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dde2ec] px-3 focus-within:border-[#6f83f2] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                    <KeyRound className="size-3.5 text-[#989fb1]" />
                    <input
                      value={externalAccountId}
                      onChange={(event) =>
                        setExternalAccountId(event.target.value)
                      }
                      className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none"
                      placeholder={selectedDefinition.accountIdPlaceholder}
                    />
                  </span>
                </label>

                {selectedChannel === "LINE" ? (
                  <div className="space-y-4 rounded-2xl border border-[#dfe5f0] bg-[#fafbfe] p-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#4f576d]">
                        Messaging API 자격증명
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[#858c9e]">
                        LINE Developers Console에서 확인한 값을 입력하세요.
                        {selectedConnection.hasCredentials
                          ? " 현재 자격증명이 등록되어 있으며, 변경할 때만 다시 입력하면 됩니다."
                          : ""}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                        Channel ID
                      </span>
                      <input
                        value={lineChannelId}
                        onChange={(event) =>
                          setLineChannelId(event.target.value)
                        }
                        autoComplete="off"
                        className="h-11 w-full rounded-xl border border-[#dde2ec] bg-white px-3 font-mono text-[11px] outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : lineEnvironmentConfigured.channelId
                              ? "Vercel 환경변수에 등록됨"
                            : "1234567890"
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                        Channel secret
                      </span>
                      <input
                        type="password"
                        value={lineChannelSecret}
                        onChange={(event) =>
                          setLineChannelSecret(event.target.value)
                        }
                        autoComplete="new-password"
                        className="h-11 w-full rounded-xl border border-[#dde2ec] bg-white px-3 font-mono text-[11px] outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : lineEnvironmentConfigured.channelSecret
                              ? "Vercel 환경변수에 등록됨"
                            : "Channel secret"
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                        Channel access token
                      </span>
                      <textarea
                        value={lineChannelAccessToken}
                        onChange={(event) =>
                          setLineChannelAccessToken(event.target.value)
                        }
                        autoComplete="off"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#dde2ec] bg-white px-3 py-3 font-mono text-[10px] outline-none focus:border-[#6f83f2] focus:ring-3 focus:ring-[#3157f6]/10"
                        placeholder={
                          selectedConnection.hasCredentials
                            ? "등록됨 · 변경할 때만 입력"
                            : "발급한 access token"
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <div>
                  <span className="mb-2 block text-[10px] font-bold text-[#596177]">
                    닥터네스트 웹훅 URL
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border border-[#dde2ec] bg-[#f8f9fc] p-2">
                    <code className="min-w-0 flex-1 truncate px-1 text-[9px] text-[#697186]">
                      {webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(webhookUrl);
                        setCopied(true);
                      }}
                      className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce1eb] bg-white px-2.5 text-[9px] font-bold text-[#59617a]"
                    >
                      {copied ? (
                        <Check className="size-3 text-[#1aa464]" />
                      ) : (
                        <Clipboard className="size-3" />
                      )}
                      {copied ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[9px] text-[#9298a8]">
                    <Webhook className="size-3" />
                    채널 개발자 콘솔의 이벤트 수신 URL에 입력합니다.
                  </p>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-[#fff0f2] px-4 py-3 text-[10px] font-semibold text-[#d8465b]"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-6 rounded-xl border border-[#e0e5ef] p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3157f6]" />
                  <div>
                    <p className="text-[10px] font-bold text-[#4f576d]">
                      보안 자격증명은 별도로 등록됩니다
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-[#858c9e]">
                      App Secret, Access Token 등의 민감정보는 암호화해 저장하며
                      저장 후 화면이나 API 응답에 다시 노출하지 않습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                {selectedConnection.status !== "DISCONNECTED" ? (
                  <button
                    type="button"
                    onClick={() => disconnect(selectedChannel)}
                    disabled={isSaving}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#e0e4ec] px-4 text-[10px] font-bold text-[#7a8194] hover:bg-[#f7f8fb]"
                  >
                    <RotateCcw className="size-3.5" /> 연동 해제
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3157f6] text-[10px] font-bold text-white disabled:opacity-60"
                >
                  {isSaving ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <BadgeCheck className="size-3.5" />
                  )}
                  연동 설정 저장
                </button>
              </div>

              <a
                href={selectedDefinition.guideUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-semibold text-[#75809c]"
              >
                {selectedDefinition.label} 공식 연동 가이드
                <ExternalLink className="size-3" />
              </a>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
