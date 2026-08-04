"use client";

import {
  BotMessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Megaphone,
  MessageCircleMore,
  Send,
  Tag,
  UserRoundCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { InstagramChannelIcon } from "@/features/channels/components/instagram-channel-icon";
import { KakaoChannelIcon } from "@/features/channels/components/kakao-channel-icon";
import { LineChannelIcon } from "@/features/channels/components/line-channel-icon";
import { NaverTalkChannelIcon } from "@/features/channels/components/naver-talk-channel-icon";
import { WeChatChannelIcon } from "@/features/channels/components/wechat-channel-icon";
import { WhatsAppChannelIcon } from "@/features/channels/components/whatsapp-channel-icon";
import type { AutomationManagementDashboard } from "@/features/automations/management-types";

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatCount(value: number) {
  return `${numberFormatter.format(value)}건`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}년 ${String(monthNumber).padStart(2, "0")}월`;
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthFromDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

function MetricHelp({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="cursor-help text-[#a3aaba]"
    >
      <CircleHelp className="size-3.5" />
    </span>
  );
}

type ChatChannel =
  AutomationManagementDashboard["chatting"]["channels"][number]["channel"];

const channelLabels: Record<ChatChannel, string> = {
  KAKAO: "카카오톡",
  LINE: "LINE",
  NAVER_TALK: "네이버 톡톡",
  WECHAT: "WeChat",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
};

function ChatChannelIcon({ channel }: { channel: ChatChannel }) {
  if (channel === "KAKAO") return <KakaoChannelIcon size={20} />;
  if (channel === "LINE") return <LineChannelIcon size={20} />;
  if (channel === "NAVER_TALK") return <NaverTalkChannelIcon size={20} />;
  if (channel === "WECHAT") return <WeChatChannelIcon size={20} />;
  if (channel === "WHATSAPP") return <WhatsAppChannelIcon size={20} />;
  return <InstagramChannelIcon size={20} />;
}

function CustomerTrendChart({
  daily,
}: {
  daily: AutomationManagementDashboard["customerManagement"]["daily"];
}) {
  const width = 820;
  const height = 250;
  const padding = { top: 16, right: 18, bottom: 42, left: 38 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(
    5,
    ...daily.flatMap((item) => [item.managedCustomers, item.newCustomers]),
  );
  const roundedMaximum = Math.max(4, Math.ceil(maximum / 4) * 4);
  const x = (index: number) =>
    padding.left +
    (daily.length <= 1 ? 0 : (index / (daily.length - 1)) * chartWidth);
  const y = (value: number) =>
    padding.top + chartHeight - (value / roundedMaximum) * chartHeight;
  const points = (key: "managedCustomers" | "newCustomers") =>
    daily.map((item, index) => `${x(index)},${y(item[key])}`).join(" ");
  const tickIndexes = Array.from(
    new Set(
      [0, 7, 14, 21, 28, daily.length - 1].filter(
        (i) => i >= 0 && i < daily.length,
      ),
    ),
  );

  return (
    <div className="mt-5 min-h-64 w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="일자별 고객 관리 및 신규 환자 DB 추이"
        className="h-auto w-full min-w-[620px]"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const value = Math.round((roundedMaximum * (4 - index)) / 4);
          const lineY = padding.top + (chartHeight * index) / 4;
          return (
            <g key={index}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={lineY}
                y2={lineY}
                stroke="#e8ecf3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={lineY + 4}
                textAnchor="end"
                fill="#9aa2b2"
                fontSize="11"
              >
                {value}
              </text>
            </g>
          );
        })}
        {tickIndexes.map((index) => (
          <text
            key={daily[index].date}
            x={x(index)}
            y={height - 17}
            textAnchor="middle"
            fill="#8d95a6"
            fontSize="11"
          >
            {Number(daily[index].date.slice(8))}일
          </text>
        ))}
        <polyline
          points={points("managedCustomers")}
          fill="none"
          stroke="#48ad66"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={points("newCustomers")}
          fill="none"
          stroke="#50aeea"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {daily.flatMap((item, index) => [
          <circle
            key={`managed-${item.date}`}
            cx={x(index)}
            cy={y(item.managedCustomers)}
            r="2.7"
            fill="#48ad66"
          >
            <title>{`${item.date} 고객 관리 ${item.managedCustomers}건`}</title>
          </circle>,
          <circle
            key={`new-${item.date}`}
            cx={x(index)}
            cy={y(item.newCustomers)}
            r="2.7"
            fill="#50aeea"
          >
            <title>{`${item.date} 신규 환자 DB ${item.newCustomers}건`}</title>
          </circle>,
        ])}
      </svg>
      <div className="-mt-2 flex items-center justify-center gap-5 text-[11px] font-semibold text-[#7d8597]">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[#48ad66]" /> 고객 관리
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[#50aeea]" /> 신규 환자 DB
        </span>
      </div>
    </div>
  );
}

export function AutomationManagementDashboardView({
  initialDashboard,
}: {
  initialDashboard: AutomationManagementDashboard;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedMonth, setSelectedMonth] = useState(initialDashboard.month);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPopularTreatmentsOpen, setIsPopularTreatmentsOpen] = useState(false);
  const requestSequence = useRef(0);
  const latestMonth = monthFromDate(initialDashboard.generatedAt);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => shiftMonth(latestMonth, -index)),
    [latestMonth],
  );

  useEffect(() => {
    if (!isPopularTreatmentsOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsPopularTreatmentsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPopularTreatmentsOpen]);

  async function loadMonth(month: string) {
    if (month === selectedMonth || isLoading) return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setSelectedMonth(month);
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/automations/management?month=${month}`,
      );
      const result = (await response.json()) as {
        dashboard?: AutomationManagementDashboard;
        error?: string;
      };
      if (!response.ok || !result.dashboard) {
        throw new Error(result.error ?? "관리현황을 불러오지 못했습니다.");
      }
      if (requestSequence.current === requestId) {
        setDashboard(result.dashboard);
      }
    } catch (fetchError: unknown) {
      if (requestSequence.current === requestId) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "관리현황을 불러오지 못했습니다.",
        );
        setSelectedMonth(dashboard.month);
      }
    } finally {
      if (requestSequence.current === requestId) setIsLoading(false);
    }
  }

  const summaryCards = [
    {
      label: "전체 고객 등록 수",
      value: dashboard.totals.customers,
      description: "현재 고객 DB에 등록된 전체 고객",
    },
    {
      label: "누적 상담자동화 적용 고객 수",
      value: dashboard.totals.automationCustomers,
      description: "자동화 대상 치료태그가 연결된 고유 고객",
    },
    {
      label: "누적 채팅 상담 수",
      value: dashboard.totals.consultations,
      description: "개설된 전체 고객 대화방",
    },
  ];

  return (
    <>
      <header className="flex min-h-20 shrink-0 items-center border-b border-[#e4e8f0] bg-white px-7 py-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-[-0.03em] text-[#30364a]">
            관리현황
          </h1>
          <p className="mt-1 text-xs text-[#8d94a6]">
            통계 데이터는 실시간으로 집계됩니다. (조회 기준:{" "}
            {formatGeneratedAt(dashboard.generatedAt)})
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#f2f6fc] p-7">
        <div
          className={`mx-auto max-w-[1440px] transition-opacity ${isLoading ? "opacity-55" : "opacity-100"}`}
        >
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-bold text-[#cf4257]"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-[#e3e8f0] bg-white px-7 py-6 shadow-[0_4px_16px_rgba(40,50,75,0.08)]"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#60687b]">
                  {card.label}
                  <MetricHelp label={card.description} />
                </div>
                <strong className="mt-2 block text-[28px] font-extrabold tracking-[-0.04em] text-[#252b3d]">
                  {formatCount(card.value)}
                </strong>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadMonth(shiftMonth(selectedMonth, -1))}
              disabled={
                isLoading ||
                selectedMonth <= monthOptions[monthOptions.length - 1]
              }
              className="flex size-8 items-center justify-center rounded-full bg-white text-[#778094] shadow-sm hover:text-[#3157f6] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="이전 달"
            >
              <ChevronLeft className="size-4" />
            </button>
            <label className="relative">
              <span className="sr-only">조회 월</span>
              <select
                value={selectedMonth}
                onChange={(event) => void loadMonth(event.target.value)}
                disabled={isLoading}
                className="h-9 appearance-none rounded-xl border-0 bg-white pl-4 pr-9 text-sm font-extrabold text-[#4a5267] shadow-sm outline-none focus:ring-2 focus:ring-[#3157f6]/20"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-[#9aa1af]" />
            </label>
            <button
              type="button"
              onClick={() => void loadMonth(shiftMonth(selectedMonth, 1))}
              disabled={isLoading || selectedMonth >= latestMonth}
              className="flex size-8 items-center justify-center rounded-full bg-white text-[#778094] shadow-sm hover:text-[#3157f6] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="다음 달"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)]">
            <section className="rounded-2xl border border-[#e3e8f0] bg-white p-7 shadow-[0_4px_16px_rgba(40,50,75,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#333a4e]">
                    고객 관리 현황
                  </h2>
                  <p className="mt-1 text-xs text-[#9aa1b1]">
                    고객 DB가 신규 등록되거나 수정된 흐름을 일자별로 확인합니다.
                  </p>
                </div>
                <Link
                  href="/service/customers?view=daily"
                  className="shrink-0 text-xs font-bold text-[#7d8598] hover:text-[#3157f6]"
                >
                  일자별 고객정보 입력 내역으로 →
                </Link>
              </div>
              <div className="mt-7 grid grid-cols-2 divide-x divide-[#e5e8ef]">
                <div className="px-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#777f92]">
                    월간 고객 관리 건수
                    <MetricHelp label="선택한 달에 신규 등록되거나 정보가 수정된 고유 고객 수" />
                  </div>
                  <strong className="mt-1 block text-xl font-extrabold text-[#30364a]">
                    {formatCount(dashboard.customerManagement.managedCustomers)}
                  </strong>
                </div>
                <div className="px-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#777f92]">
                    월간 신규 환자 DB 확보 건수
                    <MetricHelp label="선택한 달에 처음 등록된 고유 고객 수" />
                  </div>
                  <strong className="mt-1 block text-xl font-extrabold text-[#30364a]">
                    {formatCount(dashboard.customerManagement.newCustomers)}
                  </strong>
                </div>
              </div>
              <CustomerTrendChart daily={dashboard.customerManagement.daily} />
            </section>

            <section className="rounded-2xl border border-[#e3e8f0] bg-white p-7 shadow-[0_4px_16px_rgba(40,50,75,0.08)]">
              <h2 className="text-base font-extrabold text-[#333a4e]">
                월간 닥터네스트 관리 현황
              </h2>
              <p className="mt-1 text-xs text-[#9aa1b1]">
                자동 응대와 고객 상담 활동을 월 단위로 집계합니다.
              </p>
              <div className="mt-6 divide-y divide-[#e8ebf1]">
                {[
                  {
                    icon: Send,
                    label: "상담자동화 메시지 발송 건수",
                    value: dashboard.automationManagement.sentMessages,
                    help: "AI 자동 응대로 실제 발송 완료된 메시지",
                  },
                  {
                    icon: UserRoundCheck,
                    label: "신규 상담자동화 적용 고객 수",
                    value: dashboard.automationManagement.appliedCustomers,
                    help: "선택한 달에 자동화 대상 치료태그가 새로 연결된 고유 고객",
                  },
                  {
                    icon: MessageCircleMore,
                    label: "월간 상담 진행 건수",
                    value: dashboard.automationManagement.consultations,
                    help: "선택한 달에 메시지가 오간 고유 대화방",
                  },
                ].map(({ icon: Icon, label, value, help }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 py-5 first:pt-1"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f1f6ff] text-[#77b8ee]">
                      <Icon className="size-6" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#60687a]">
                        <span>{label}</span>
                        <MetricHelp label={help} />
                      </div>
                      <strong className="mt-1 block text-xl font-extrabold text-[#30364a]">
                        {formatCount(value)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,2fr)]">
            <section className="rounded-2xl border border-[#e3e8f0] bg-white p-7 shadow-[0_4px_16px_rgba(40,50,75,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#333a4e]">
                    월간 재진마케팅 현황
                  </h2>
                  <p className="mt-1 text-xs text-[#9aa1b1]">
                    선택한 달에 등록한 고객 대상 캠페인입니다.
                  </p>
                </div>
                <Link
                  href="/service/events"
                  className="text-xs font-bold text-[#7d8598] hover:text-[#3157f6]"
                >
                  재진마케팅으로 →
                </Link>
              </div>
              <div className="mt-7 flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-xl bg-[#f1f6ff] text-[#77b8ee]">
                  <Megaphone className="size-7" strokeWidth={1.7} />
                </span>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#60687a]">
                    마케팅 캠페인 등록 건수
                    <MetricHelp label="선택한 달에 새로 등록한 콘텐츠 이벤트 수" />
                  </div>
                  <strong className="mt-1 block text-2xl font-extrabold text-[#30364a]">
                    {formatCount(dashboard.remarketing.campaigns)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e3e8f0] bg-white p-7 shadow-[0_4px_16px_rgba(40,50,75,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#333a4e]">
                    월간 인기 시·수술 TOP 10
                  </h2>
                  <p className="mt-1 text-xs text-[#9aa1b1]">
                    선택한 달에 고객에게 가장 많이 등록된 치료태그 순위입니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopularTreatmentsOpen(true)}
                  className="text-xs font-bold text-[#7d8598] hover:text-[#3157f6]"
                >
                  전체보기 →
                </button>
              </div>
              {dashboard.popularTreatments.length > 0 ? (
                <ol className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                  {dashboard.popularTreatments
                    .slice(0, 10)
                    .map((treatment, index) => (
                      <li
                        key={treatment.id}
                        className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-2 border-b border-[#f0f2f6] pb-3 text-sm"
                      >
                        <span className="font-bold text-[#8b93a4]">
                          {index + 1}
                        </span>
                        <span className="flex min-w-0 items-center gap-2 font-bold text-[#4a5266]">
                          <Tag
                            className="size-4 shrink-0"
                            style={{ color: treatment.color }}
                            fill={treatment.color}
                          />
                          <span className="truncate">{treatment.name}</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold ${treatment.rankChange === null ? "text-[#a0a7b5]" : treatment.rankChange > 0 ? "text-[#e35162]" : treatment.rankChange < 0 ? "text-[#318ee4]" : "text-[#a0a7b5]"}`}
                        >
                          {treatment.rankChange === null
                            ? "NEW"
                            : treatment.rankChange > 0
                              ? `▲${treatment.rankChange}`
                              : treatment.rankChange < 0
                                ? `▼${Math.abs(treatment.rankChange)}`
                                : "-"}
                        </span>
                        <strong className="min-w-10 text-right text-[#4d5568]">
                          {formatCount(treatment.count)}
                        </strong>
                      </li>
                    ))}
                </ol>
              ) : (
                <div className="flex min-h-36 flex-col items-center justify-center text-[#9aa2b3]">
                  <BotMessageSquare className="mb-2 size-7" />
                  <p className="text-xs font-bold">
                    이 달에 등록된 치료태그가 없습니다.
                  </p>
                </div>
              )}
            </section>
          </div>

          <section className="mt-5 rounded-2xl border border-[#e3e8f0] bg-white p-7 shadow-[0_4px_16px_rgba(40,50,75,0.08)]">
            <div>
              <h2 className="text-base font-extrabold text-[#333a4e]">
                월간 채팅 상담 현황
              </h2>
              <p className="mt-1 text-xs text-[#9aa1b1]">
                연동된 모든 채널의 문의 및 응대 현황을 분석합니다.
              </p>
            </div>
            <div className="mt-7 grid gap-7 divide-[#e7eaf0] xl:grid-cols-3 xl:divide-x">
              {(
                [
                  {
                    title: "채널별 상담 진행 건수",
                    help: "선택한 달에 한 번 이상 메시지가 오간 채널별 대화방 수",
                    key: "consultations",
                  },
                  {
                    title: "채널별 신규 상담 유입 건수",
                    help: "선택한 달에 새로 개설된 채널별 대화방 수",
                    key: "newConsultations",
                  },
                ] as const
              ).map((column) => {
                const total = dashboard.chatting.channels.reduce(
                  (sum, item) => sum + item[column.key],
                  0,
                );
                return (
                  <div key={column.key} className="min-w-0 xl:pr-7">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#50586b]">
                        {column.title}
                        <MetricHelp label={column.help} />
                      </h3>
                      <Link
                        href="/service/chatting"
                        className="text-xs font-bold text-[#8b93a4] hover:text-[#3157f6]"
                      >
                        자세히 →
                      </Link>
                    </div>
                    {dashboard.chatting.channels.length > 0 ? (
                      <ul className="mt-5 space-y-3">
                        {dashboard.chatting.channels.map((item) => {
                          const value = item[column.key];
                          const percentage =
                            total > 0
                              ? Math.round((value / total) * 10_000) / 100
                              : 0;
                          return (
                            <li
                              key={item.channel}
                              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2 font-bold text-[#4d5569]">
                                <ChatChannelIcon channel={item.channel} />
                                <span className="truncate">
                                  {channelLabels[item.channel]}
                                </span>
                              </span>
                              <span className="text-xs font-semibold tabular-nums text-[#8a92a4]">
                                {percentage.toFixed(2)}%
                              </span>
                              <strong className="min-w-12 text-right text-[#50586b]">
                                {formatCount(value)}
                              </strong>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-8 text-center text-xs font-semibold text-[#a0a7b5]">
                        이 달의 채팅 상담 내역이 없습니다.
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="min-w-0 xl:pl-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-[#50586b]">
                    상담 응대 현황
                  </h3>
                  <Link
                    href="/service/chatting"
                    className="text-xs font-bold text-[#8b93a4] hover:text-[#3157f6]"
                  >
                    자세히 →
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {[
                    {
                      icon: Clock3,
                      label: "6시간 이상 미응대 상담 수",
                      value: formatCount(
                        dashboard.chatting.unansweredOverSixHours,
                      ),
                      help: "마지막 고객 메시지 이후 6시간 이상 답변하지 않은 대화방",
                    },
                    {
                      icon: MessageCircleMore,
                      label: "평균 응답 대기 시간",
                      value: formatMinutes(
                        dashboard.chatting.averageResponseMinutes,
                      ),
                      help: "고객 메시지부터 다음 병원 답변까지 걸린 평균 시간",
                    },
                    {
                      icon: CheckCircle2,
                      label: "상담 응답 완료율",
                      value: `${dashboard.chatting.responseRate.toFixed(1)}%`,
                      help: "고객 메시지 중 이후 병원 답변이 확인된 비율",
                    },
                  ].map(({ icon: Icon, label, value, help }) => (
                    <article
                      key={label}
                      className="rounded-xl bg-[#f4f7fd] px-5 py-4"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#60687a]">
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-[#79b8ed]" /> {label}
                        </span>
                        <MetricHelp label={help} />
                      </div>
                      <strong className="mt-2 block text-xl font-extrabold text-[#30364a]">
                        {value}
                      </strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {isPopularTreatmentsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#20243a]/45 p-5 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsPopularTreatmentsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="popular-treatments-title"
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-5 px-6 pb-4 pt-6">
              <div>
                <h2
                  id="popular-treatments-title"
                  className="text-lg font-extrabold text-[#30364a]"
                >
                  우리 병원 인기 시·수술
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-[#9299aa]">
                  해당 월에 가장 많이 등록된 치료태그 순위입니다. 인기 조합은
                  같은 고객에게 함께 입력된 횟수가 가장 많은 태그입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPopularTreatmentsOpen(false)}
                className="rounded-lg p-2 text-[#8d95a6] hover:bg-[#f2f4f8]"
                aria-label="인기 시술 전체보기 닫기"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="px-6 pb-4">
              <label className="relative inline-flex">
                <span className="sr-only">인기 시술 조회 월</span>
                <select
                  value={selectedMonth}
                  onChange={(event) => void loadMonth(event.target.value)}
                  disabled={isLoading}
                  className="h-9 appearance-none rounded-xl border border-[#dfe4ed] bg-white pl-3 pr-9 text-sm font-extrabold text-[#50576a] outline-none focus:border-[#7187f6]"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-[#9aa1af]" />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[#f2f4fb] text-left text-xs font-extrabold text-[#596176]">
                  <tr>
                    <th className="border border-[#dfe3ec] px-4 py-3">
                      치료태그명
                    </th>
                    <th className="w-36 border border-[#dfe3ec] px-4 py-3">
                      입력 건수
                    </th>
                    <th className="w-[34%] border border-[#dfe3ec] px-4 py-3">
                      인기 조합
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.popularTreatments.map((treatment) => (
                    <tr key={treatment.id} className="text-[#596176]">
                      <td className="border border-[#e1e5ed] px-4 py-3 font-bold text-[#42495d]">
                        <span className="flex items-center gap-2">
                          <Tag
                            className="size-4 shrink-0"
                            style={{ color: treatment.color }}
                            fill={treatment.color}
                          />
                          {treatment.name}
                        </span>
                      </td>
                      <td className="border border-[#e1e5ed] px-4 py-3 tabular-nums">
                        {numberFormatter.format(treatment.count)}
                      </td>
                      <td className="border border-[#e1e5ed] px-4 py-3">
                        {treatment.popularCombination ? (
                          <span className="flex items-center gap-2 font-semibold">
                            <Tag
                              className="size-4 shrink-0"
                              style={{
                                color: treatment.popularCombination.color,
                              }}
                              fill={treatment.popularCombination.color}
                            />
                            {treatment.popularCombination.name}
                          </span>
                        ) : (
                          <span className="text-[#adb3c0]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dashboard.popularTreatments.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center border-x border-b border-[#e1e5ed] text-[#9ba2b2]">
                  <Tag className="mb-2 size-6" />
                  <p className="text-xs font-bold">
                    이 달에 입력된 치료태그가 없습니다.
                  </p>
                </div>
              ) : null}
            </div>

            <footer className="p-5">
              <button
                type="button"
                onClick={() => setIsPopularTreatmentsOpen(false)}
                className="h-10 w-full rounded-xl bg-[#f5f6f8] text-sm font-bold text-[#596176] hover:bg-[#eceef2]"
              >
                닫기
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
