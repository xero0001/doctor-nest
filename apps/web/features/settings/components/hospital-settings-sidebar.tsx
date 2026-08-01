"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HospitalSettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] shrink-0 border-r border-[#e2e6ef] bg-white px-5 py-6">
      <h1 className="px-2 text-lg font-extrabold text-[#30374a]">병원 설정</h1>
      <nav className="mt-6 space-y-2 text-sm" aria-label="병원 설정 메뉴">
        <div className="flex items-center justify-between rounded-xl bg-[#eaf3ff] px-4 py-3 font-extrabold text-[#4c6f9c]">
          병원정보
          <ChevronDown className="size-4" />
        </div>
        <Link
          href="/service/settings/profile"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/profile"
              ? "text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          병원프로필
        </Link>
        <span className="block px-8 py-2.5 text-[#a0a6b4]">
          앱 가입 링크 설정
        </span>
        <Link
          href="/service/settings/auto-replies"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/auto-replies"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          자동응대 메시지
        </Link>

        <div className="mt-4 flex items-center justify-between px-4 py-3 font-extrabold text-[#4d5569]">
          서비스설정
          <ChevronDown className="size-4 text-[#9ca2af]" />
        </div>
        <Link
          href="/service/settings/basic"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/basic"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          기본설정
        </Link>
        <Link
          href="/service/settings/channels"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/channels"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          채널연동
        </Link>
        <Link
          href="/service/settings/customer-tags"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/customer-tags"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          고객태그
        </Link>

        <div
          className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 font-extrabold ${
            pathname.startsWith("/service/settings/accounts")
              ? "bg-[#eaf3ff] text-[#4c6f9c]"
              : "text-[#4d5569]"
          }`}
        >
          계정관리
          <ChevronDown className="size-4 text-[#9ca2af]" />
        </div>
        <Link
          href="/service/settings/accounts"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/accounts"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          전체계정
        </Link>
        <Link
          href="/service/settings/permissions"
          className={`block rounded-lg px-8 py-2.5 font-bold ${
            pathname === "/service/settings/permissions"
              ? "bg-[#f2f5ff] text-[#3157f6]"
              : "text-[#6f7789] hover:bg-[#f6f7fa]"
          }`}
        >
          권한설정
        </Link>
        <div className="mt-4 px-4 py-3 font-extrabold text-[#4d5569]">
          카드 결제관리
        </div>
        <div className="px-4 py-3 font-extrabold text-[#4d5569]">
          이용권 내역
        </div>
      </nav>
    </aside>
  );
}
