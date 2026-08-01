"use client";

import {
  Bell,
  BookOpenText,
  Bot,
  CalendarDays,
  Headphones,
  LogOut,
  Megaphone,
  MessageCircleMore,
  NotebookTabs,
  Settings,
  UsersRound,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

const navigation = [
  {
    label: "알림",
    icon: Bell,
    href: "/service/chatting#notifications",
    available: false,
  },
  {
    label: "고객채팅",
    icon: MessageCircleMore,
    href: "/service/chatting",
    available: true,
  },
  {
    label: "고객입력",
    icon: UsersRound,
    href: "/service/customers",
    available: true,
  },
  {
    label: "자동화",
    icon: Workflow,
    href: "/service/automations",
    available: true,
  },
  {
    label: "마케팅",
    icon: Megaphone,
    href: "/service/marketing",
    available: true,
  },
  {
    label: "콘텐츠",
    icon: BookOpenText,
    href: "/service/events",
    available: true,
  },
  {
    label: "원내매뉴얼",
    icon: NotebookTabs,
    href: "/service/manuals",
    available: true,
  },
  {
    label: "예약관리",
    icon: CalendarDays,
    href: "/service/appointments",
    available: true,
    requiresAppointmentManagement: true,
    openInNewTab: true,
  },
];

type ServiceShellProps = {
  user: {
    name: string;
    organizationName: string;
  };
  appointmentManagementEnabled: boolean;
  children: React.ReactNode;
};

export function ServiceShell({
  user,
  appointmentManagementEnabled,
  children,
}: ServiceShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-svh min-h-[720px] overflow-hidden bg-[#f4f6fb] text-[#20243a]">
      <aside className="z-20 flex w-[80px] shrink-0 flex-col border-r border-[#e7eaf2] bg-white">
        <Link
          href="/service/chatting"
          aria-label="닥터네스트 서비스 홈"
          className="mx-auto mt-3 flex size-12 items-center justify-center"
        >
          <Image
            src="/images/doctornest-icon.png"
            alt=""
            width={44}
            height={44}
            className="size-11 object-contain"
            priority
          />
        </Link>

        <nav
          className="mt-5 flex flex-1 flex-col items-center gap-1 px-2"
          aria-label="서비스 메뉴"
        >
          {navigation.map((item) => {
            if (
              "requiresAppointmentManagement" in item &&
              item.requiresAppointmentManagement &&
              !appointmentManagementEnabled
            ) {
              return null;
            }
            const { label, icon: Icon, href, available } = item;
            const active = available && pathname.startsWith(href);
            const openInNewTab =
              "openInNewTab" in item && item.openInNewTab === true;
            return (
              <Link
                key={label}
                href={href}
                target={openInNewTab ? "_blank" : undefined}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                className={`group relative flex w-full flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "bg-[#eef2ff] text-[#3157f6]"
                    : "text-[#969caf] hover:bg-[#f6f7fb] hover:text-[#59617a]"
                }`}
              >
                {active ? (
                  <span className="absolute -left-2 top-3 h-7 w-[3px] rounded-r-full bg-[#3157f6]" />
                ) : null}
                <Icon
                  className="size-[18px]"
                  strokeWidth={active ? 2.3 : 1.8}
                />
                <span>{label}</span>
              </Link>
            );
          })}
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
            href="/service/settings/profile"
            className={`relative flex w-full flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium ${
              pathname.startsWith("/service/settings")
                ? "bg-[#eef2ff] text-[#3157f6]"
                : "text-[#969caf] hover:bg-[#f6f7fb] hover:text-[#59617a]"
            }`}
          >
            {pathname.startsWith("/service/settings") ? (
              <span className="absolute -left-2 top-3 h-7 w-[3px] rounded-r-full bg-[#3157f6]" />
            ) : null}
            <Settings className="size-[18px]" />
            병원설정
          </Link>
          <button
            type="button"
            onClick={logout}
            title={`${user.organizationName} · ${user.name} 로그아웃`}
            className="group relative mt-2 flex size-9 items-center justify-center rounded-full border border-[#dfe4f2] bg-[#f8f9fd] text-[#536076] hover:border-[#cbd4f6] hover:bg-[#eef2ff] hover:text-[#3157f6]"
          >
            <Bot className="size-[17px] group-hover:hidden" />
            <LogOut className="hidden size-[15px] group-hover:block" />
          </button>
        </div>
      </aside>

      <main className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
