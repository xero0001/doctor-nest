"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BadgeCheck,
  BellRing,
  BookOpenText,
  Bot,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Folder,
  Languages,
  LoaderCircle,
  Mail,
  MessageCircleMore,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings2,
  Smile,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
} from "lucide-react";

import { SectionTabs } from "@/features/chatting/components/section-tabs";

import type {
  ChatChannel,
  ConversationItem,
  ManualFolderItem,
} from "./chat-types";

type ChatTab = "OPEN" | "CLOSED" | "IMPORTANT";
type ManualDocumentItem = ManualFolderItem["documents"][number];

const knowledgeTabs = [
  { value: "원내매뉴얼", label: "원내매뉴얼" },
  { value: "콘텐츠", label: "콘텐츠" },
] as const;

const channelMeta: Record<
  ChatChannel,
  {
    label: string;
    compactLabel: string;
    badge: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  KAKAO: {
    label: "카카오",
    compactLabel: "K",
    badge: "K",
    badgeClass: "bg-[#fee500] text-[#252525]",
    dotClass: "bg-[#fee500]",
  },
  LINE: {
    label: "LINE",
    compactLabel: "L",
    badge: "L",
    badgeClass: "bg-[#06c755] text-white",
    dotClass: "bg-[#06c755]",
  },
  NAVER_TALK: {
    label: "네이버 톡톡",
    compactLabel: "N",
    badge: "N",
    badgeClass: "bg-[#03c75a] text-white",
    dotClass: "bg-[#03c75a]",
  },
  WECHAT: {
    label: "WeChat",
    compactLabel: "微",
    badge: "微",
    badgeClass: "bg-[#07c160] text-white",
    dotClass: "bg-[#07c160]",
  },
  WHATSAPP: {
    label: "WhatsApp",
    compactLabel: "W",
    badge: "W",
    badgeClass: "bg-[#25d366] text-white",
    dotClass: "bg-[#25d366]",
  },
  INSTAGRAM: {
    label: "Instagram",
    compactLabel: "IG",
    badge: "IG",
    badgeClass:
      "bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white",
    dotClass: "bg-[#d946ef]",
  },
};

const languageLabels: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

function formatListTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function getPrimaryMessageContent(
  message: ConversationItem["messages"][number],
) {
  if (
    message.direction === "INBOUND" &&
    message.translatedContent &&
    message.translatedContent !== message.content
  ) {
    return message.translatedContent;
  }

  return message.content;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function formatBirthDate(value: string | null) {
  if (!value) return "미등록";
  return new Intl.DateTimeFormat("ko-KR").format(new Date(value));
}

function flattenManualDocuments(
  folders: ManualFolderItem[],
): ManualDocumentItem[] {
  return folders.flatMap((folder) => [
    ...folder.documents,
    ...flattenManualDocuments(folder.children),
  ]);
}

function collectManualFolderIds(folders: ManualFolderItem[]): string[] {
  return folders.flatMap((folder) => [
    folder.id,
    ...collectManualFolderIds(folder.children),
  ]);
}

function countManualDocuments(folder: ManualFolderItem): number {
  return (
    folder.documents.length +
    folder.children.reduce(
      (count, child) => count + countManualDocuments(child),
      0,
    )
  );
}

function filterManualFolderTree(
  folders: ManualFolderItem[],
  query: string,
): ManualFolderItem[] {
  if (!query) return folders;

  return folders.flatMap((folder) => {
    const folderMatches = folder.name.toLowerCase().includes(query);
    const children = filterManualFolderTree(folder.children, query);
    const documents = folderMatches
      ? folder.documents
      : folder.documents.filter((document) =>
          [
            document.title,
            document.slug,
            ...document.tags.map((tag) => tag.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
        );

    if (!folderMatches && children.length === 0 && documents.length === 0) {
      return [];
    }

    return [
      {
        ...folder,
        children: folderMatches ? folder.children : children,
        documents,
      },
    ];
  });
}

function ManualFolderBranch({
  folder,
  depth,
  forceExpanded,
  openFolderIds,
  selectedManualId,
  onToggleFolder,
  onSelectManual,
}: {
  folder: ManualFolderItem;
  depth: number;
  forceExpanded: boolean;
  openFolderIds: Set<string>;
  selectedManualId: string;
  onToggleFolder: (id: string) => void;
  onSelectManual: (id: string) => void;
}) {
  const expanded = forceExpanded || openFolderIds.has(folder.id);
  const contentId = `manual-folder-${folder.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggleFolder(folder.id)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full items-center gap-2 py-2.5 pr-4 text-left text-[11px] font-bold text-[#51586d] hover:bg-[#f8f9fc]"
        style={{ paddingLeft: 16 + depth * 14 }}
      >
        <ChevronRight
          className={`size-3 shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <Folder
          className={`size-3.5 shrink-0 ${
            expanded ? "fill-[#f3f0ff] text-[#8066ec]" : "text-[#8d93a5]"
          }`}
        />
        <span className="min-w-0 flex-1 truncate">{folder.name}</span>
        <span className="text-[9px] font-medium text-[#a0a5b3]">
          {countManualDocuments(folder)}
        </span>
      </button>

      {expanded ? (
        <div id={contentId}>
          {folder.children.map((child) => (
            <ManualFolderBranch
              key={child.id}
              folder={child}
              depth={depth + 1}
              forceExpanded={forceExpanded}
              openFolderIds={openFolderIds}
              selectedManualId={selectedManualId}
              onToggleFolder={onToggleFolder}
              onSelectManual={onSelectManual}
            />
          ))}

          {folder.documents.map((document) => {
            const selected = selectedManualId === document.id;

            return (
              <button
                type="button"
                key={document.id}
                onClick={() => onSelectManual(document.id)}
                className={`flex w-full items-center gap-2 py-2.5 pr-4 text-left text-[10.5px] font-semibold ${
                  selected
                    ? "bg-[#f0ebff] text-[#6657e9]"
                    : "text-[#646b7f] hover:bg-[#f8f9fc]"
                }`}
                style={{ paddingLeft: 36 + depth * 14 }}
              >
                <Bookmark
                  className={`size-3.5 shrink-0 ${
                    selected
                      ? "fill-[#8066ec] text-[#8066ec]"
                      : "text-[#a5aaba]"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">
                  {document.title}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ChannelBadge({
  channel,
  large = false,
}: {
  channel: ChatChannel;
  large?: boolean;
}) {
  const meta = channelMeta[channel];

  return (
    <span
      className={`flex shrink-0 items-center justify-center font-extrabold shadow-sm ${meta.badgeClass} ${
        large
          ? "size-9 rounded-xl text-xs"
          : "size-[22px] rounded-[7px] text-[10px]"
      }`}
      aria-label={meta.label}
      title={meta.label}
    >
      {meta.badge}
    </span>
  );
}

export function ChattingClient({
  conversations,
  manualFolders,
}: {
  conversations: ConversationItem[];
  manualFolders: ManualFolderItem[];
}) {
  const [chatTab, setChatTab] = useState<ChatTab>("OPEN");
  const [selectedRoomId, setSelectedRoomId] = useState(
    conversations[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChatChannel | "ALL">(
    "ALL",
  );
  const [draft, setDraft] = useState("");
  const [knowledgeTab, setKnowledgeTab] = useState<"원내매뉴얼" | "콘텐츠">(
    "원내매뉴얼",
  );
  const [manualQuery, setManualQuery] = useState("");
  const [openManualFolderIds, setOpenManualFolderIds] = useState<Set<string>>(
    () => new Set(collectManualFolderIds(manualFolders)),
  );
  const [selectedManualId, setSelectedManualId] = useState(
    () => flattenManualDocuments(manualFolders)[0]?.id ?? "",
  );
  const [rooms, setRooms] = useState(conversations);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const detailRequestId = useRef(0);

  const visibleRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rooms.filter((conversation) => {
      const latestMessage = conversation.messages.at(-1);
      const matchesTab =
        chatTab === "IMPORTANT"
          ? conversation.important
          : conversation.status === chatTab;
      const matchesChannel =
        channelFilter === "ALL" || conversation.channel === channelFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${conversation.customer.name} ${conversation.customer.phone ?? ""} ${latestMessage?.content ?? ""} ${latestMessage?.translatedContent ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTab && matchesChannel && matchesQuery;
    });
  }, [chatTab, channelFilter, query, rooms]);

  const currentRoom =
    rooms.find((conversation) => conversation.id === selectedRoomId) ??
    rooms[0];
  const normalizedManualQuery = manualQuery.trim().toLowerCase();
  const filteredManualFolders = useMemo(
    () => filterManualFolderTree(manualFolders, normalizedManualQuery),
    [manualFolders, normalizedManualQuery],
  );
  const manualDocuments = useMemo(
    () => flattenManualDocuments(manualFolders),
    [manualFolders],
  );
  const selectedManual =
    manualDocuments.find((document) => document.id === selectedManualId) ??
    null;
  const chatTabs = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    let importantCount = 0;

    for (const room of rooms) {
      if (room.status === "OPEN") openCount += 1;
      if (room.status === "CLOSED") closedCount += 1;
      if (room.important) importantCount += 1;
    }

    return [
      {
        value: "OPEN",
        label: "진행 중",
        count: openCount,
      },
      {
        value: "CLOSED",
        label: "완료",
        count: closedCount,
      },
      {
        value: "IMPORTANT",
        label: "중요",
        count: importantCount,
      },
    ] as const;
  }, [rooms]);

  function toggleManualFolder(id: string) {
    setOpenManualFolderIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  const selectConversation = useCallback(async (id: string) => {
    setSelectedRoomId(id);
    setDetailError("");
    setLoadingRoomId(id);

    const requestId = ++detailRequestId.current;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "채팅 내용을 불러오지 못했습니다.");
      }

      if (requestId !== detailRequestId.current) return;

      setRooms((current) =>
        current.map((room) => (room.id === id ? result.conversation! : room)),
      );
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(
        error instanceof Error
          ? error.message
          : "채팅 내용을 불러오지 못했습니다.",
      );
    } finally {
      if (requestId === detailRequestId.current) {
        setLoadingRoomId(null);
      }
    }
  }, []);

  const initialConversationId = conversations[0]?.id ?? "";
  const initialUnreadCount = conversations[0]?.unreadCount ?? 0;

  useEffect(() => {
    if (!initialConversationId || initialUnreadCount === 0) return;

    const abortController = new AbortController();

    async function markInitialConversationAsRead() {
      try {
        const response = await fetch(
          `/api/conversations/${initialConversationId}`,
          {
            method: "PATCH",
            cache: "no-store",
            signal: abortController.signal,
          },
        );
        const result = (await response.json()) as {
          conversation?: ConversationItem;
          error?: string;
        };

        if (!response.ok || !result.conversation) {
          throw new Error(result.error ?? "채팅 내용을 불러오지 못했습니다.");
        }

        setRooms((current) =>
          current.map((room) =>
            room.id === initialConversationId ? result.conversation! : room,
          ),
        );
      } catch (error) {
        if (abortController.signal.aborted) return;
        setDetailError(
          error instanceof Error
            ? error.message
            : "채팅 내용을 불러오지 못했습니다.",
        );
      }
    }

    void markInitialConversationAsRead();

    return () => abortController.abort();
  }, [initialConversationId, initialUnreadCount]);

  async function sendMessage() {
    const message = draft.trim();
    if (!message || !currentRoom || isSending) return;

    setIsSending(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/conversations/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, autoTranslate }),
      });
      const result = (await response.json()) as {
        message?: ConversationItem["messages"][number];
        error?: string;
      };

      if (!response.ok || !result.message) {
        throw new Error(result.error ?? "메시지를 저장하지 못했습니다.");
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === currentRoom.id
            ? {
                ...room,
                lastMessageAt: result.message!.sentAt,
                messages: [...room.messages, result.message!],
              }
            : room,
        ),
      );
      setDraft("");
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "메시지를 저장하지 못했습니다.",
      );
    } finally {
      setIsSending(false);
    }
  }

  if (!currentRoom) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center text-[#8b92a5]">
          <MessageCircleMore className="mx-auto mb-3 size-8" />
          <p className="text-sm font-semibold">
            아직 연결된 고객 대화가 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const currentMeta = channelMeta[currentRoom.channel];

  return (
    <div className="grid h-full max-h-full min-h-0 min-w-[1310px] grid-cols-[280px_300px_minmax(420px,1fr)_310px] overflow-x-auto overflow-y-hidden bg-white">
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#e7eaf1] bg-white">
        <header className="h-[72px] shrink-0 border-b border-[#e8eaf1] px-4 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-[-0.03em]">
                  고객채팅
                </h1>
                <span className="flex items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-1 text-[9px] font-bold text-[#3157f6]">
                  <span className="size-1.5 rounded-full bg-[#3157f6]" />
                  통합 상담
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="채팅 설정"
              className="flex size-8 items-center justify-center rounded-lg border border-[#e1e5ed] text-[#848b9e] hover:bg-[#f7f8fb]"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
        </header>

        <SectionTabs
          ariaLabel="채팅 상태"
          options={chatTabs}
          value={chatTab}
          onValueChange={setChatTab}
        />

        <div className="border-b border-[#eceef4] px-3 py-2.5">
          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e1e5ed] bg-[#f9fafc] px-3 text-[#949bad] focus-within:border-[#7187f6] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#3157f6]/10">
            <Search className="size-3.5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="고객명, 전화번호, 메시지 검색"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-[#30364b] outline-none placeholder:text-[#aab0bf]"
            />
          </label>
        </div>

        <div className="border-b border-[#eceef4] px-3 py-2.5">
          <label className="flex h-8 items-center gap-2 rounded-lg border border-[#e2e5ed] px-2.5 text-[10px] font-medium text-[#747b8e]">
            <span
              className={`size-2 rounded-full ${channelFilter === "ALL" ? "bg-[#3157f6]" : channelMeta[channelFilter].dotClass}`}
            />
            <select
              value={channelFilter}
              onChange={(event) =>
                setChannelFilter(event.target.value as ChatChannel | "ALL")
              }
              className="min-w-0 flex-1 appearance-none bg-transparent outline-none"
              aria-label="채널 필터"
            >
              <option value="ALL">모든 채널</option>
              {(Object.keys(channelMeta) as ChatChannel[]).map((channel) => (
                <option key={channel} value={channel}>
                  {channelMeta[channel].label}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleRooms.map((room) => {
            const latestMessage = room.messages.at(-1);
            const latestMessageContent = latestMessage
              ? getPrimaryMessageContent(latestMessage)
              : "새로운 대화";
            const selected = currentRoom.id === room.id;

            return (
              <button
                type="button"
                key={room.id}
                onClick={() => void selectConversation(room.id)}
                className={`relative w-full border-b border-[#f0f1f5] px-4 py-3.5 text-left transition-colors ${
                  selected ? "bg-[#edf3ff]" : "hover:bg-[#f8f9fc]"
                }`}
              >
                {selected ? (
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-[#3157f6]" />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ChannelBadge channel={room.channel} />
                    <span className="truncate text-base font-bold text-[#2f3449]">
                      {room.customer.name}
                    </span>
                    {room.unreadCount > 0 ? (
                      <span className="flex min-w-4 items-center justify-center rounded-full bg-[#f04f68] px-1 text-[9px] font-bold text-white">
                        {room.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <Star
                    className={`size-3.5 shrink-0 ${
                      room.important
                        ? "fill-[#ffcf34] text-[#ffbe19]"
                        : "text-[#d2d5de]"
                    }`}
                  />
                </div>
                <div className="mt-2 flex h-10 items-end justify-between gap-3 pl-[30px]">
                  <div className="flex h-full min-w-0 flex-1 items-center">
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#767d91]">
                      {latestMessageContent}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] text-[#a8adba]">
                    {formatListTime(room.lastMessageAt)}
                  </span>
                </div>
              </button>
            );
          })}

          {visibleRooms.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-[#a1a7b6]">
              <MessageCircleMore className="mb-2 size-6" />
              <p className="text-xs">조건에 맞는 채팅이 없습니다.</p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#e8eaf1] bg-[#fafbfe] px-4 py-3">
          <div className="flex items-center justify-between text-[10px] text-[#7d8497]">
            <span>연결 채널 6개</span>
            <div className="flex -space-x-1">
              {(Object.keys(channelMeta) as ChatChannel[]).map((channel) => (
                <span
                  key={channel}
                  title={channelMeta[channel].label}
                  className={`flex size-5 items-center justify-center rounded-full border-2 border-white text-[7px] font-black ${channelMeta[channel].badgeClass}`}
                >
                  {channelMeta[channel].compactLabel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#e8eaf1] bg-white">
        <header className="flex h-[72px] shrink-0 items-start border-b border-[#e8eaf1] px-4 pt-4">
          <h2 className="text-base font-bold tracking-[-0.03em]">
            상담 백과사전
          </h2>
        </header>

        <SectionTabs
          ariaLabel="상담 백과사전 구분"
          options={knowledgeTabs}
          value={knowledgeTab}
          onValueChange={setKnowledgeTab}
        />

        <div className="shrink-0 border-b border-[#edf0f5] p-3">
          <label className="flex h-8 items-center gap-2 rounded-lg border border-[#e2e5ed] px-3 text-[#9ba1b1] focus-within:border-[#8676ef]">
            <Search className="size-3.5" />
            <input
              value={manualQuery}
              onChange={(event) => setManualQuery(event.target.value)}
              placeholder="폴더, 문서, 태그 검색"
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#aeb3c0]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {knowledgeTab === "원내매뉴얼" ? (
            <>
              <div className="border-b border-[#e8eaf1] py-2">
                {filteredManualFolders.map((folder) => (
                  <ManualFolderBranch
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    forceExpanded={Boolean(normalizedManualQuery)}
                    openFolderIds={openManualFolderIds}
                    selectedManualId={selectedManual?.id ?? ""}
                    onToggleFolder={toggleManualFolder}
                    onSelectManual={(id) =>
                      setSelectedManualId((current) =>
                        current === id ? "" : id,
                      )
                    }
                  />
                ))}
                {filteredManualFolders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[10px] text-[#989eae]">
                    검색 조건에 맞는 원내매뉴얼이 없습니다.
                  </div>
                ) : null}
              </div>

              {selectedManual ? (
                <article className="px-4 py-4 text-sm leading-[1.75] text-[#5d6478]">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {selectedManual.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-md px-2 py-1 text-[9px] font-bold"
                        style={{
                          backgroundColor: `${tag.color}18`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-3 text-base font-bold text-[#33394d]">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mt-5 border-t border-[#eceef3] pt-4 text-base font-bold text-[#33394d] first:mt-0 first:border-t-0 first:pt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mt-4 text-base font-bold text-[#41485c]">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mt-2 whitespace-pre-wrap">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {children}
                        </ul>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="mt-3 rounded-lg border-l-2 border-[#8066ec] bg-[#f7f4ff] px-3 py-2 text-[#71778a]">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="my-4 border-[#eceef3]" />,
                    }}
                  >
                    {selectedManual.contentMarkdown}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="px-4 py-10 text-center text-[10px] text-[#989eae]">
                  등록된 원내매뉴얼이 없습니다.
                </div>
              )}
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-[#9aa0b0]">
              <BookOpenText className="mb-2 size-6" />
              <p className="text-[10px]">병원 콘텐츠를 준비하고 있습니다.</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#f2f5fb]">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e5e8f0] bg-white px-5">
          <div className="flex min-w-0 items-center gap-3">
            <ChannelBadge channel={currentRoom.channel} large />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-bold tracking-[-0.03em]">
                  {currentRoom.customer.name}
                </h2>
                {currentRoom.customer.tags.includes("VIP") ? (
                  <span className="rounded-full bg-[#fff3c5] px-2 py-0.5 text-[8px] font-bold text-[#a97500]">
                    VIP
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-[#9298a8]">
                {currentMeta.label} ·{" "}
                {currentRoom.customer.phone ?? "연락처 미등록"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-[#edf8f2] px-2.5 py-1.5 text-[9px] font-bold text-[#1c9a5f] sm:flex">
              <span className="size-1.5 rounded-full bg-[#1fb46b]" />
              AI 자동응대
            </span>
            <button
              type="button"
              aria-label="고객에게 전화하기"
              className="flex size-8 items-center justify-center rounded-lg border border-[#e1e5ed] bg-white text-[#657087] hover:text-[#3157f6]"
            >
              <Phone className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="채팅 더보기"
              className="flex size-8 items-center justify-center rounded-lg border border-[#e1e5ed] bg-white text-[#657087]"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-[#e5e8f0] bg-white px-5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-[#858c9e]">
              치료태그
            </span>
            {currentRoom.customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[#edf1ff] px-2 py-1 text-xs font-bold text-[#3157f6]"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-[#858c9e]">
            <Languages className="size-3.5" />
            {languageLabels[currentRoom.customer.language] ??
              currentRoom.customer.language}
          </span>
        </div>

        {loadingRoomId === currentRoom.id ? (
          <div className="absolute left-1/2 top-[118px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#dce2f4] bg-white px-3 py-2 text-[9px] font-semibold text-[#66708a] shadow-lg">
            <LoaderCircle className="size-3.5 animate-spin text-[#3157f6]" />
            DB에서 최신 채팅을 불러오는 중
          </div>
        ) : null}

        {detailError ? (
          <div
            role="alert"
            className="absolute left-1/2 top-[118px] z-20 -translate-x-1/2 rounded-full bg-[#fff0f2] px-3 py-2 text-[9px] font-semibold text-[#d8465b] shadow-lg"
          >
            {detailError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto mb-6 w-fit rounded-full bg-[#e4e8f1] px-3 py-1 text-[9px] font-medium text-[#7f8698]">
            {formatDate(
              currentRoom.messages[0]?.sentAt ?? currentRoom.lastMessageAt,
            )}
          </div>

          <div className="mx-auto max-w-[720px]">
            {currentRoom.messages.map((message) => {
              const inbound = message.direction === "INBOUND";
              const hasTranslation =
                Boolean(message.translatedContent) &&
                message.translatedContent !== message.content;
              const primaryContent = getPrimaryMessageContent(message);
              const secondaryContent = inbound
                ? message.content
                : message.translatedContent;
              const translationLabel = inbound
                ? `원문 · ${message.sourceLanguageName || message.sourceLanguage}`
                : `발송 · ${message.translatedLanguageName || message.translatedLanguage}`;

              if (message.sender === "SYSTEM") {
                return (
                  <div key={message.id} className="my-4 flex justify-center">
                    <span className="rounded-full bg-[#e7edff] px-3 py-1.5 text-[9px] font-semibold text-[#4765dc]">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`mb-5 flex ${inbound ? "justify-start" : "justify-end"}`}
                >
                  <div className={`max-w-[72%] ${inbound ? "" : "text-right"}`}>
                    {inbound ? (
                      <p className="mb-1.5 pl-1 text-base font-semibold text-[#596176]">
                        {currentRoom.customer.name}
                      </p>
                    ) : null}
                    {message.sender === "AI" ? (
                      <p className="mb-1 flex items-center justify-end gap-1 text-[8px] font-semibold text-[#6657e9]">
                        <Sparkles className="size-2.5" /> AI 답변
                      </p>
                    ) : null}
                    <div
                      className={`rounded-2xl px-4 py-3 text-left text-base leading-[1.7] shadow-sm ${
                        inbound
                          ? "rounded-tl-[5px] border border-[#dfe3ec] bg-white text-[#454b5e]"
                          : "rounded-br-[5px] bg-gradient-to-br from-[#3157f6] to-[#6657e9] text-white"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {primaryContent}
                      </p>
                      {hasTranslation ? (
                        <div
                          className={`mt-3 border-t pt-2.5 text-sm leading-relaxed ${
                            inbound
                              ? "border-[#e4e7ef] text-[#737b8f]"
                              : "border-white/20 text-white/85"
                          }`}
                        >
                          <span
                            className={`mb-1 inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${
                              inbound
                                ? "bg-[#eef2ff] text-[#526be0]"
                                : "bg-white/15 text-white"
                            }`}
                          >
                            {translationLabel}
                          </span>
                          <p className="whitespace-pre-wrap break-words">
                            {secondaryContent}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 text-[8px] text-[#a0a6b4] ${inbound ? "text-left" : "text-right"}`}
                    >
                      {formatMessageTime(message.sentAt)}
                      {!inbound ? (
                        <Check className="ml-1 inline size-2.5 text-[#3157f6]" />
                      ) : null}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#dfe3ec] bg-white p-3">
          <div className="mx-auto max-w-[740px]">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#858c9e]">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft(
                      "문의 주신 내용을 확인했습니다. 예약 가능한 시간을 확인해 바로 안내드리겠습니다.",
                    )
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-[#eef2ff] px-2 py-1 font-semibold text-[#3157f6]"
                >
                  <WandSparkles className="size-3" /> AI 답변 제안
                </button>
                <span className="truncate">
                  {autoTranslate
                    ? "고객 언어에 맞춰 자동 번역됩니다."
                    : "입력한 원문 그대로 발송됩니다."}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-[#596176]">자동 번역</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoTranslate}
                  aria-label="자동 번역"
                  onClick={() => setAutoTranslate((enabled) => !enabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    autoTranslate ? "bg-[#3157f6]" : "bg-[#c7ccd8]"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                      autoTranslate ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-[#dfe3ec] bg-white p-2 focus-within:border-[#7187f6] focus-within:ring-2 focus-within:ring-[#3157f6]/10">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                placeholder={`${currentMeta.label}로 메시지를 입력해 주세요.`}
                className="w-full resize-none bg-transparent px-1 text-[11px] leading-5 text-[#33394e] outline-none placeholder:text-[#adb2bf]"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[#9198aa]">
                  <button
                    type="button"
                    aria-label="파일 첨부"
                    className="rounded-md p-1.5 hover:bg-[#f1f3f8]"
                  >
                    <Paperclip className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="이모지"
                    className="rounded-md p-1.5 hover:bg-[#f1f3f8]"
                  >
                    <Smile className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || isSending}
                  className="flex h-7 items-center gap-1 rounded-lg bg-[#3157f6] px-3 text-[10px] font-bold text-white disabled:bg-[#d9dde6]"
                >
                  {isSending ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Send className="size-3" />
                  )}
                  전송
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-[#e8eaf1] bg-[#fafbfe]">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e8eaf1] bg-white px-4">
          <div>
            <p className="text-[9px] font-semibold text-[#8d94a6]">고객 정보</p>
            <h2 className="mt-1 text-[14px] font-bold">
              {currentRoom.customer.name}
              <span className="ml-1.5 font-mono text-[9px] font-medium text-[#9aa0af]">
                #{currentRoom.customer.chartNumber}
              </span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="고객 정보 더보기"
            className="rounded-lg border border-[#e1e5ed] p-2 text-[#80879a]"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-[#e5e8ef] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#3157f6]">
                <CircleUserRound className="size-6" />
              </span>
              <div>
                <p className="text-[13px] font-bold">
                  {currentRoom.customer.name}
                </p>
                <p className="mt-1 text-[9px] text-[#8d94a6]">
                  {currentRoom.customer.gender ?? "미등록"} ·{" "}
                  {formatBirthDate(currentRoom.customer.birthDate)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] text-[#697084]">
                <Phone className="size-3.5 text-[#9ca2b3]" />
                {currentRoom.customer.phone ?? "전화번호 미등록"}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#697084]">
                <Mail className="size-3.5 text-[#9ca2b3]" />
                {currentRoom.customer.email ?? "이메일 미등록"}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#697084]">
                <MessageCircleMore className="size-3.5 text-[#9ca2b3]" />
                <span className="shrink-0">연결 채널</span>
                <span className="flex min-w-0 flex-wrap gap-1">
                  {currentRoom.customer.channels.map((patientChannel) => (
                    <span
                      key={patientChannel.id}
                      title={
                        patientChannel.displayName ??
                        channelMeta[patientChannel.channel].label
                      }
                      className={`flex size-5 items-center justify-center rounded-md text-[7px] font-black ${channelMeta[patientChannel.channel].badgeClass}`}
                    >
                      {channelMeta[patientChannel.channel].compactLabel}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </section>

          <section className="border-b border-[#e5e8ef] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#3157f6]" />
                <h3 className="text-[11px] font-bold">예약 내역</h3>
              </div>
              <button
                type="button"
                className="text-[9px] font-semibold text-[#3157f6]"
              >
                예약 추가
              </button>
            </div>

            {currentRoom.customer.appointments.length > 0 ? (
              <div className="space-y-2">
                {currentRoom.customer.appointments.map((appointment) => {
                  const active = appointment.status === "SCHEDULED";
                  return (
                    <div
                      key={appointment.id}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                        active
                          ? "border-[#cfd8ff] bg-[#f4f6ff]"
                          : "border-[#e4e7ee] bg-white"
                      }`}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-[#3157f6] text-white"
                            : "bg-[#f0f2f6] text-[#9da3b1]"
                        }`}
                      >
                        {active ? (
                          <BellRing className="size-3.5" />
                        ) : (
                          <CalendarDays className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[9.5px] font-bold ${active ? "text-[#344fc5]" : "text-[#62697c]"}`}
                        >
                          {formatDate(appointment.scheduledAt)}
                        </p>
                        <p className="mt-0.5 text-[8.5px] text-[#969cac]">
                          {appointment.doctorName} ·{" "}
                          {appointment.treatment ?? "상담"}
                        </p>
                      </div>
                      {active ? (
                        <span className="rounded-full bg-[#e6ecff] px-1.5 py-0.5 text-[8px] font-bold text-[#3157f6]">
                          예정
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dfe3ec] px-3 py-4 text-center text-[9px] text-[#9298aa]">
                등록된 예약이 없습니다.
              </div>
            )}
          </section>

          <section className="border-b border-[#e5e8ef] p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="size-4 text-[#6657e9]" />
              <h3 className="text-[11px] font-bold">상담 메모</h3>
            </div>
            <p className="rounded-xl border border-[#e1e5ed] bg-white p-3 text-[10px] leading-[1.65] text-[#62697c]">
              {currentRoom.customer.notes ?? "등록된 고객 메모가 없습니다."}
            </p>
          </section>

          <section className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[#3157f6]">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#edf1ff]">
                <Sparkles className="size-3.5" />
              </span>
              <p className="text-[10px] font-bold">AI 상담 코치</p>
            </div>
            <div className="rounded-xl border border-[#e0e4ed] bg-white p-3.5 shadow-[0_4px_14px_rgba(42,54,102,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#747b8f]">
                  <Bot className="size-3.5 text-[#6657e9]" /> 상담 요약
                </span>
                <span className="rounded-full bg-[#eef8f3] px-2 py-1 text-[8px] font-bold text-[#1d9b60]">
                  <BadgeCheck className="mr-1 inline size-2.5" />
                  분석 완료
                </span>
              </div>
              <p className="text-[10px] leading-[1.65] text-[#5a6175]">
                고객이 {currentRoom.customer.tags.at(-1) ?? "시술"} 상담과 예약
                가능 시간을 문의했습니다. 고객 언어에 맞춰 일정 선택지를 안내해
                주세요.
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft(
                    "문의 주신 내용을 확인했습니다. 예약 가능한 시간을 확인해 바로 안내드리겠습니다.",
                  )
                }
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] py-2 text-[9px] font-bold text-[#3157f6]"
              >
                <WandSparkles className="size-3" /> 답변에 사용
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-[#e3e6ee] bg-white px-4 py-3">
          <div className="flex items-center justify-between text-[9px] text-[#8e95a7]">
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3" /> 최근 정보 업데이트
            </span>
            <span>방금 전</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
