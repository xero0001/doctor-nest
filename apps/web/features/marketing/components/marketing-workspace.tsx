import { BarChart3, ChevronRight, Globe2, Megaphone } from "lucide-react";
import Link from "next/link";

type MarketingSection = "REGISTER" | "STATUS";

type MarketingWorkspaceProps = {
  activeSection: MarketingSection;
  children: React.ReactNode;
};

const newPatientMenus = [
  { label: "국내 마케팅", icon: Megaphone },
  { label: "해외 마케팅", icon: Globe2 },
] as const;

const revisitMenus = [
  {
    key: "REGISTER",
    label: "마케팅 등록",
    href: "/service/marketing",
    icon: Megaphone,
  },
  {
    key: "STATUS",
    label: "마케팅 현황",
    href: "/service/marketing/status",
    icon: BarChart3,
  },
] as const;

export function MarketingWorkspace({
  activeSection,
  children,
}: MarketingWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 min-w-[1080px] bg-white">
      <aside className="w-[300px] shrink-0 border-r border-[#e2e6ef] bg-white px-5 py-6">
        <h1 className="px-2 text-lg font-extrabold tracking-[-0.04em] text-[#30374a]">
          마케팅
        </h1>
        <p className="mt-1 px-2 text-xs leading-5 text-[#9aa1b1]">
          신규 환자 유입과 재진 캠페인을 관리합니다.
        </p>

        <nav className="mt-7" aria-label="마케팅 메뉴">
          <section aria-labelledby="new-patient-marketing-heading">
            <h2
              id="new-patient-marketing-heading"
              className="px-3 text-xs font-extrabold text-[#7d8599]"
            >
              신규환자 마케팅
            </h2>
            <div className="mt-2 space-y-1">
              {newPatientMenus.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  title={`${label}은 준비 중입니다.`}
                  className="flex h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-[#bcc1cc]"
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-[#f3f4f7] px-2 py-1 text-[10px] font-bold text-[#aab0be]">
                    준비 중
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="mx-3 my-6 h-px bg-[#eceef3]" aria-hidden="true" />

          <section aria-labelledby="revisit-marketing-heading">
            <h2
              id="revisit-marketing-heading"
              className="px-3 text-xs font-extrabold text-[#7d8599]"
            >
              재진 마케팅
            </h2>
            <div className="mt-2 space-y-1">
              {revisitMenus.map(({ key, label, href, icon: Icon }) => {
                const active = activeSection === key;
                return (
                  <Link
                    key={key}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold transition-colors ${
                      active
                        ? "bg-[#eaf3ff] text-[#3157f6]"
                        : "text-[#4d556a] hover:bg-[#f7f8fb]"
                    }`}
                  >
                    <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="size-4 opacity-50" />
                  </Link>
                );
              })}
            </div>
          </section>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">{children}</section>
    </div>
  );
}
