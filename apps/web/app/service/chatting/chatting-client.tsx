"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import {
  BadgeCheck,
  BookOpenText,
  Bot,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Folder,
  Languages,
  Link2,
  LoaderCircle,
  LogOut,
  MessageCircleMore,
  Paperclip,
  Search,
  Save,
  Send,
  Settings,
  Smile,
  Sparkles,
  Star,
  RotateCcw,
  UserPlus,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";

import { LineChannelIcon } from "@/features/channels/components/line-channel-icon";
import { InstagramChannelIcon } from "@/features/channels/components/instagram-channel-icon";
import { KakaoChannelIcon } from "@/features/channels/components/kakao-channel-icon";
import { NaverTalkChannelIcon } from "@/features/channels/components/naver-talk-channel-icon";
import { WeChatChannelIcon } from "@/features/channels/components/wechat-channel-icon";
import { WhatsAppChannelIcon } from "@/features/channels/components/whatsapp-channel-icon";
import { SectionTabs } from "@/components/section-tabs";
import {
  inferConversationTargetLanguage,
  translationLanguageOptions,
  type TranslationTargetLanguage,
} from "@/lib/conversation-language";
import { formatPhoneWithCountryCode } from "@/lib/phone-country";
import type { ContentEventRecord } from "@/features/events/types";

import type {
  ChatCoachSuggestion,
  ChatChannel,
  ConversationItem,
  ManualFolderItem,
  PatientSearchResult,
  StaffMember,
} from "./chat-types";

type ChatStatusFilter = "ALL" | "OPEN" | "IMPORTANT";
type ChatSortOrder = "LATEST" | "OLDEST";
type RightPanelTab = "AUTOMATION" | "BOOKMARKS";
type ChatSearchField =
  "CUSTOMER_NAME" | "PHONE" | "CHART_NUMBER" | "ASSIGNEE" | "CONTENT";
type CustomerSearchField = "name" | "phone";
type ManualDocumentItem = ManualFolderItem["documents"][number];
type ConversationContextMenu = {
  roomId: string;
  x: number;
  y: number;
};

const CHAT_POLL_INTERVAL_MS = 5_000;
const MAX_PATIENT_NOTES_LENGTH = 5_000;

type CustomerNotesSaveStatus = "idle" | "saving" | "saved" | "error";

const knowledgeTabs = [
  { value: "원내매뉴얼", label: "치료태그 매뉴얼" },
  { value: "콘텐츠", label: "콘텐츠" },
] as const;

const chatSearchOptions: Array<{
  value: ChatSearchField;
  label: string;
  placeholder: string;
}> = [
  {
    value: "CUSTOMER_NAME",
    label: "고객명",
    placeholder: "고객명 검색",
  },
  { value: "PHONE", label: "전화번호", placeholder: "전화번호 검색" },
  { value: "CHART_NUMBER", label: "차트번호", placeholder: "차트번호 검색" },
  { value: "ASSIGNEE", label: "담당자명", placeholder: "담당자명 검색" },
  { value: "CONTENT", label: "내용 검색", placeholder: "대화 내용 검색" },
];

const chatSortOptions = [
  { value: "LATEST", label: "최신 대화 순" },
  { value: "OLDEST", label: "오래된 대화 순" },
] as const;

function ChatListSelect<T extends string>({
  value,
  options,
  ariaLabel,
  onValueChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
  onValueChange: (value: T) => void;
}) {
  const activeOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <label className="relative flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-[#737a8d] transition-colors hover:bg-[#f5f6f9] hover:text-[#41485d] focus-within:bg-[#f5f6f9] focus-within:ring-2 focus-within:ring-[#3157f6]/15">
      <span className="pointer-events-none whitespace-nowrap">
        {activeOption.label}
      </span>
      <ChevronDown className="pointer-events-none size-3.5 shrink-0 text-[#a0a6b4]" />
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value as T)}
        aria-label={ariaLabel}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

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

const chatChannelOptions: ReadonlyArray<{
  value: ChatChannel | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "전체 채널" },
  ...(Object.keys(channelMeta) as ChatChannel[]).map((channel) => ({
    value: channel,
    label: channelMeta[channel].label,
  })),
];

function getConversationDisplayName(conversation: ConversationItem) {
  return (
    conversation.customer?.name ??
    conversation.chatAccount.displayName ??
    `${channelMeta[conversation.channel].label} 미연동 고객`
  );
}

function getConversationPhone(conversation: ConversationItem) {
  return conversation.customer?.phone ?? conversation.chatAccount.phone;
}

function getGenderLabel(gender: string | null) {
  const normalized = gender?.trim().toUpperCase();
  if (!normalized) return "-";
  if (["MALE", "M", "남", "남성"].includes(normalized)) return "남";
  if (["FEMALE", "F", "여", "여성"].includes(normalized)) return "여";
  if (["OTHER", "기타"].includes(normalized)) return "기타";
  return gender!.trim();
}

function formatHeaderBirthDate(value: string | null) {
  if (!value) return "-";

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

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

function formatSavedAt(value: string | null) {
  if (!value) return "아직 저장하지 않음";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatCompactBirthDate(value: string | null) {
  if (!value) return "생년월일 미등록";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

function ManualDocumentContent({ document }: { document: ManualDocumentItem }) {
  return (
    <article className="border-b border-[#e8eaf1] px-4 py-4 text-sm leading-[1.75] text-[#5d6478]">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {document.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-md px-2 py-1 text-xs font-bold"
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
            <h2 className="mt-5 text-base font-bold text-[#33394d] first:mt-0">
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
            <ul className="mt-2 list-disc space-y-1 pl-4">{children}</ul>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-3 rounded-lg border-l-2 border-[#8066ec] bg-[#f7f4ff] px-3 py-2 text-[#71778a]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[#eceef3]" />,
        }}
      >
        {document.contentMarkdown}
      </ReactMarkdown>
      {document.images.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {document.images.map((image) => (
            <figure
              key={image.id}
              className="overflow-hidden rounded-xl border border-[#e1e5ed] bg-white"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={image.publicUrl}
                  alt={image.altText || image.originalName}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              {image.altText ? (
                <figcaption className="px-3 py-2 text-[10px] text-[#7d8497]">
                  {image.altText}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}
      {document.cautionEnabled && document.cautionMarkdown ? (
        <div className="mt-4 rounded-xl border border-[#f0d49f] bg-[#fff8e9] px-3 py-3 text-xs leading-6 text-[#755a32]">
          <p className="font-bold text-[#9a681d]">주의사항</p>
          <ReactMarkdown>{document.cautionMarkdown}</ReactMarkdown>
        </div>
      ) : null}
    </article>
  );
}

function ManualFolderBranch({
  folder,
  depth,
  forceExpanded,
  openFolderIds,
  selectedManualId,
  bookmarkedManualIds,
  onToggleFolder,
  onSelectManual,
  onToggleBookmark,
}: {
  folder: ManualFolderItem;
  depth: number;
  forceExpanded: boolean;
  openFolderIds: Set<string>;
  selectedManualId: string;
  bookmarkedManualIds: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectManual: (id: string) => void;
  onToggleBookmark: (id: string) => void;
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
              bookmarkedManualIds={bookmarkedManualIds}
              onToggleFolder={onToggleFolder}
              onSelectManual={onSelectManual}
              onToggleBookmark={onToggleBookmark}
            />
          ))}

          {folder.documents.map((document) => {
            const selected = selectedManualId === document.id;
            const bookmarked = bookmarkedManualIds.has(document.id);
            const documentContentId = `manual-document-${document.id}`;

            return (
              <div key={document.id}>
                <div
                  className={`flex w-full items-center py-2.5 pr-4 text-xs font-semibold ${
                    selected
                      ? "bg-[#f0ebff] text-[#6657e9]"
                      : "text-[#646b7f] hover:bg-[#f8f9fc]"
                  }`}
                  style={{ paddingLeft: 22 + depth * 14 }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectManual(document.id)}
                    aria-expanded={selected}
                    aria-controls={documentContentId}
                    aria-label={`${document.title} ${selected ? "접기" : "펼치기"}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-white/70"
                  >
                    <ChevronRight
                      className={`size-3 transition-transform ${
                        selected ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(document.id)}
                    aria-pressed={bookmarked}
                    aria-label={`${document.title} 북마크 ${bookmarked ? "해제" : "추가"}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-white/70"
                  >
                    <Bookmark
                      className={`size-3.5 ${
                        bookmarked
                          ? "fill-[#8066ec] text-[#8066ec]"
                          : "text-[#a5aaba]"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectManual(document.id)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {document.title}
                  </button>
                </div>
                {selected ? (
                  <div id={documentContentId}>
                    <ManualDocumentContent document={document} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ContentEventCard({
  event,
  selected,
  onToggle,
}: {
  event: ContentEventRecord;
  selected: boolean;
  onToggle: () => void;
}) {
  const finalPrice = Math.max(0, event.originalPrice - event.discountAmount);

  return (
    <article className="border-b border-[#edf0f5] bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={selected}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
          selected ? "bg-[#f0ebff]" : "hover:bg-[#f8f9fc]"
        }`}
      >
        <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-[#f2f3f6]">
          {event.thumbnail ? (
            <Image
              src={event.thumbnail.publicUrl}
              alt={event.thumbnail.altText || event.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#a6acba]">
              <BookOpenText className="size-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {event.isPinned ? (
              <Star className="size-3 shrink-0 fill-[#ffcf34] text-[#ffbe19]" />
            ) : null}
            <h3 className="truncate text-sm font-bold text-[#3f475a]">
              {event.title}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8b92a3]">
            {event.summary || "등록된 소개글이 없습니다."}
          </p>
          <p className="mt-1 text-xs font-extrabold text-[#3157f6]">
            {finalPrice.toLocaleString("ko-KR")}원
          </p>
        </div>
        <ChevronRight
          className={`size-4 shrink-0 text-[#9ca2b1] transition-transform ${
            selected ? "rotate-90" : ""
          }`}
        />
      </button>

      {selected ? (
        <div className="border-t border-[#e7e3f7] bg-[#faf9ff] px-4 py-4">
          {event.exposureEndAt ? (
            <p className="mb-3 text-xs font-medium text-[#858c9d]">
              노출 종료 {event.exposureEndAt.slice(0, 10)}
            </p>
          ) : null}
          {event.detailType === "IMAGE" ? (
            event.detailImages.length > 0 ? (
              <div className="space-y-2">
                {event.detailImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white"
                  >
                    <Image
                      src={image.publicUrl}
                      alt={image.altText || event.title}
                      fill
                      sizes="320px"
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-xs text-[#989eae]">
                등록된 상세 이미지가 없습니다.
              </p>
            )
          ) : event.detailText ? (
            <div className="whitespace-pre-wrap rounded-lg bg-white px-3 py-3 text-xs leading-6 text-[#596176]">
              {event.detailText}
            </div>
          ) : (
            <p className="py-5 text-center text-xs text-[#989eae]">
              등록된 상세 내용이 없습니다.
            </p>
          )}
        </div>
      ) : null}
    </article>
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
  const size = large ? 36 : 22;

  if (channel === "KAKAO") {
    return <KakaoChannelIcon size={size} />;
  }

  if (channel === "LINE") {
    return <LineChannelIcon size={size} />;
  }

  if (channel === "NAVER_TALK") {
    return <NaverTalkChannelIcon size={size} />;
  }

  if (channel === "WECHAT") {
    return <WeChatChannelIcon size={size} />;
  }

  if (channel === "WHATSAPP") {
    return <WhatsAppChannelIcon size={size} />;
  }

  if (channel === "INSTAGRAM") {
    return <InstagramChannelIcon size={size} />;
  }

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

function CustomerNotesEditor({
  conversationId,
  patientId,
  chartNumber,
  initialNotes,
  initialNotesUpdatedAt,
  onSaved,
  onError,
}: {
  conversationId: string;
  patientId: string;
  chartNumber: string;
  initialNotes: string | null;
  initialNotesUpdatedAt: string | null;
  onSaved: (
    patientId: string,
    notes: string | null,
    notesUpdatedAt: string | null,
  ) => void;
  onError: (message: string) => void;
}) {
  const initialValue = initialNotes ?? "";
  const [draftNotes, setDraftNotes] = useState(initialValue);
  const [savedNotes, setSavedNotes] = useState(initialValue);
  const [savedAt, setSavedAt] = useState(initialNotesUpdatedAt);
  const [saveStatus, setSaveStatus] = useState<CustomerNotesSaveStatus>("idle");
  const isDirty = draftNotes !== savedNotes;
  const hasSavedNote = Boolean(savedAt || savedNotes);

  const persistNotes = useCallback(async () => {
    if (!isDirty || saveStatus === "saving") return;

    setSaveStatus("saving");
    onError("");

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draftNotes }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "상담 메모를 저장하지 못했습니다.");
      }

      if (!result.conversation.customer) {
        throw new Error("연결된 고객 정보를 찾을 수 없습니다.");
      }
      const persistedNotes = result.conversation.customer.notes ?? "";
      const persistedAt = result.conversation.customer.notesUpdatedAt;
      setDraftNotes(persistedNotes);
      setSavedNotes(persistedNotes);
      setSavedAt(persistedAt);
      setSaveStatus("saved");
      onSaved(patientId, result.conversation.customer.notes, persistedAt);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "상담 메모를 저장하지 못했습니다.";

      setSaveStatus("error");
      onError(message);
    }
  }, [
    conversationId,
    draftNotes,
    isDirty,
    onError,
    onSaved,
    patientId,
    saveStatus,
  ]);

  return (
    <>
      <textarea
        aria-label={`${chartNumber} 상담 메모`}
        value={draftNotes}
        maxLength={MAX_PATIENT_NOTES_LENGTH}
        rows={4}
        placeholder="상담 메모를 입력하세요."
        onChange={(event) => {
          setDraftNotes(event.target.value);
          if (saveStatus !== "saving") setSaveStatus("idle");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void persistNotes();
          }
        }}
        className="min-h-24 w-full resize-y rounded-xl border border-[#e1e5ed] bg-white p-3 text-xs leading-[1.65] text-[#62697c] outline-none transition placeholder:text-[#a5aaba] focus:border-[#aebcf5] focus:ring-2 focus:ring-[#3157f6]/10"
      />
      <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-xs text-[#9298aa]">
        <span className="flex items-center gap-1">
          {saveStatus === "saving" ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              저장 중
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check className="size-3.5 text-[#15945d]" />
              마지막 저장 {formatSavedAt(savedAt)}
            </>
          ) : saveStatus === "error" ? (
            <>
              <CircleAlert className="size-3.5 text-[#d8465b]" />
              저장 실패
            </>
          ) : (
            <>
              <Clock3 className="size-3.5" />
              {savedAt
                ? `마지막 저장 ${formatSavedAt(savedAt)}`
                : "아직 저장하지 않음"}
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => void persistNotes()}
          disabled={!isDirty || saveStatus === "saving"}
          className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#3157f6] px-3 font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#d9dde6]"
        >
          {saveStatus === "saving" ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {hasSavedNote ? "수정" : "저장"}
        </button>
      </div>
      <p className="mt-1 text-right text-[10px] text-[#a0a6b4]">
        {draftNotes.length.toLocaleString("ko-KR")} /{" "}
        {MAX_PATIENT_NOTES_LENGTH.toLocaleString("ko-KR")}
      </p>
    </>
  );
}

function CustomerLinkModal({
  conversation,
  onClose,
  onLinked,
}: {
  conversation: ConversationItem;
  onClose: () => void;
  onLinked: (conversation: ConversationItem) => void;
}) {
  const [searchField, setSearchField] = useState<CustomerSearchField>("name");
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      async function searchPatients() {
        setIsSearching(true);
        setError("");

        try {
          const searchParams = new URLSearchParams({
            field: searchField,
            query: query.trim(),
          });
          const response = await fetch(`/api/patients?${searchParams}`, {
            cache: "no-store",
            signal: abortController.signal,
          });
          const result = (await response.json()) as {
            patients?: PatientSearchResult[];
            error?: string;
          };

          if (!response.ok || !result.patients) {
            throw new Error(result.error ?? "고객을 검색하지 못했습니다.");
          }

          setPatients(result.patients);
        } catch (searchError) {
          if (abortController.signal.aborted) return;
          setError(
            searchError instanceof Error
              ? searchError.message
              : "고객을 검색하지 못했습니다.",
          );
        } finally {
          if (!abortController.signal.aborted) setIsSearching(false);
        }
      }

      void searchPatients();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [query, searchField]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLinking) onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isLinking, onClose]);

  const selectedPatient = patients.find(
    (patient) => patient.id === selectedPatientId,
  );

  async function updatePatientLink(patientId: string | null) {
    if ((patientId && !selectedPatient) || isLinking) return;

    setIsLinking(true);
    setError("");

    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "고객 연동을 변경하지 못했습니다.");
      }

      onLinked(result.conversation);
    } catch (linkError) {
      setError(
        linkError instanceof Error
          ? linkError.message
          : "고객 연동을 변경하지 못했습니다.",
      );
    } finally {
      setIsLinking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2433]/45 p-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLinking) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-link-title"
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_rgba(28,35,60,0.22)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#e7eaf1] px-7 py-5">
          <div>
            <h2
              id="customer-link-title"
              className="text-xl font-bold tracking-[-0.04em] text-[#30364b]"
            >
              고객 정보 연결
            </h2>
            <p className="mt-1 text-xs text-[#9298aa]">
              고객 입력에서 등록한 고객을 현재 채팅과 연결합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLinking}
            aria-label="고객 정보 연결 닫기"
            className="flex size-9 items-center justify-center rounded-xl border border-[#e1e5ed] text-[#7d8497] hover:bg-[#f7f8fb] disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-7 md:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-0 rounded-2xl bg-[#f7f8fb] p-5">
            <h3 className="text-sm font-bold text-[#555d72]">
              연결할 고객 선택
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-1.5 shadow-sm">
              {(
                [
                  ["name", "고객명으로 검색"],
                  ["phone", "전화번호로 검색"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSearchField(value);
                    setSelectedPatientId("");
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    searchField === value
                      ? "bg-[#3157f6] text-white"
                      : "text-[#7b8295] hover:bg-[#f1f3f8]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-[#dfe3ec] bg-white px-3 text-[#949bad] focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
              <Search className="size-4" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  searchField === "name" ? "고객명 검색" : "전화번호 검색"
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-[#30364b] outline-none placeholder:text-[#aab0bf]"
              />
              {isSearching ? (
                <LoaderCircle className="size-4 animate-spin text-[#3157f6]" />
              ) : null}
            </label>

            <div className="mt-3 max-h-[350px] space-y-2 overflow-y-auto pr-1">
              {patients.map((patient) => {
                const selected = selectedPatientId === patient.id;
                const current = conversation.customer?.id === patient.id;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    disabled={current}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-[#3157f6] bg-[#eef2ff]"
                        : current
                          ? "cursor-default border-[#e3e6ed] bg-[#f0f2f6] opacity-65"
                          : "border-[#e1e5ed] bg-white hover:border-[#bfc9f6] hover:bg-[#fbfcff]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-[#3f465a]">
                        {patient.name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#8b92a5]">
                        {current
                          ? "현재 연결"
                          : (patient.chartNumber ?? "차트번호 미등록")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#858c9e]">
                      {patient.phone ?? "전화번호 미등록"}
                    </p>
                  </button>
                );
              })}

              {!isSearching && patients.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center text-[#9aa0af]">
                  <UserRound className="size-7" />
                  <p className="mt-3 text-xs font-semibold">
                    검색 조건에 맞는 고객이 없습니다.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f7f8fb] p-5">
              <h3 className="text-sm font-bold text-[#555d72]">
                현재 채팅 계정
              </h3>
              <div className="mt-4 rounded-xl border border-[#e1e5ed] bg-white p-4">
                <div className="flex items-center gap-3">
                  <ChannelBadge channel={conversation.channel} large />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#3f465a]">
                      {conversation.chatAccount.displayName ??
                        `${channelMeta[conversation.channel].label} 고객`}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#858c9e]">
                      {conversation.chatAccount.externalCustomerId ??
                        "외부 계정 ID 미등록"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#747b8f]">
                  {conversation.chatAccount.phone ?? "전화번호 미등록"}
                </p>
                <p className="mt-2 text-[10px] font-bold text-[#9298aa]">
                  {conversation.customer
                    ? `${conversation.customer.name} 고객과 ${conversation.chatAccount.linkMethod === "AUTO" ? "자동" : "수동"} 연동됨`
                    : "아직 고객 정보와 연동되지 않았습니다."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f8fb] p-5">
              <h3 className="text-sm font-bold text-[#555d72]">
                연결 후 고객 정보
              </h3>
              {selectedPatient ? (
                <div className="mt-4 rounded-xl border border-[#bfc9f6] bg-white p-4 shadow-[0_4px_14px_rgba(49,87,246,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#30364b]">
                        {selectedPatient.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#3157f6]">
                        {selectedPatient.chartNumber ?? "차트번호 미등록"}
                      </p>
                    </div>
                    <Check className="size-5 text-[#3157f6]" />
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-[#747b8f]">
                    <p>{selectedPatient.phone ?? "전화번호 미등록"}</p>
                    <p>{formatCompactBirthDate(selectedPatient.birthDate)}</p>
                    <p>{selectedPatient.email ?? "이메일 미등록"}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#d9dde6] bg-white text-center text-[#9aa0af]">
                  <Link2 className="size-7" />
                  <p className="mt-3 text-xs font-semibold">
                    연결할 고객을 선택해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="px-7 pb-3 text-xs font-semibold text-[#d8465b]"
          >
            {error}
          </p>
        ) : null}

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[#e7eaf1] px-7 py-4">
          {conversation.customer ? (
            <button
              type="button"
              onClick={() => void updatePatientLink(null)}
              disabled={isLinking}
              className="mr-auto h-10 rounded-xl border border-[#f0cbd1] px-4 text-sm font-bold text-[#d8465b] hover:bg-[#fff5f6] disabled:opacity-50"
            >
              연동 해제
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={isLinking}
            className="h-10 rounded-xl border border-[#dfe3ec] px-5 text-sm font-bold text-[#747b8f] hover:bg-[#f7f8fb] disabled:opacity-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void updatePatientLink(selectedPatient?.id ?? null)}
            disabled={!selectedPatient || isLinking}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d9dde6]"
          >
            {isLinking ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Link2 className="size-4" />
            )}
            고객 연결
          </button>
        </footer>
      </section>
    </div>
  );
}

export function ChattingClient({
  conversations,
  manualFolders,
  staffMembers,
  contentEvents,
}: {
  conversations: ConversationItem[];
  manualFolders: ManualFolderItem[];
  staffMembers: StaffMember[];
  contentEvents: ContentEventRecord[];
}) {
  const [statusFilter, setStatusFilter] = useState<ChatStatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<ChatSortOrder>("LATEST");
  const [selectedRoomId, setSelectedRoomId] = useState(
    conversations[0]?.id ?? "",
  );
  const [searchField, setSearchField] =
    useState<ChatSearchField>("CUSTOMER_NAME");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChatChannel | "ALL">(
    "ALL",
  );
  const [draft, setDraft] = useState("");
  const [rightPanelTab, setRightPanelTab] =
    useState<RightPanelTab>("AUTOMATION");
  const [knowledgeTab, setKnowledgeTab] = useState<"원내매뉴얼" | "콘텐츠">(
    "원내매뉴얼",
  );
  const [manualQuery, setManualQuery] = useState("");
  const [bookmarkedManualIds, setBookmarkedManualIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openManualFolderIds, setOpenManualFolderIds] = useState<Set<string>>(
    () => new Set(collectManualFolderIds(manualFolders)),
  );
  const [selectedManualId, setSelectedManualId] = useState(
    () => flattenManualDocuments(manualFolders)[0]?.id ?? "",
  );
  const [selectedContentId, setSelectedContentId] = useState(
    contentEvents[0]?.id ?? "",
  );
  const [rooms, setRooms] = useState(conversations);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [contextMenu, setContextMenu] =
    useState<ConversationContextMenu | null>(null);
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [pendingAssigneeKey, setPendingAssigneeKey] = useState<string | null>(
    null,
  );
  const [pendingStatusRoomId, setPendingStatusRoomId] = useState<string | null>(
    null,
  );
  const [coachSuggestions, setCoachSuggestions] = useState<
    Record<string, ChatCoachSuggestion>
  >({});
  const [coachFailure, setCoachFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [coachRetryToken, setCoachRetryToken] = useState(0);
  const [copiedChartNumber, setCopiedChartNumber] = useState<string | null>(
    null,
  );
  const detailRequestId = useRef(0);
  const coachRequestId = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const chartNumberCopyTimeoutRef = useRef<number | null>(null);
  const importantRequestIds = useRef(new Set<string>());
  const conversationSettingRequestIds = useRef(new Map<string, number>());
  const messageBookmarkRequestIds = useRef(new Map<string, number>());

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = "auto";
    const maxHeight = 160;
    composer.style.height = `${Math.min(composer.scrollHeight, maxHeight)}px`;
    composer.style.overflowY =
      composer.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  useEffect(
    () => () => {
      if (chartNumberCopyTimeoutRef.current) {
        window.clearTimeout(chartNumberCopyTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!contextMenu) return;

    function closeContextMenu(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
        setIsAssigneeMenuOpen(false);
      }
    }

    function closeContextMenuOnScroll() {
      setContextMenu(null);
      setIsAssigneeMenuOpen(false);
    }

    window.addEventListener("keydown", closeContextMenu);
    window.addEventListener("scroll", closeContextMenuOnScroll, true);

    return () => {
      window.removeEventListener("keydown", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenuOnScroll, true);
    };
  }, [contextMenu]);

  const chatStatusTabs = useMemo(() => {
    let openCount = 0;
    let importantCount = 0;

    for (const room of rooms) {
      if (room.status === "OPEN") openCount += 1;
      if (room.important) importantCount += 1;
    }

    return [
      { value: "ALL", label: "전체", count: rooms.length },
      { value: "IMPORTANT", label: "중요", count: importantCount },
      { value: "OPEN", label: "진행 중", count: openCount },
    ] as const;
  }, [rooms]);

  const visibleRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedPhoneQuery = query.replace(/\D/g, "");

    const filteredRooms = rooms.filter((conversation) => {
      const matchesTab =
        statusFilter === "ALL"
          ? true
          : statusFilter === "IMPORTANT"
            ? conversation.important
            : conversation.status === statusFilter;
      const matchesChannel =
        channelFilter === "ALL" || conversation.channel === channelFilter;
      let matchesQuery = !normalizedQuery;

      if (normalizedQuery) {
        if (searchField === "CUSTOMER_NAME") {
          matchesQuery = getConversationDisplayName(conversation)
            .toLowerCase()
            .includes(normalizedQuery);
        } else if (searchField === "PHONE") {
          const phoneValues = [
            conversation.customer?.phone,
            conversation.chatAccount.phone,
            ...(conversation.customer?.channels.map(
              (channel) => channel.phone,
            ) ?? []),
          ];
          matchesQuery = phoneValues.some((phone) => {
            if (!phone) return false;
            return normalizedPhoneQuery
              ? phone.replace(/\D/g, "").includes(normalizedPhoneQuery)
              : phone.toLowerCase().includes(normalizedQuery);
          });
        } else if (searchField === "CHART_NUMBER") {
          matchesQuery = Boolean(
            conversation.customer?.chartNumber
              ?.toLowerCase()
              .includes(normalizedQuery),
          );
        } else if (searchField === "ASSIGNEE") {
          matchesQuery = conversation.assignees.some((assignee) =>
            assignee.name.toLowerCase().includes(normalizedQuery),
          );
        } else {
          matchesQuery = conversation.messages.some((message) =>
            `${message.content} ${message.translatedContent}`
              .toLowerCase()
              .includes(normalizedQuery),
          );
        }
      }

      return matchesTab && matchesChannel && matchesQuery;
    });

    return filteredRooms.sort((left, right) => {
      const difference =
        new Date(right.lastMessageAt).getTime() -
        new Date(left.lastMessageAt).getTime();
      return sortOrder === "LATEST" ? difference : -difference;
    });
  }, [channelFilter, query, rooms, searchField, sortOrder, statusFilter]);

  const activeSearchOption =
    chatSearchOptions.find((option) => option.value === searchField) ??
    chatSearchOptions[0];

  const currentRoom =
    rooms.find((conversation) => conversation.id === selectedRoomId) ??
    rooms[0];
  const contextRoom = contextMenu
    ? rooms.find((conversation) => conversation.id === contextMenu.roomId)
    : undefined;
  const autoRespond = currentRoom?.autoRespondEnabled ?? false;

  const handleCustomerNotesSaved = useCallback(
    (
      patientId: string,
      notes: string | null,
      notesUpdatedAt: string | null,
    ) => {
      setRooms((current) =>
        current.map((room) =>
          room.customer?.id === patientId
            ? {
                ...room,
                customer: {
                  ...room.customer!,
                  notes,
                  notesUpdatedAt,
                },
              }
            : room,
        ),
      );
    },
    [],
  );
  const autoTranslate = currentRoom?.autoTranslateEnabled ?? true;
  const translationTargetLanguage = currentRoom
    ? (currentRoom.translationTargetLanguage ??
      inferConversationTargetLanguage(
        currentRoom.messages,
        currentRoom.customer?.language,
      ))
    : "ko";
  const bookmarkedMessages = useMemo(
    () =>
      (currentRoom?.messages ?? [])
        .filter(
          (message) =>
            message.direction === "INBOUND" && Boolean(message.bookmarkedAt),
        )
        .slice()
        .sort(
          (left, right) =>
            new Date(right.bookmarkedAt ?? right.sentAt).getTime() -
            new Date(left.bookmarkedAt ?? left.sentAt).getTime(),
        ),
    [currentRoom],
  );
  const rightPanelTabs = useMemo(
    () =>
      [
        { value: "AUTOMATION", label: "자동화 내역" },
        {
          value: "BOOKMARKS",
          label: "채팅북마크",
          count: bookmarkedMessages.length,
        },
      ] as const,
    [bookmarkedMessages.length],
  );
  const normalizedManualQuery = manualQuery.trim().toLowerCase();
  const filteredManualFolders = useMemo(
    () => filterManualFolderTree(manualFolders, normalizedManualQuery),
    [manualFolders, normalizedManualQuery],
  );
  const filteredContentEvents = useMemo(() => {
    if (!normalizedManualQuery) return contentEvents;
    return contentEvents.filter((event) =>
      `${event.title} ${event.summary} ${event.detailText}`
        .toLowerCase()
        .includes(normalizedManualQuery),
    );
  }, [contentEvents, normalizedManualQuery]);
  const manualDocuments = useMemo(
    () => flattenManualDocuments(manualFolders),
    [manualFolders],
  );
  const selectedManual =
    manualDocuments.find((document) => document.id === selectedManualId) ??
    null;
  const latestCustomerMessage = currentRoom
    ? currentRoom.messages
        .slice()
        .reverse()
        .find((message) => message.sender === "CUSTOMER")
    : undefined;
  const coachSuggestionKey =
    currentRoom && latestCustomerMessage
      ? `${currentRoom.id}:${latestCustomerMessage.id}`
      : "";
  const persistedCoachSuggestion =
    latestCustomerMessage && currentRoom
      ? currentRoom.coachSuggestions.find(
          (suggestion) =>
            suggestion.generatedForMessageId === latestCustomerMessage.id,
        )
      : undefined;
  const currentCoachSuggestion = coachSuggestionKey
    ? (coachSuggestions[coachSuggestionKey] ?? persistedCoachSuggestion)
    : undefined;
  const coachStatus =
    !autoRespond || !coachSuggestionKey
      ? "idle"
      : currentCoachSuggestion
        ? "ready"
        : coachFailure?.key === coachSuggestionKey
          ? "error"
          : "loading";
  const coachError =
    coachFailure?.key === coachSuggestionKey ? coachFailure.message : "";
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

  function toggleManualBookmark(id: string) {
    setBookmarkedManualIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function toggleConversationImportant(id: string) {
    if (importantRequestIds.current.has(id)) return;

    const room = rooms.find((conversation) => conversation.id === id);
    if (!room) return;

    const previousImportant = room.important;
    const nextImportant = !previousImportant;
    importantRequestIds.current.add(id);
    setDetailError("");
    setRooms((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, important: nextImportant }
          : conversation,
      ),
    );

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ important: nextImportant }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "중요 표시를 변경하지 못했습니다.");
      }

      setRooms((current) =>
        current.map((conversation) =>
          conversation.id === id ? result.conversation! : conversation,
        ),
      );
    } catch (error) {
      setRooms((current) =>
        current.map((conversation) =>
          conversation.id === id && conversation.important === nextImportant
            ? { ...conversation, important: previousImportant }
            : conversation,
        ),
      );
      setDetailError(
        error instanceof Error
          ? error.message
          : "중요 표시를 변경하지 못했습니다.",
      );
    } finally {
      importantRequestIds.current.delete(id);
    }
  }

  function openConversationContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    roomId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 208;
    const menuHeight = 144;
    setContextMenu({
      roomId,
      x: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      y: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
    setIsAssigneeMenuOpen(false);
  }

  function closeConversationContextMenu() {
    setContextMenu(null);
    setIsAssigneeMenuOpen(false);
  }

  function openCustomerInformation(roomId: string) {
    setSelectedRoomId(roomId);
    setIsCustomerModalOpen(true);
    closeConversationContextMenu();
  }

  async function toggleConversationAssignee(
    roomId: string,
    staffMember: StaffMember,
  ) {
    const room = rooms.find((conversation) => conversation.id === roomId);
    if (!room) return;

    const wasAssigned = room.assignees.some(
      (assignee) => assignee.id === staffMember.id,
    );
    const nextAssignees = wasAssigned
      ? room.assignees.filter((assignee) => assignee.id !== staffMember.id)
      : [...room.assignees, staffMember];
    const requestKey = `${roomId}:${staffMember.id}`;

    setPendingAssigneeKey(requestKey);
    setDetailError("");
    setRooms((current) =>
      current.map((conversation) =>
        conversation.id === roomId
          ? { ...conversation, assignees: nextAssignees }
          : conversation,
      ),
    );

    try {
      const response = await fetch(`/api/conversations/${roomId}/assignees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffMember.id,
          assigned: !wasAssigned,
        }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        assignees?: StaffMember[];
        error?: string;
      };

      if (!response.ok || !result.assignees) {
        throw new Error(result.error ?? "담당자를 변경하지 못했습니다.");
      }

      setRooms((current) =>
        current.map((conversation) =>
          conversation.id === roomId
            ? { ...conversation, assignees: result.assignees! }
            : conversation,
        ),
      );
    } catch (error) {
      setRooms((current) =>
        current.map((conversation) =>
          conversation.id === roomId
            ? { ...conversation, assignees: room.assignees }
            : conversation,
        ),
      );
      setDetailError(
        error instanceof Error
          ? error.message
          : "담당자를 변경하지 못했습니다.",
      );
    } finally {
      setPendingAssigneeKey((current) =>
        current === requestKey ? null : current,
      );
    }
  }

  async function toggleConversationStatus(roomId: string) {
    const room = rooms.find((conversation) => conversation.id === roomId);
    if (!room || pendingStatusRoomId === roomId) return;

    const nextStatus = room.status === "OPEN" ? "CLOSED" : "OPEN";
    setPendingStatusRoomId(roomId);
    setDetailError("");

    try {
      const response = await fetch(`/api/conversations/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(
          result.error ??
            (nextStatus === "CLOSED"
              ? "상담을 완료하지 못했습니다."
              : "상담을 다시 열지 못했습니다."),
        );
      }

      setRooms((current) =>
        current.map((conversation) =>
          conversation.id === roomId ? result.conversation! : conversation,
        ),
      );

      if (
        selectedRoomId === roomId &&
        statusFilter !== "ALL" &&
        statusFilter !== "IMPORTANT"
      ) {
        const nextRoom = rooms.find(
          (conversation) =>
            conversation.id !== roomId && conversation.status === room.status,
        );

        if (nextRoom) {
          void selectConversation(nextRoom.id);
        } else {
          setStatusFilter("ALL");
        }
      }

      closeConversationContextMenu();
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "상담 상태를 변경하지 못했습니다.",
      );
    } finally {
      setPendingStatusRoomId((current) =>
        current === roomId ? null : current,
      );
    }
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

  useEffect(() => {
    if (!autoRespond || !coachSuggestionKey || currentCoachSuggestion) return;

    const abortController = new AbortController();
    const requestId = ++coachRequestId.current;

    async function generateCoachSuggestion() {
      try {
        const response = await fetch(
          `/api/conversations/${selectedRoomId}/coach`,
          {
            method: "POST",
            cache: "no-store",
            signal: abortController.signal,
          },
        );
        const result = (await response.json()) as ChatCoachSuggestion & {
          error?: string;
        };

        if (
          !response.ok ||
          !result.generatedForMessageId ||
          !result.responseGuide ||
          !result.answerExample
        ) {
          throw new Error(
            result.error ?? "AI 응대 가이드를 생성하지 못했습니다.",
          );
        }

        if (requestId !== coachRequestId.current) return;

        setCoachSuggestions((current) => ({
          ...current,
          [`${selectedRoomId}:${result.generatedForMessageId}`]: result,
        }));
        setRooms((current) =>
          current.map((room) =>
            room.id === selectedRoomId
              ? {
                  ...room,
                  coachSuggestions: [
                    result,
                    ...room.coachSuggestions.filter(
                      (suggestion) =>
                        suggestion.generatedForMessageId !==
                        result.generatedForMessageId,
                    ),
                  ],
                }
              : room,
          ),
        );
        setCoachFailure(null);
      } catch (error) {
        if (abortController.signal.aborted) return;
        if (requestId !== coachRequestId.current) return;

        setCoachFailure({
          key: coachSuggestionKey,
          message:
            error instanceof Error
              ? error.message
              : "AI 응대 가이드를 생성하지 못했습니다.",
        });
      }
    }

    void generateCoachSuggestion();

    return () => abortController.abort();
  }, [
    autoRespond,
    coachRetryToken,
    coachSuggestionKey,
    currentCoachSuggestion,
    selectedRoomId,
  ]);

  useEffect(() => {
    let fetching = false;
    const abortController = new AbortController();

    async function refreshChats() {
      if (fetching || document.visibilityState === "hidden") return;
      fetching = true;

      try {
        const [listResponse, detailResponse] = await Promise.all([
          fetch("/api/conversations", {
            cache: "no-store",
            signal: abortController.signal,
          }),
          selectedRoomId
            ? fetch(`/api/conversations/${selectedRoomId}`, {
                cache: "no-store",
                signal: abortController.signal,
              })
            : Promise.resolve(null),
        ]);
        const listResult = (await listResponse.json()) as {
          conversations?: ConversationItem[];
        };
        let refreshedConversation: ConversationItem | undefined;

        if (detailResponse?.ok) {
          const detailResult = (await detailResponse.json()) as {
            conversation?: ConversationItem;
          };
          refreshedConversation = detailResult.conversation;

          if (refreshedConversation?.unreadCount) {
            const readResponse = await fetch(
              `/api/conversations/${selectedRoomId}`,
              {
                method: "PATCH",
                cache: "no-store",
                signal: abortController.signal,
              },
            );

            if (readResponse.ok) {
              const readResult = (await readResponse.json()) as {
                conversation?: ConversationItem;
              };
              refreshedConversation =
                readResult.conversation ?? refreshedConversation;
            }
          }
        }

        if (listResponse.ok && listResult.conversations) {
          if (!selectedRoomId && listResult.conversations[0]) {
            setSelectedRoomId(listResult.conversations[0].id);
          }

          setRooms((current) => {
            const currentById = new Map(
              current.map((room) => [room.id, room] as const),
            );

            return listResult.conversations!.map((room) => {
              if (room.id === selectedRoomId && refreshedConversation) {
                return refreshedConversation;
              }

              const previousRoom = currentById.get(room.id);
              const latestMessage = room.messages.at(-1);

              if (!previousRoom || !latestMessage) return room;

              const existingMessageIndex = previousRoom.messages.findIndex(
                (message) => message.id === latestMessage.id,
              );
              const messages =
                existingMessageIndex >= 0
                  ? previousRoom.messages.map((message, index) =>
                      index === existingMessageIndex ? latestMessage : message,
                    )
                  : [...previousRoom.messages, latestMessage];

              return {
                ...room,
                messages,
                coachSuggestions: previousRoom.coachSuggestions,
              };
            });
          });
        } else if (refreshedConversation) {
          setRooms((current) =>
            current.map((room) =>
              room.id === selectedRoomId ? refreshedConversation : room,
            ),
          );
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("채팅 폴링 중 문제가 발생했습니다.", error);
      } finally {
        fetching = false;
      }
    }

    void refreshChats();

    const intervalId = window.setInterval(
      () => void refreshChats(),
      CHAT_POLL_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      abortController.abort();
    };
  }, [selectedRoomId]);

  function applyCoachAnswer() {
    if (!currentCoachSuggestion) return;

    setDraft(currentCoachSuggestion.answerExample);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function updateConversationSetting(
    setting: "autoRespondEnabled" | "autoTranslateEnabled",
    enabled: boolean,
  ) {
    if (!currentRoom) return;

    const conversationId = currentRoom.id;
    const requestKey = `${conversationId}:${setting}`;
    const requestId =
      (conversationSettingRequestIds.current.get(requestKey) ?? 0) + 1;
    conversationSettingRequestIds.current.set(requestKey, requestId);
    setDetailError("");
    setRooms((current) =>
      current.map((room) =>
        room.id === conversationId ? { ...room, [setting]: enabled } : room,
      ),
    );

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [setting]: enabled }),
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };

      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "채팅 설정을 저장하지 못했습니다.");
      }

      if (conversationSettingRequestIds.current.get(requestKey) !== requestId) {
        return;
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId ? result.conversation! : room,
        ),
      );
    } catch (error) {
      if (conversationSettingRequestIds.current.get(requestKey) !== requestId) {
        return;
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId ? { ...room, [setting]: !enabled } : room,
        ),
      );
      setDetailError(
        error instanceof Error
          ? error.message
          : "채팅 설정을 저장하지 못했습니다.",
      );
    }
  }

  async function updateTranslationTargetLanguage(
    language: TranslationTargetLanguage,
  ) {
    if (!currentRoom) return;

    const conversationId = currentRoom.id;
    const previousLanguage = currentRoom.translationTargetLanguage;
    setDetailError("");
    setRooms((current) =>
      current.map((room) =>
        room.id === conversationId
          ? { ...room, translationTargetLanguage: language }
          : room,
      ),
    );

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translationTargetLanguage: language }),
      });
      const result = (await response.json()) as {
        conversation?: ConversationItem;
        error?: string;
      };
      if (!response.ok || !result.conversation) {
        throw new Error(result.error ?? "번역 언어를 저장하지 못했습니다.");
      }
      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId ? result.conversation! : room,
        ),
      );
    } catch (error) {
      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId
            ? { ...room, translationTargetLanguage: previousLanguage }
            : room,
        ),
      );
      setDetailError(
        error instanceof Error
          ? error.message
          : "번역 언어를 저장하지 못했습니다.",
      );
    }
  }

  async function toggleMessageBookmark(messageId: string) {
    if (!currentRoom) return;

    const conversationId = currentRoom.id;
    const message = currentRoom.messages.find((item) => item.id === messageId);
    if (!message || message.direction !== "INBOUND") return;

    const wasBookmarked = Boolean(message.bookmarkedAt);
    const nextBookmarked = !wasBookmarked;
    const optimisticBookmarkedAt = nextBookmarked
      ? new Date().toISOString()
      : null;
    const requestId =
      (messageBookmarkRequestIds.current.get(messageId) ?? 0) + 1;
    messageBookmarkRequestIds.current.set(messageId, requestId);
    setDetailError("");
    setRooms((current) =>
      current.map((room) =>
        room.id === conversationId
          ? {
              ...room,
              messages: room.messages.map((item) =>
                item.id === messageId
                  ? { ...item, bookmarkedAt: optimisticBookmarkedAt }
                  : item,
              ),
            }
          : room,
      ),
    );

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/${messageId}/bookmark`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookmarked: nextBookmarked }),
          cache: "no-store",
        },
      );
      const result = (await response.json()) as {
        message?: { id: string; bookmarkedAt: string | null };
        error?: string;
      };

      if (!response.ok || !result.message) {
        throw new Error(result.error ?? "채팅 북마크를 변경하지 못했습니다.");
      }

      if (messageBookmarkRequestIds.current.get(messageId) !== requestId) {
        return;
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId
            ? {
                ...room,
                messages: room.messages.map((item) =>
                  item.id === messageId
                    ? { ...item, bookmarkedAt: result.message!.bookmarkedAt }
                    : item,
                ),
              }
            : room,
        ),
      );
    } catch (error) {
      if (messageBookmarkRequestIds.current.get(messageId) !== requestId) {
        return;
      }

      setRooms((current) =>
        current.map((room) =>
          room.id === conversationId
            ? {
                ...room,
                messages: room.messages.map((item) =>
                  item.id === messageId
                    ? { ...item, bookmarkedAt: message.bookmarkedAt }
                    : item,
                ),
              }
            : room,
        ),
      );
      setDetailError(
        error instanceof Error
          ? error.message
          : "채팅 북마크를 변경하지 못했습니다.",
      );
    }
  }

  function scrollToMessage(messageId: string) {
    document
      .getElementById(`chat-message-${messageId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function copyChartNumber() {
    const chartNumber = currentRoom?.customer?.chartNumber;
    if (!chartNumber) return;

    try {
      await navigator.clipboard.writeText(chartNumber);
      setCopiedChartNumber(chartNumber);

      if (chartNumberCopyTimeoutRef.current) {
        window.clearTimeout(chartNumberCopyTimeoutRef.current);
      }

      chartNumberCopyTimeoutRef.current = window.setTimeout(() => {
        setCopiedChartNumber(null);
        chartNumberCopyTimeoutRef.current = null;
      }, 1_500);
    } catch {
      setDetailError("차트번호를 복사하지 못했습니다.");
    }
  }

  async function sendMessage() {
    const message = draft.trim();
    if (!message || !currentRoom || isSending) return;

    setIsSending(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/conversations/${currentRoom.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          autoTranslate,
          targetLanguage: translationTargetLanguage,
        }),
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
    <div className="grid h-full max-h-full min-h-0 min-w-[1500px] grid-cols-[360px_360px_minmax(420px,1fr)_360px] overflow-x-auto overflow-y-hidden bg-white">
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#e7eaf1] bg-white">
        <header className="flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-[#e8eaf1] px-4">
          <div className="flex shrink-0 items-center gap-1">
            <h1 className="text-base font-bold tracking-[-0.03em]">고객채팅</h1>
            <button
              type="button"
              aria-label="채팅 설정"
              className="flex size-8 items-center justify-center rounded-lg text-[#848b9e] hover:bg-[#f7f8fb] hover:text-[#596176]"
            >
              <Settings className="size-[18px]" />
            </button>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-0.5">
            <ChatListSelect
              value={sortOrder}
              options={chatSortOptions}
              ariaLabel="채팅 정렬"
              onValueChange={setSortOrder}
            />
            <ChatListSelect
              value={channelFilter}
              options={chatChannelOptions}
              ariaLabel="채널 필터"
              onValueChange={setChannelFilter}
            />
          </div>
        </header>

        <SectionTabs
          ariaLabel="채팅 상태"
          options={chatStatusTabs}
          value={statusFilter}
          onValueChange={setStatusFilter}
        />

        <div className="border-b border-[#eceef4] px-3 py-2.5">
          <div className="flex h-9 items-center overflow-hidden rounded-xl border border-[#e1e5ed] bg-[#f9fafc] focus-within:border-[#7187f6] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#3157f6]/10">
            <label className="relative flex h-full w-[108px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-[#e1e5ed] px-2.5 text-[10px] font-bold text-[#646b7f]">
              <span className="min-w-0 flex-1 truncate">
                {activeSearchOption.label}
              </span>
              <ChevronDown className="size-3 shrink-0 text-[#949bad]" />
              <select
                value={searchField}
                onChange={(event) => {
                  setSearchField(event.target.value as ChatSearchField);
                  setQuery("");
                }}
                aria-label="채팅 검색 기준"
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
              >
                {chatSearchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 items-center gap-2 px-2.5 text-[#949bad]">
              <Search className="size-3.5 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeSearchOption.placeholder}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-[#30364b] outline-none placeholder:text-[#aab0bf]"
              />
            </label>
          </div>
        </div>

        <div
          data-testid="conversation-list"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {visibleRooms.map((room) => {
            const latestMessage = room.messages.at(-1);
            const latestMessageContent = latestMessage
              ? getPrimaryMessageContent(latestMessage)
              : "새로운 대화";
            const selected = currentRoom.id === room.id;

            return (
              <div
                key={room.id}
                onContextMenu={(event) =>
                  openConversationContextMenu(event, room.id)
                }
                className={`relative w-full border-b border-[#f0f1f5] transition-colors ${
                  selected ? "bg-[#edf3ff]" : "hover:bg-[#f8f9fc]"
                }`}
              >
                {selected ? (
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-[#3157f6]" />
                ) : null}
                <button
                  type="button"
                  onClick={() => void selectConversation(room.id)}
                  className="w-full px-4 py-3.5 pr-12 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ChannelBadge channel={room.channel} />
                    <span className="truncate text-base font-bold text-[#2f3449]">
                      {getConversationDisplayName(room)}
                    </span>
                    {room.unreadCount > 0 ? (
                      <span className="flex min-w-4 items-center justify-center rounded-full bg-[#f04f68] px-1 text-[9px] font-bold text-white">
                        {room.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex h-10 items-end justify-between gap-3 pl-[30px]">
                    <div className="flex h-full min-w-0 flex-1 items-center">
                      <p className="line-clamp-2 text-sm leading-relaxed text-[#767d91]">
                        {latestMessageContent}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#a8adba]">
                      {formatListTime(room.lastMessageAt)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleConversationImportant(room.id)}
                  aria-pressed={room.important}
                  aria-label={`${getConversationDisplayName(room)} 중요 표시 ${room.important ? "해제" : "추가"}`}
                  className="absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-lg hover:bg-white/70"
                >
                  <Star
                    className={`size-4 shrink-0 transition-colors ${
                      room.important
                        ? "fill-[#ffcf34] text-[#ffbe19]"
                        : "text-[#d2d5de] hover:text-[#ffbe19]"
                    }`}
                  />
                </button>
              </div>
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
              {(Object.keys(channelMeta) as ChatChannel[]).map((channel) =>
                channel === "KAKAO" ? (
                  <KakaoChannelIcon key={channel} size={20} />
                ) : channel === "LINE" ? (
                  <LineChannelIcon key={channel} size={20} />
                ) : channel === "NAVER_TALK" ? (
                  <NaverTalkChannelIcon key={channel} size={20} />
                ) : channel === "WECHAT" ? (
                  <WeChatChannelIcon key={channel} size={20} />
                ) : channel === "WHATSAPP" ? (
                  <WhatsAppChannelIcon key={channel} size={20} />
                ) : (
                  <InstagramChannelIcon key={channel} size={20} />
                ),
              )}
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
              placeholder={
                knowledgeTab === "원내매뉴얼"
                  ? "폴더, 문서, 태그 검색"
                  : "콘텐츠 제목, 소개 검색"
              }
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
                    bookmarkedManualIds={bookmarkedManualIds}
                    onToggleFolder={toggleManualFolder}
                    onSelectManual={(id) =>
                      setSelectedManualId((current) =>
                        current === id ? "" : id,
                      )
                    }
                    onToggleBookmark={toggleManualBookmark}
                  />
                ))}
                {filteredManualFolders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[10px] text-[#989eae]">
                    검색 조건에 맞는 치료태그 매뉴얼이 없습니다.
                  </div>
                ) : null}
              </div>
            </>
          ) : filteredContentEvents.length > 0 ? (
            filteredContentEvents.map((event) => (
              <ContentEventCard
                key={event.id}
                event={event}
                selected={selectedContentId === event.id}
                onToggle={() =>
                  setSelectedContentId((current) =>
                    current === event.id ? "" : event.id,
                  )
                }
              />
            ))
          ) : (
            <div className="flex h-48 flex-col items-center justify-center px-6 text-center text-[#9aa0b0]">
              <BookOpenText className="mb-2 size-6" />
              <p className="text-xs font-bold">
                {normalizedManualQuery
                  ? "검색 조건에 맞는 콘텐츠가 없습니다."
                  : "등록된 활성 콘텐츠가 없습니다."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#f2f5fb]">
        <header className="flex min-h-[92px] shrink-0 flex-col gap-2 border-b border-[#e5e8f0] bg-white px-5 py-3">
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void toggleConversationImportant(currentRoom.id)}
                aria-pressed={currentRoom.important}
                aria-label={`중요 표시 ${currentRoom.important ? "해제" : "추가"}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-[#f7f8fb]"
              >
                <Star
                  className={`size-5 transition-colors ${
                    currentRoom.important
                      ? "fill-[#ffcf34] text-[#ffbe19]"
                      : "text-[#cdd1db] hover:text-[#ffbe19]"
                  }`}
                />
              </button>
              <h2 className="max-w-32 truncate text-base font-extrabold tracking-[-0.03em] text-[#343a4d]">
                {getConversationDisplayName(currentRoom)}
              </h2>
              {currentRoom.customer?.chartNumber ? (
                <button
                  type="button"
                  onClick={() => void copyChartNumber()}
                  aria-label={`차트번호 ${currentRoom.customer.chartNumber} 복사`}
                  className="shrink-0 font-mono text-xs font-semibold text-[#7d8495] underline decoration-[#c8ccd5] underline-offset-2 hover:text-[#3157f6]"
                >
                  {copiedChartNumber === currentRoom.customer.chartNumber
                    ? "복사됨"
                    : `(${currentRoom.customer.chartNumber})`}
                </button>
              ) : (
                <span className="rounded-md bg-[#fff4df] px-2 py-0.5 text-[10px] font-bold text-[#b7791f]">
                  {currentRoom.customer ? "차트번호 미등록" : "고객 미연동"}
                </span>
              )}
              <span
                className="flex shrink-0 items-center"
                title={currentMeta.label}
                aria-label={`채팅 채널 ${currentMeta.label}`}
              >
                <ChannelBadge channel={currentRoom.channel} />
              </span>
              {currentRoom.customer ? (
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="shrink-0 text-[11px] font-semibold text-[#8a8292] underline decoration-[#bbb3bf] underline-offset-2 hover:text-[#3157f6]"
                >
                  연동 관리
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#cfd5e2] bg-white px-2.5 text-[11px] font-bold text-[#596176] transition hover:border-[#aebcf5] hover:bg-[#f8faff] hover:text-[#3157f6]"
              >
                <UserRound className="size-3.5" />
                고객 정보
              </button>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold text-[#737b8e]">
              <span className="rounded-lg bg-[#f7f8fa] px-2.5 py-1">
                {currentRoom.customer
                  ? `${getGenderLabel(currentRoom.customer.gender)}/${formatHeaderBirthDate(currentRoom.customer.birthDate)}`
                  : "인적정보 미연동"}
              </span>
              <span className="rounded-lg bg-[#f7f8fa] px-2.5 py-1 font-mono">
                {formatPhoneWithCountryCode(
                  getConversationPhone(currentRoom),
                  currentRoom.customer?.phoneCountryCode,
                )}
              </span>
              <span className="rounded-lg bg-[#f7f8fa] px-2.5 py-1">
                {currentRoom.customer?.nationality?.trim() || "-"}
              </span>
            </div>
            <button
              type="button"
              disabled={pendingStatusRoomId === currentRoom.id}
              onClick={() => void toggleConversationStatus(currentRoom.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                currentRoom.status === "OPEN"
                  ? "border-[#c8d4fa] bg-[#f7f9ff] text-[#3157f6] hover:border-[#9baff6] hover:bg-[#eef2ff]"
                  : "border-[#d8dde7] bg-white text-[#687085] hover:border-[#bfc7d6] hover:bg-[#f7f8fb]"
              }`}
            >
              {pendingStatusRoomId === currentRoom.id ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : currentRoom.status === "OPEN" ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              {currentRoom.status === "OPEN" ? "상담 완료" : "상담 다시 열기"}
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-[#e5e8f0] bg-white px-5 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-[#858c9e]">
              치료태그
            </span>
            {(currentRoom.customer?.tags ?? []).map((tag) => (
              <span
                key={tag.name}
                className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {currentRoom.customer && currentRoom.customer.tags.length === 0 ? (
              <span className="text-[11px] text-[#a0a6b4]">-</span>
            ) : null}
          </div>
          <label className="flex items-center gap-1 text-xs text-[#858c9e]">
            <Languages className="size-3.5" />
            <span className="sr-only">번역 대상 언어</span>
            <select
              value={translationTargetLanguage}
              onChange={(event) =>
                void updateTranslationTargetLanguage(
                  event.target.value as TranslationTargetLanguage,
                )
              }
              className="cursor-pointer bg-transparent font-semibold text-[#737b8e] outline-none"
            >
              {translationLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loadingRoomId === currentRoom.id ? (
          <div className="absolute left-1/2 top-[138px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#dce2f4] bg-white px-3 py-2 text-[9px] font-semibold text-[#66708a] shadow-lg">
            <LoaderCircle className="size-3.5 animate-spin text-[#3157f6]" />
            DB에서 최신 채팅을 불러오는 중
          </div>
        ) : null}

        {detailError ? (
          <div
            role="alert"
            className="absolute left-1/2 top-[138px] z-20 -translate-x-1/2 rounded-full bg-[#fff0f2] px-3 py-2 text-[9px] font-semibold text-[#d8465b] shadow-lg"
          >
            {detailError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto mb-6 w-fit rounded-full bg-[#e4e8f1] px-3 py-1 text-xs font-medium text-[#7f8698]">
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
                    <span className="rounded-full bg-[#e7edff] px-3 py-1.5 text-xs font-semibold text-[#4765dc]">
                      {message.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  id={`chat-message-${message.id}`}
                  className={`mb-5 flex ${inbound ? "justify-start" : "justify-end"}`}
                >
                  <div className={`max-w-[72%] ${inbound ? "" : "text-right"}`}>
                    {inbound ? (
                      <p className="mb-1.5 pl-1 text-base font-semibold text-[#596176]">
                        {getConversationDisplayName(currentRoom)}
                      </p>
                    ) : null}
                    {message.sender === "AI" ? (
                      <p className="mb-1 flex items-center justify-end gap-1 text-xs font-semibold text-[#6657e9]">
                        <Sparkles className="size-3.5" /> AI 답변
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
                    <div
                      className={`mt-1 flex items-center gap-1.5 text-xs text-[#a0a6b4] ${inbound ? "justify-start" : "justify-end"}`}
                    >
                      <span>
                        {formatMessageTime(message.sentAt)}
                        {!inbound ? (
                          <Check className="ml-1 inline size-3.5 text-[#3157f6]" />
                        ) : null}
                      </span>
                      {inbound ? (
                        <button
                          type="button"
                          onClick={() => void toggleMessageBookmark(message.id)}
                          aria-pressed={Boolean(message.bookmarkedAt)}
                          aria-label={`메시지 북마크 ${message.bookmarkedAt ? "해제" : "추가"}`}
                          className={`rounded p-1 transition hover:bg-white/80 ${
                            message.bookmarkedAt
                              ? "text-[#6657e9]"
                              : "text-[#a0a6b4] hover:text-[#6657e9]"
                          }`}
                        >
                          <Bookmark
                            className={`size-4 ${message.bookmarkedAt ? "fill-current" : ""}`}
                          />
                        </button>
                      ) : null}
                    </div>
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
                  onClick={() => {
                    if (currentCoachSuggestion) {
                      applyCoachAnswer();
                    } else {
                      void updateConversationSetting(
                        "autoRespondEnabled",
                        true,
                      );
                    }
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-[#eef2ff] px-2 py-1 font-semibold text-[#3157f6]"
                >
                  <WandSparkles className="size-3" /> AI 답변 제안
                </button>
                <span className="truncate">
                  {autoRespond
                    ? coachStatus === "loading"
                      ? "고객의 마지막 응답을 분석하고 있습니다."
                      : "응대 가이드와 답변 예시를 준비합니다."
                    : autoTranslate
                      ? "고객 언어에 맞춰 자동 번역됩니다."
                      : "입력한 원문 그대로 발송됩니다."}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#596176]">
                    자동 응대
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRespond}
                    aria-label="자동 응대"
                    onClick={() =>
                      void updateConversationSetting(
                        "autoRespondEnabled",
                        !autoRespond,
                      )
                    }
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      autoRespond ? "bg-[#3157f6]" : "bg-[#c7ccd8]"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                        autoRespond ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#596176]">
                    자동 번역
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoTranslate}
                    aria-label="자동 번역"
                    onClick={() =>
                      void updateConversationSetting(
                        "autoTranslateEnabled",
                        !autoTranslate,
                      )
                    }
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
            </div>
            <div className="rounded-xl border border-[#dfe3ec] bg-white p-2 focus-within:border-[#7187f6] focus-within:ring-2 focus-within:ring-[#3157f6]/10">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder={`${currentMeta.label}로 메시지를 입력해 주세요.`}
                className="min-h-10 w-full resize-none overflow-y-hidden bg-transparent px-1 text-sm leading-6 text-[#33394e] outline-none placeholder:text-[#adb2bf]"
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
                  className="flex h-7 items-center gap-1 rounded-lg bg-[#3157f6] px-3 text-sm font-bold text-white disabled:bg-[#d9dde6]"
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
        <header className="flex h-[72px] shrink-0 items-center border-b border-[#e8eaf1] bg-white px-4">
          <div>
            <h2 className="text-sm font-bold tracking-[-0.02em]">상담 지원</h2>
            <p className="mt-1 text-xs text-[#8d94a6]">
              메모와 중요한 대화를 한곳에서 관리합니다.
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-[#e5e8ef] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-[#6657e9]" />
                <h3 className="text-xs font-bold">상담 메모</h3>
              </div>
              <span className="text-[10px] text-[#9aa0af]">
                {getConversationDisplayName(currentRoom)}
              </span>
            </div>
            {currentRoom.customer ? (
              <CustomerNotesEditor
                key={`${currentRoom.id}:${currentRoom.customer.notesUpdatedAt ?? "never"}`}
                conversationId={currentRoom.id}
                patientId={currentRoom.customer.id}
                chartNumber={
                  currentRoom.customer.chartNumber ?? "차트번호 미등록"
                }
                initialNotes={currentRoom.customer.notes}
                initialNotesUpdatedAt={currentRoom.customer.notesUpdatedAt}
                onSaved={handleCustomerNotesSaved}
                onError={setDetailError}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9dde6] bg-[#f8f9fb] px-4 py-6 text-center">
                <Link2 className="mx-auto size-5 text-[#a0a6b4]" />
                <p className="mt-2 text-xs font-semibold text-[#858c9e]">
                  고객 정보를 연결하면 상담 메모를 사용할 수 있습니다.
                </p>
              </div>
            )}
          </section>

          <section className="border-b border-[#e5e8ef] bg-white">
            <SectionTabs
              ariaLabel="상담 기록 구분"
              options={rightPanelTabs}
              value={rightPanelTab}
              onValueChange={setRightPanelTab}
            />

            <div className="min-h-52 p-4">
              {rightPanelTab === "AUTOMATION" ? (
                <div className="flex min-h-44 flex-col items-center justify-center text-center text-[#a0a6b4]">
                  <Clock3 className="size-7" />
                  <p className="mt-3 text-xs font-semibold">
                    표시할 자동화 내역이 없습니다.
                  </p>
                </div>
              ) : bookmarkedMessages.length > 0 ? (
                <div className="space-y-2.5">
                  {bookmarkedMessages.map((message) => {
                    const inbound = message.direction === "INBOUND";
                    const senderLabel = inbound
                      ? getConversationDisplayName(currentRoom)
                      : message.sender === "AI"
                        ? "AI"
                        : "직원";

                    return (
                      <div
                        key={message.id}
                        className="rounded-xl border border-[#e0e4ed] bg-white p-3 shadow-[0_3px_12px_rgba(42,54,102,0.04)]"
                      >
                        <button
                          type="button"
                          onClick={() => scrollToMessage(message.id)}
                          className="w-full text-left"
                        >
                          <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-[#555d72]">
                            {getPrimaryMessageContent(message)}
                          </p>
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#9298aa]">
                          <span>
                            {formatMessageTime(message.sentAt)} · {senderLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void toggleMessageBookmark(message.id)
                            }
                            className="rounded-md bg-[#f2f3f7] px-2 py-1 font-semibold text-[#747b8f] hover:bg-[#e8eaf0]"
                          >
                            해제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-44 flex-col items-center justify-center text-center text-[#a0a6b4]">
                  <Bookmark className="size-7" />
                  <p className="mt-3 text-xs font-semibold">
                    북마크한 채팅이 없습니다.
                  </p>
                  <p className="mt-1 text-xs">
                    메시지 아래의 북마크 아이콘을 눌러 추가하세요.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[#3157f6]">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[#edf1ff]">
                <Sparkles className="size-3.5" />
              </span>
              <p className="text-xs font-bold">AI 상담 코치</p>
            </div>
            <div className="rounded-xl border border-[#e0e4ed] bg-white p-3.5 shadow-[0_4px_14px_rgba(42,54,102,0.04)]">
              {!autoRespond ? (
                <div className="py-4 text-center">
                  <Bot className="mx-auto size-6 text-[#a1a8b8]" />
                  <p className="mt-2 text-xs font-semibold text-[#697084]">
                    자동 응대를 켜면 고객의 마지막 응답을 분석합니다.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#959bac]">
                    치료태그와 상담백과사전을 참고해 응대 가이드와 답변 예시를
                    생성합니다.
                  </p>
                </div>
              ) : coachStatus === "loading" ? (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <LoaderCircle className="size-5 animate-spin text-[#3157f6]" />
                  <p className="mt-2 text-xs font-semibold text-[#697084]">
                    응대 가이드를 생성하고 있습니다.
                  </p>
                </div>
              ) : coachStatus === "error" ? (
                <div className="py-3 text-center">
                  <CircleAlert className="mx-auto size-5 text-[#d8465b]" />
                  <p className="mt-2 text-xs leading-5 text-[#8a5260]">
                    {coachError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!coachSuggestionKey) return;
                      setCoachFailure(null);
                      setCoachRetryToken((current) => current + 1);
                    }}
                    className="mt-3 rounded-lg bg-[#fff0f2] px-3 py-2 text-xs font-bold text-[#d8465b]"
                  >
                    다시 생성
                  </button>
                </div>
              ) : currentCoachSuggestion ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#747b8f]">
                      <Bot className="size-3.5 text-[#6657e9]" /> 응대 가이드
                    </span>
                    <span className="rounded-full bg-[#eef8f3] px-2 py-1 text-xs font-bold text-[#1d9b60]">
                      <BadgeCheck className="mr-1 inline size-2.5" />
                      생성 완료
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-[1.7] text-[#555d72]">
                    {currentCoachSuggestion.responseGuide}
                  </p>

                  <div className="my-4 h-px bg-[#e5e8ef]" />

                  <p className="mb-2 text-xs font-bold text-[#3157f6]">
                    답변 예시
                  </p>
                  <p className="whitespace-pre-wrap rounded-xl bg-[#eaf0ff] p-3 text-xs leading-[1.75] text-[#4e5d83]">
                    {currentCoachSuggestion.answerExample}
                  </p>

                  {currentCoachSuggestion.sources.length > 0 ? (
                    <p className="mt-3 text-xs leading-5 text-[#8b92a5]">
                      참고 문서 ·{" "}
                      {currentCoachSuggestion.sources
                        .map((source) => source.title)
                        .join(", ")}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-[#a07845]">
                      일치하는 상담백과사전 문서가 없어 일반 응대 원칙만
                      반영했습니다.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={applyCoachAnswer}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] py-2 text-xs font-bold text-[#3157f6]"
                  >
                    <WandSparkles className="size-3" /> 답변에 사용
                  </button>
                </>
              ) : (
                <div className="py-4 text-center">
                  <Bot className="mx-auto size-6 text-[#a1a8b8]" />
                  <p className="mt-2 text-xs font-semibold text-[#697084]">
                    분석할 고객 메시지가 없습니다.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>

      {contextMenu && contextRoom ? (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[60]"
            onMouseDown={closeConversationContextMenu}
            onContextMenu={(event) => {
              event.preventDefault();
              closeConversationContextMenu();
            }}
          />
          <div
            role="menu"
            aria-label={`${getConversationDisplayName(contextRoom)} 채팅 메뉴`}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-[70] w-52 rounded-xl border border-[#e0e3eb] bg-white p-1.5 shadow-[0_12px_32px_rgba(37,43,63,0.18)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openCustomerInformation(contextRoom.id)}
              className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-[#555d72] hover:bg-[#f5f7fb]"
            >
              <UserRound className="size-4 text-[#7d8598]" />
              상세정보
            </button>

            <div className="relative">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={staffMembers.length > 0 && isAssigneeMenuOpen}
                aria-disabled={staffMembers.length === 0}
                disabled={staffMembers.length === 0}
                title={
                  staffMembers.length === 0
                    ? "추가할 수 있는 다른 계정이 없습니다."
                    : undefined
                }
                onClick={() =>
                  setIsAssigneeMenuOpen((current) =>
                    staffMembers.length > 0 ? !current : false,
                  )
                }
                onMouseEnter={() =>
                  setIsAssigneeMenuOpen(staffMembers.length > 0)
                }
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-[#555d72] hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:text-[#b8bdc8] disabled:hover:bg-transparent"
              >
                <UserPlus className="size-4 text-current" />
                <span className="flex-1">담당자 추가</span>
                <ChevronRight className="size-3.5 text-current opacity-70" />
              </button>

              {staffMembers.length > 0 && isAssigneeMenuOpen ? (
                <div
                  role="menu"
                  aria-label="담당자 선택"
                  className={`absolute top-0 w-52 rounded-xl border border-[#e0e3eb] bg-white p-1.5 shadow-[0_12px_32px_rgba(37,43,63,0.18)] ${
                    contextMenu.x > window.innerWidth - 440
                      ? "right-full mr-2"
                      : "left-full ml-2"
                  }`}
                >
                  {staffMembers.map((staffMember) => {
                    const isAssigned = contextRoom.assignees.some(
                      (assignee) => assignee.id === staffMember.id,
                    );
                    const requestKey = `${contextRoom.id}:${staffMember.id}`;
                    const isPending = pendingAssigneeKey === requestKey;

                    return (
                      <button
                        key={staffMember.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isAssigned}
                        disabled={isPending}
                        onClick={() =>
                          void toggleConversationAssignee(
                            contextRoom.id,
                            staffMember,
                          )
                        }
                        className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-[#555d72] hover:bg-[#f5f7fb] disabled:opacity-60"
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                            isAssigned
                              ? "border-[#3157f6] bg-[#3157f6] text-white"
                              : "border-[#cfd4df] bg-white text-transparent"
                          }`}
                        >
                          {isPending ? (
                            <LoaderCircle className="size-3 animate-spin text-[#3157f6]" />
                          ) : (
                            <Check className="size-3" />
                          )}
                        </span>
                        <span className="truncate">{staffMember.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="my-1 border-t border-[#eceef3]" />
            <button
              type="button"
              role="menuitem"
              disabled={pendingStatusRoomId === contextRoom.id}
              onClick={() => void toggleConversationStatus(contextRoom.id)}
              className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold disabled:opacity-60 ${
                contextRoom.status === "OPEN"
                  ? "text-[#3157f6] hover:bg-[#eef2ff]"
                  : "text-[#596176] hover:bg-[#f5f7fb]"
              }`}
            >
              {pendingStatusRoomId === contextRoom.id ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut
                  className={`size-4 ${
                    contextRoom.status === "CLOSED" ? "rotate-180" : ""
                  }`}
                />
              )}
              {contextRoom.status === "OPEN" ? "상담 완료" : "상담 다시 열기"}
            </button>
          </div>
        </>
      ) : null}

      {isCustomerModalOpen ? (
        <CustomerLinkModal
          key={currentRoom.id}
          conversation={currentRoom}
          onClose={() => setIsCustomerModalOpen(false)}
          onLinked={(linkedConversation) => {
            setRooms((current) =>
              current.map((room) =>
                room.id === linkedConversation.id ? linkedConversation : room,
              ),
            );
            setIsCustomerModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
