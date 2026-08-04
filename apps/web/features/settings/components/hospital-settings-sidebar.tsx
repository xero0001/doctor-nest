"use client";

import { CreditCard, TicketCheck } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  SectionSidebar,
  type SectionSidebarGroup,
} from "@/features/navigation/components/section-sidebar";
import { authClient } from "@/lib/auth-client";

export function HospitalSettingsSidebar() {
  const pathname = usePathname();
  const session = authClient.useSession();
  const role = (session.data?.user as { role?: string } | undefined)?.role;
  const canViewPermissions = role === "OWNER" || role === "ADMIN";
  const groups: SectionSidebarGroup[] = [
    {
      id: "hospital-information",
      label: "병원정보",
      items: [
        {
          id: "hospital-profile",
          label: "병원프로필",
          href: "/service/settings/profile",
          active: pathname === "/service/settings/profile",
        },
        {
          id: "app-link",
          label: "앱 가입 링크 설정",
          disabled: true,
          title: "준비 중입니다.",
        },
        {
          id: "auto-replies",
          label: "자동응대 메시지",
          href: "/service/settings/auto-replies",
          active: pathname === "/service/settings/auto-replies",
        },
      ],
    },
    {
      id: "service-settings",
      label: "서비스설정",
      items: [
        {
          id: "basic-settings",
          label: "기본설정",
          href: "/service/settings/basic",
          active: pathname === "/service/settings/basic",
        },
        {
          id: "channel-connections",
          label: "채널연동",
          href: "/service/settings/channels",
          active: pathname === "/service/settings/channels",
        },
        {
          id: "customer-tags",
          label: "고객태그",
          href: "/service/settings/customer-tags",
          active: pathname === "/service/settings/customer-tags",
        },
      ],
    },
    {
      id: "account-management",
      label: "계정관리",
      items: [
        {
          id: "accounts",
          label: "전체계정",
          href: "/service/settings/accounts",
          active: pathname === "/service/settings/accounts",
        },
        ...(canViewPermissions
          ? [
              {
                id: "permissions",
                label: "권한설정",
                href: "/service/settings/permissions",
                active: pathname === "/service/settings/permissions",
              },
            ]
          : []),
      ],
    },
    {
      id: "billing",
      label: "결제관리",
      items: [
        {
          id: "card-payments",
          label: "카드 결제관리",
          icon: CreditCard,
          disabled: true,
          title: "준비 중입니다.",
        },
        {
          id: "passes",
          label: "이용권 내역",
          icon: TicketCheck,
          disabled: true,
          title: "준비 중입니다.",
        },
      ],
    },
  ];

  return (
    <SectionSidebar
      title="병원 설정"
      ariaLabel="병원 설정 메뉴"
      groups={groups}
    />
  );
}
