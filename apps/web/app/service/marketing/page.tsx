import { Megaphone, Send } from "lucide-react";

import { MarketingWorkspace } from "@/features/marketing/components/marketing-workspace";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MarketingRegistrationPage() {
  await requireUser("/service/marketing");

  return (
    <MarketingWorkspace activeSection="REGISTER">
      <header className="flex h-[86px] shrink-0 items-center border-b border-[#e4e8f0] bg-white px-8">
        <div>
          <h1 className="text-xl font-extrabold tracking-[-0.04em] text-[#30364a]">
            마케팅 등록
          </h1>
          <p className="mt-1 text-xs text-[#9299aa]">
            통계 데이터는 매일 오전 8시 30분에 업데이트됩니다. (마지막 업데이트:
            데이터 없음)
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#fbfbfc] px-8 py-10">
        <div className="mx-auto w-full max-w-[1080px]">
          <section aria-labelledby="revisit-brand-message-heading">
            <div className="flex items-end justify-between gap-6 px-5">
              <div>
                <h2
                  id="revisit-brand-message-heading"
                  className="text-lg font-extrabold tracking-[-0.03em] text-[#30374a]"
                >
                  재진 마케팅 - 브랜드 메시지
                </h2>
                <p className="mt-2 text-sm text-[#929aac]">
                  치료태그가 입력된 고객 유형별로 카카오톡 브랜드 메시지를 보낼
                  수 있습니다.
                </p>
              </div>
              <button
                type="button"
                disabled
                title="마케팅 캠페인 등록 기능은 준비 중입니다."
                className="h-10 shrink-0 cursor-not-allowed rounded-xl bg-[#3157f6] px-6 text-sm font-extrabold text-white disabled:opacity-50"
              >
                등록
              </button>
            </div>

            <div className="mt-5 flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-[#e1e5ed] bg-white px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f2f5ff] text-[#3157f6]">
                <Megaphone className="size-6" />
              </div>
              <h3 className="mt-5 text-base font-extrabold text-[#4a5367]">
                비용을 절약해 주는 효과적인 마케팅
              </h3>
              <p className="mt-2 text-sm font-semibold text-[#7e899f]">
                닥터네스트를 통한 카카오톡 발송으로 비용을 절약해 보세요.
              </p>
              <button
                type="button"
                disabled
                title="마케팅 캠페인 등록 기능은 준비 중입니다."
                className="mt-6 flex h-10 cursor-not-allowed items-center gap-2 rounded-xl bg-[#3157f6] px-6 text-sm font-extrabold text-white disabled:opacity-50"
              >
                <Send className="size-4" />
                등록
              </button>
            </div>
          </section>

          <section
            aria-labelledby="marketing-help-heading"
            className="mt-6 rounded-2xl border border-[#e1e5ed] bg-white px-7 py-6"
          >
            <h2
              id="marketing-help-heading"
              className="text-base font-extrabold text-[#4a5265]"
            >
              도움말
            </h2>
            <ul className="mt-4 space-y-3 pl-5 text-sm leading-6 text-[#727c91] marker:text-[#727c91]">
              <li className="list-disc">
                대상자: 마케팅 등록 시 메시지 발송 대상으로 선택된 고객
                수입니다.
              </li>
              <li className="list-disc">
                수신 성공: 발송된 메시지 중 고객에게 정상적으로 전달된
                건수입니다.
              </li>
              <li className="list-disc">
                읽음: 메시지 수신에 성공한 고객 중 해당 메시지를 실제로 열람한
                건수입니다.
              </li>
              <li className="list-disc">
                수신 성공 10건 이하인 경우, 읽음 데이터는 제공되지 않습니다.
              </li>
              <li className="list-disc">
                메시지 발송 이후 D+3일까지의 유효 데이터만 집계됩니다.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </MarketingWorkspace>
  );
}
