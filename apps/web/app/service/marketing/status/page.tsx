import { MarketingStatusClient } from "@/features/marketing/components/marketing-status-client";
import { MarketingWorkspace } from "@/features/marketing/components/marketing-workspace";
import { getMarketingStatusDashboard } from "@/features/marketing/server/get-marketing-status";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatUpdateTime(value: string | null) {
  if (!value) return "데이터 없음";
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

export default async function MarketingStatusPage() {
  const user = await requireUser("/service/marketing/status");
  const dashboard = await getMarketingStatusDashboard(user.hospitalId);

  return (
    <MarketingWorkspace activeSection="STATUS">
      <header className="flex h-[86px] shrink-0 items-center border-b border-[#e4e8f0] bg-white px-8">
        <div>
          <h1 className="text-xl font-extrabold tracking-[-0.04em] text-[#30364a]">
            마케팅 현황
          </h1>
          <p className="mt-1 text-xs text-[#9299aa]">
            통계 데이터는 매일 오전 8시 30분에 업데이트됩니다. (마지막
            업데이트: {formatUpdateTime(dashboard.lastUpdatedAt)})
          </p>
        </div>
      </header>
      <MarketingStatusClient dashboard={dashboard} />
    </MarketingWorkspace>
  );
}
