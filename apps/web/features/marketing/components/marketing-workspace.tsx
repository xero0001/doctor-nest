"use client";

import { BarChart3, ChevronRight, Globe2, Megaphone } from "lucide-react";
import type { ReactNode } from "react";

import {
  SectionSidebar,
  type SectionSidebarGroup,
} from "@/features/navigation/components/section-sidebar";

type MarketingSection = "REGISTER" | "STATUS";

type MarketingWorkspaceProps = {
  activeSection: MarketingSection;
  children: ReactNode;
};

export function MarketingWorkspace({
  activeSection,
  children,
}: MarketingWorkspaceProps) {
  const groups: SectionSidebarGroup[] = [
    {
      id: "new-patient-marketing",
      label: "신규환자 마케팅",
      items: [
        {
          id: "domestic-marketing",
          label: "국내 마케팅",
          icon: Megaphone,
          disabled: true,
          title: "국내 마케팅은 준비 중입니다.",
          badge: "준비 중",
        },
        {
          id: "global-marketing",
          label: "해외 마케팅",
          icon: Globe2,
          disabled: true,
          title: "해외 마케팅은 준비 중입니다.",
          badge: "준비 중",
        },
      ],
    },
    {
      id: "revisit-marketing",
      label: "재진 마케팅",
      items: [
        {
          id: "marketing-register",
          label: "마케팅 등록",
          href: "/service/marketing",
          icon: Megaphone,
          active: activeSection === "REGISTER",
          trailing: <ChevronRight className="size-4 opacity-50" />,
        },
        {
          id: "marketing-status",
          label: "마케팅 현황",
          href: "/service/marketing/status",
          icon: BarChart3,
          active: activeSection === "STATUS",
          trailing: <ChevronRight className="size-4 opacity-50" />,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-[1080px] bg-white">
      <SectionSidebar title="마케팅" ariaLabel="마케팅 메뉴" groups={groups} />

      <section className="flex min-w-0 flex-1 flex-col">{children}</section>
    </div>
  );
}
