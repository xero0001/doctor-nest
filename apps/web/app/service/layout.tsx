import Link from "next/link";
import {
  Bell,
  BookOpenText,
  Bot,
  CalendarDays,
  Headphones,
  MessageCircleMore,
  Settings,
  Stethoscope,
  UsersRound,
  Workflow
} from "lucide-react";

const navigation = [
  { label: "알림", icon: Bell, href: "/service/chatting#notifications" },
  { label: "고객채팅", icon: MessageCircleMore, href: "/service/chatting", active: true },
  { label: "고객관리", icon: UsersRound, href: "/service/chatting#customers" },
  { label: "자동화", icon: Workflow, href: "/service/chatting#automation" },
  { label: "케어콘텐츠", icon: BookOpenText, href: "/service/chatting#contents" },
  { label: "예약관리", icon: CalendarDays, href: "/service/chatting#appointments" }
];

export default function ServiceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-svh min-h-[720px] overflow-hidden bg-[#f4f6fb] text-[#20243a]">
      <aside className="z-20 flex w-[76px] shrink-0 flex-col border-r border-[#e7eaf2] bg-white">
        <Link
          href="/service/chatting"
          aria-label="닥터네스트 서비스 홈"
          className="mx-auto mt-4 flex size-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#3157f6] via-[#6657e9] to-[#e879bf] text-white shadow-[0_8px_20px_rgba(77,91,210,0.25)]"
        >
          <Stethoscope className="size-[19px]" />
        </Link>

        <nav className="mt-5 flex flex-1 flex-col items-center gap-1 px-2" aria-label="서비스 메뉴">
          {navigation.map(({ label, icon: Icon, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`group relative flex w-full flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${
                active
                  ? "bg-[#eef2ff] text-[#3157f6]"
                  : "text-[#969caf] hover:bg-[#f6f7fb] hover:text-[#59617a]"
              }`}
            >
              {active ? <span className="absolute -left-2 top-3 h-7 w-[3px] rounded-r-full bg-[#3157f6]" /> : null}
              <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1 px-2 pb-4">
          <Link
            href="/service/chatting#support"
            className="flex w-full flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium text-[#969caf] hover:bg-[#f6f7fb] hover:text-[#59617a]"
          >
            <Headphones className="size-[18px]" />
            고객센터
          </Link>
          <Link
            href="/service/chatting#settings"
            className="flex w-full flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium text-[#969caf] hover:bg-[#f6f7fb] hover:text-[#59617a]"
          >
            <Settings className="size-[18px]" />
            환경설정
          </Link>
          <div className="mt-2 flex size-9 items-center justify-center rounded-full border border-[#dfe4f2] bg-[#f8f9fd] text-[#536076]">
            <Bot className="size-[17px]" />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">{children}</main>
    </div>
  );
}
