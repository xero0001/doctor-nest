"use client";

import {
  ArrowRight,
  Info,
  MessageSquareText,
  ReceiptText,
  Ticket,
  TriangleAlert,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  MarketingCampaignStatus,
  MarketingStatusCampaign,
  MarketingStatusDashboard,
} from "@/features/marketing/types";

type MarketingStatusClientProps = {
  dashboard: MarketingStatusDashboard;
};

const statusLabels: Record<MarketingCampaignStatus, string> = {
  DRAFT: "작성 중",
  SCHEDULED: "발송 예정",
  SENDING: "발송 중",
  COMPLETED: "발송 완료",
  FAILED: "발송 실패",
  CANCELLED: "취소",
};

const statusStyles: Record<MarketingCampaignStatus, string> = {
  DRAFT: "bg-[#f1f3f7] text-[#737b8d]",
  SCHEDULED: "bg-[#fff5db] text-[#b67b08]",
  SENDING: "bg-[#eaf3ff] text-[#3157f6]",
  COMPLETED: "bg-[#e8f8ef] text-[#16834b]",
  FAILED: "bg-[#fff0f2] text-[#d8465b]",
  CANCELLED: "bg-[#f1f3f7] text-[#737b8d]",
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatCurrency(value: number) {
  return `${formatNumber(value)}원`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
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

function CampaignRankCard({
  campaign,
  rank,
}: {
  campaign?: MarketingStatusCampaign;
  rank: number;
}) {
  if (!campaign) {
    return (
      <article className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#e1e5ed] bg-white px-6 text-center">
        <TriangleAlert className="size-10 fill-[#d6d9df] text-[#d6d9df]" />
        <h3 className="mt-4 text-sm font-extrabold text-[#666f82]">
          아직 등록된 메시지가 없습니다.
        </h3>
        <p className="mt-2 text-xs leading-5 text-[#9aa2b2]">
          닥터네스트를 통한 카카오톡 발송으로
          <br />
          비용을 절약해 보세요.
        </p>
      </article>
    );
  }

  return (
    <article className="flex min-h-[300px] flex-col rounded-2xl border border-[#e1e5ed] bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#3157f6] text-sm font-extrabold text-white">
          {rank}
        </span>
        <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-bold text-[#3157f6]">
          {campaign.readRate === null
            ? "읽음 집계 전"
            : `읽음 ${campaign.readRate}%`}
        </span>
      </div>
      <h3 className="mt-7 line-clamp-2 text-lg font-extrabold text-[#333a4f]">
        {campaign.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#858da0]">
        {campaign.messageName}
      </p>
      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-[#edf0f4] pt-5">
        <div>
          <dt className="text-xs text-[#969eae]">수신 성공</dt>
          <dd className="mt-1 text-base font-extrabold text-[#41495d]">
            {formatNumber(campaign.successCount)}건
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#969eae]">읽음</dt>
          <dd className="mt-1 text-base font-extrabold text-[#41495d]">
            {campaign.readRate === null
              ? "-"
              : `${formatNumber(campaign.readCount)}건`}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function MarketingStatusClient({
  dashboard,
}: MarketingStatusClientProps) {
  const [chargeOpen, setChargeOpen] = useState(false);

  useEffect(() => {
    if (!chargeOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setChargeOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [chargeOpen]);

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto bg-[#fbfbfc] px-8 py-10">
        <div className="mx-auto w-full max-w-[1120px] space-y-6">
          <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
            <h2 className="text-lg font-extrabold tracking-[-0.03em] text-[#353c50]">
              마케팅 이용권 현황
            </h2>

            <div className="mt-5 rounded-2xl border border-[#dfe4ec] p-5">
              <div className="flex items-center gap-6">
                <dl className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-[#e3e6ec]">
                  <div className="pr-6">
                    <dt className="text-sm font-bold text-[#4a5266]">
                      보유 이용권
                    </dt>
                    <dd className="mt-2 text-lg font-extrabold text-[#3157f6]">
                      {formatNumber(dashboard.entitlement.totalCredits)}장
                    </dd>
                  </div>
                  <div className="px-6">
                    <dt className="flex items-center gap-1.5 text-sm font-bold text-[#4a5266]">
                      발송 가능한 메시지 건수
                      <Info className="size-3.5 text-[#9ca4b3]" />
                    </dt>
                    <dd className="mt-2 text-lg font-extrabold text-[#30384c]">
                      {formatNumber(dashboard.entitlement.availableMessages)}건
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setChargeOpen(true)}
                  className="h-11 shrink-0 rounded-xl bg-[#3157f6] px-6 text-sm font-extrabold text-white transition hover:bg-[#2448d8]"
                >
                  이용권 충전
                </button>
              </div>
              <div className="mt-5 rounded-lg bg-[#f2f4fb] px-4 py-2.5 text-xs font-semibold text-[#657087]">
                이미지형 이용권{" "}
                {formatNumber(dashboard.entitlement.imageMessageCredits)}장
                <span className="mx-2 text-[#b2bdca]">|</span>
                와이드 이미지·캐러셀 피드형 이용권{" "}
                {formatNumber(dashboard.entitlement.carouselFeedCredits)}장
              </div>
            </div>

            <div className="mt-6 min-h-[380px] overflow-hidden rounded-2xl border border-[#e3e7ee]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] table-fixed border-collapse text-sm">
                  <thead className="bg-[#f2f4fb] text-left text-[#535b70]">
                    <tr className="h-12">
                      <th className="w-[18%] px-4">발송 일시</th>
                      <th className="w-[22%] px-4">마케팅명</th>
                      <th className="w-[22%] px-4">메시지명</th>
                      <th className="w-[12%] px-4 text-right">수신성공</th>
                      <th className="w-[13%] px-4 text-center">상태</th>
                      <th className="w-[13%] px-4">생성자</th>
                    </tr>
                  </thead>
                  {dashboard.campaigns.length > 0 ? (
                    <tbody>
                      {dashboard.campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="h-14 border-t border-[#e7eaf0] text-[#596176]"
                        >
                          <td className="px-4 text-xs">
                            {formatDateTime(campaign.sentAt)}
                          </td>
                          <td className="truncate px-4 font-bold text-[#40485d]">
                            {campaign.name}
                          </td>
                          <td className="truncate px-4">
                            {campaign.messageName}
                          </td>
                          <td className="px-4 text-right font-bold">
                            {formatNumber(campaign.successCount)}건
                          </td>
                          <td className="px-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[campaign.status]}`}
                            >
                              {statusLabels[campaign.status]}
                            </span>
                          </td>
                          <td className="truncate px-4">
                            {campaign.createdByName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ) : null}
                </table>
              </div>

              {dashboard.campaigns.length === 0 ? (
                <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center">
                  <TriangleAlert className="size-11 fill-[#d8dbe1] text-[#d8dbe1]" />
                  <h3 className="mt-4 text-base font-extrabold text-[#626b7e]">
                    아직 등록된 메시지가 없습니다.
                  </h3>
                  <p className="mt-2 text-sm text-[#969eae]">
                    닥터네스트를 통한 카카오톡 발송으로 비용을 절약해 보세요.
                  </p>
                  <Link
                    href="/service/marketing"
                    className="mt-5 inline-flex h-10 min-w-[320px] items-center justify-center rounded-xl bg-[#3157f6] px-6 text-sm font-extrabold text-white transition hover:bg-[#2448d8]"
                  >
                    등록하기
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
            <h2 className="text-lg font-extrabold tracking-[-0.03em] text-[#353c50]">
              마케팅 비용 예상 절감액
            </h2>
            <div className="mt-5 grid grid-cols-2 divide-x divide-[#e3e6ec] rounded-2xl border border-[#dfe4ec] px-5 py-5">
              <div className="pr-6">
                <p className="flex items-center gap-2 text-sm font-bold text-[#4a5266]">
                  <MessageSquareText className="size-4 text-[#3157f6]" />
                  브랜드 메시지 누적 발송 건수
                </p>
                <strong className="mt-2 block text-xl text-[#3157f6]">
                  {formatNumber(dashboard.totals.sentCount)}건
                </strong>
              </div>
              <div className="pl-6">
                <p className="flex items-center gap-2 text-sm font-bold text-[#4a5266]">
                  <ReceiptText className="size-4 text-[#7b8498]" />
                  예상 문자 마케팅 비용 산출
                </p>
                <strong className="mt-2 block text-xl text-[#30384c]">
                  {formatCurrency(dashboard.totals.estimatedSmsCost)}
                </strong>
                <span className="ml-2 text-xs font-medium text-[#a0a7b5]">
                  누적 발송 건수 × MMS 건당 100원 기준
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-[#a8ce5b] px-5 py-5">
              <p className="flex items-center gap-2 text-sm font-bold text-[#4a5266]">
                <TrendingUp className="size-4 text-[#67a61f]" />총 마케팅 비용
                절감액
              </p>
              <strong className="mt-2 block text-xl text-[#67a61f]">
                {formatCurrency(dashboard.totals.estimatedSavings)}
              </strong>
              <p className="mt-1 text-xs text-[#929bad]">
                누적 발송 건수 × (MMS 건당 100원 - 브랜드 메시지 건당 22.5원)
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
            <h2 className="text-lg font-extrabold tracking-[-0.03em] text-[#353c50]">
              고객 반응이 좋았던 마케팅 TOP 3
            </h2>
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-[#f2f5ff] px-4 py-3 text-sm font-bold text-[#3157f6]">
              <Info className="size-4" />
              발송 이후 D+3일까지의 유효 데이터만 집계됩니다.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <CampaignRankCard
                  key={index}
                  rank={index + 1}
                  campaign={dashboard.topCampaigns[index]}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {chargeOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="이용권 충전 안내 닫기"
            onClick={() => setChargeOpen(false)}
            className="absolute inset-0 bg-[#151a2d]/45 backdrop-blur-[2px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="charge-dialog-title"
            className="relative z-10 w-full max-w-[560px] rounded-[24px] bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f2f5ff] text-[#3157f6]">
                  <Ticket className="size-5" />
                </div>
                <h2
                  id="charge-dialog-title"
                  className="mt-4 text-xl font-extrabold text-[#30374a]"
                >
                  마케팅 이용권 충전
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#858da0]">
                  이용권 상품과 발송 단가는 병원 계약 조건에 따라 달라집니다.
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setChargeOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl text-[#80889a] hover:bg-[#f3f5f8]"
              >
                <X className="size-5" />
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e3e7ee] p-4">
                <dt className="text-sm font-bold text-[#4a5266]">이미지형</dt>
                <dd className="mt-2 text-lg font-extrabold text-[#3157f6]">
                  {formatNumber(dashboard.entitlement.imageMessageCredits)}장
                  보유
                </dd>
              </div>
              <div className="rounded-2xl border border-[#e3e7ee] p-4">
                <dt className="text-sm font-bold text-[#4a5266]">
                  캐러셀 피드형
                </dt>
                <dd className="mt-2 text-lg font-extrabold text-[#3157f6]">
                  {formatNumber(dashboard.entitlement.carouselFeedCredits)}장
                  보유
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl bg-[#f5f8fd] p-4 text-sm leading-6 text-[#737c90]">
              실제 충전과 결제는 계약 담당자 확인 후 진행됩니다. 고객센터에서
              필요한 이용권 유형과 수량을 알려주세요.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setChargeOpen(false)}
                className="h-10 rounded-xl border border-[#dfe3ea] px-5 text-sm font-bold text-[#657087]"
              >
                닫기
              </button>
              <Link
                href="/service/chatting#support"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-extrabold text-white transition hover:bg-[#2448d8]"
              >
                고객센터 문의 <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
