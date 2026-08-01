import { BarChart3 } from "lucide-react";
import Link from "next/link";

import { MarketingWorkspace } from "@/features/marketing/components/marketing-workspace";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MarketingStatusPage() {
  await requireUser("/service/marketing/status");

  return (
    <MarketingWorkspace activeSection="STATUS">
      <header className="flex h-[86px] shrink-0 items-center border-b border-[#e4e8f0] bg-white px-8">
        <div>
          <h1 className="text-xl font-extrabold tracking-[-0.04em] text-[#30364a]">
            마케팅 현황
          </h1>
          <p className="mt-1 text-xs text-[#9299aa]">
            재진 마케팅 캠페인의 발송 및 반응 현황을 확인합니다.
          </p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#f3f7ff] p-8">
        <section className="flex min-h-[360px] w-full max-w-[920px] flex-col items-center justify-center rounded-[24px] border border-[#e3e8f0] bg-white px-8 text-center shadow-[0_10px_35px_rgba(72,91,126,0.05)]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#3157f6]">
            <BarChart3 className="size-7" />
          </div>
          <h2 className="mt-5 text-lg font-extrabold text-[#41495e]">
            등록된 재진 마케팅이 없습니다.
          </h2>
          <p className="mt-2 text-sm text-[#8f97a8]">
            마케팅을 등록하면 발송 대상과 수신·읽음 현황을 확인할 수
            있습니다.
          </p>
          <Link
            href="/service/marketing"
            className="mt-7 inline-flex h-10 items-center rounded-xl bg-[#3157f6] px-5 text-sm font-extrabold text-white"
          >
            마케팅 등록으로 이동
          </Link>
        </section>
      </main>
    </MarketingWorkspace>
  );
}
