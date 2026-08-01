"use client";

import {
  BotMessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Megaphone,
  MessageCircleMore,
  Send,
  Tag,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

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
  const requestSequence = useRef(0);
  const latestMonth = monthFromDate(initialDashboard.generatedAt);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => shiftMonth(latestMonth, -index)),
    [latestMonth],
  );

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
                월간 애프터닥 관리 현황
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
                <Link
                  href="/service/customers?view=all"
                  className="text-xs font-bold text-[#7d8598] hover:text-[#3157f6]"
                >
                  전체보기 →
                </Link>
              </div>
              {dashboard.popularTreatments.length > 0 ? (
                <ol className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                  {dashboard.popularTreatments.map((treatment, index) => (
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
        </div>
      </main>
    </>
  );
}
