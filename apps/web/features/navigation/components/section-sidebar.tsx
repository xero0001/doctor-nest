"use client";

import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export type SectionSidebarItem = {
  id: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  trailing?: ReactNode;
  title?: string;
  onSelect?: () => void;
};

export type SectionSidebarGroup = {
  id: string;
  label?: string;
  icon?: LucideIcon;
  items: SectionSidebarItem[];
  presentation?: "label" | "tree";
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export const SECTION_SIDEBAR_WIDTH_PX = 300;

function SidebarItem({
  item,
  indented = false,
}: {
  item: SectionSidebarItem;
  indented?: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <>
      {Icon ? (
        <Icon
          className="size-4 shrink-0"
          strokeWidth={item.active ? 2.2 : 1.8}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge !== undefined ? (
        <span className="shrink-0 text-xs font-bold">{item.badge}</span>
      ) : null}
      {item.trailing !== undefined ? (
        <span className="flex shrink-0 items-center">{item.trailing}</span>
      ) : null}
    </>
  );
  const className = `flex h-11 w-full items-center gap-2 rounded-xl ${indented ? "pl-6 pr-4" : "px-4"} text-left text-sm font-bold transition-colors ${
    item.active
      ? "bg-[#edf3ff] text-[#3157f6]"
      : item.disabled
        ? "cursor-not-allowed text-[#b4bac7]"
        : "text-[#4d556a] hover:bg-[#f7f8fb]"
  }`;

  if (item.href && !item.disabled) {
    return (
      <Link
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        title={item.title}
        className={className}
      >
        {content}
      </Link>
    );
  }

  if (!item.onSelect && !item.disabled) {
    return (
      <div
        aria-current={item.active ? "page" : undefined}
        title={item.title}
        className={className}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={item.disabled}
      title={item.title}
      aria-pressed={item.onSelect ? item.active : undefined}
      onClick={item.onSelect}
      className={className}
    >
      {content}
    </button>
  );
}

function SidebarGroup({ group }: { group: SectionSidebarGroup }) {
  const activeInGroup = group.items.some((item) => item.active);
  const [expanded, setExpanded] = useState(
    () => group.defaultExpanded !== false || activeInGroup,
  );
  const GroupIcon = group.icon;
  const isTree = group.presentation === "tree";
  const showItems = !group.collapsible || expanded;

  return (
    <section aria-labelledby={group.label ? `${group.id}-heading` : undefined}>
      {group.label ? (
        group.collapsible ? (
          <button
            type="button"
            id={`${group.id}-heading`}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className={`flex w-full items-center gap-2 rounded-xl text-left font-extrabold transition-colors hover:bg-[#f7f8fb] ${
              isTree
                ? "h-10 px-3 text-sm text-[#4d556a]"
                : "h-9 px-3 text-xs text-[#70798e]"
            }`}
          >
            {expanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-[#9ca3b2]" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-[#9ca3b2]" />
            )}
            {GroupIcon ? (
              <GroupIcon className="size-4 shrink-0 text-[#969dae]" />
            ) : null}
            <span className="min-w-0 flex-1 truncate">{group.label}</span>
          </button>
        ) : (
          <h2
            id={`${group.id}-heading`}
            className="px-3 pb-2 text-sm font-extrabold text-[#7d8599]"
          >
            {group.label}
          </h2>
        )
      ) : null}

      {showItems ? (
        <div className={`${group.label ? "mt-1" : ""} space-y-1`}>
          {group.items.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              indented={Boolean(group.label) && group.presentation !== "tree"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SectionSidebar({
  title,
  ariaLabel,
  groups,
  afterNavigation,
}: {
  title: string;
  ariaLabel: string;
  groups: SectionSidebarGroup[];
  afterNavigation?: ReactNode;
}) {
  return (
    <aside
      className="flex shrink-0 flex-col border-r border-[#e4e7ee] bg-white p-5"
      style={{ width: SECTION_SIDEBAR_WIDTH_PX }}
    >
      <header className="px-1 pb-2">
        <h1 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
          {title}
        </h1>
      </header>

      <nav className="mt-2 space-y-4" aria-label={ariaLabel}>
        {groups.map((group) => (
          <SidebarGroup key={group.id} group={group} />
        ))}
      </nav>

      {afterNavigation ? <div className="mt-7">{afterNavigation}</div> : null}
    </aside>
  );
}
