"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  FileText,
  Folder,
  ImagePlus,
  LoaderCircle,
  Megaphone,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type {
  ContentEventDetailType,
  ContentEventImageRecord,
  ContentEventRecord,
} from "@/features/events/types";

type EventDraft = {
  title: string;
  summary: string;
  originalPrice: string;
  discountAmount: string;
  isActive: boolean;
  isPinned: boolean;
  hasExposurePeriod: boolean;
  exposureStartAt: string;
  exposureEndAt: string;
  detailType: ContentEventDetailType;
  detailText: string;
  thumbnail: ContentEventImageRecord | null;
  detailImages: ContentEventImageRecord[];
};

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function createDraft(event?: ContentEventRecord): EventDraft {
  return {
    title: event?.title ?? "",
    summary: event?.summary ?? "",
    originalPrice: String(event?.originalPrice ?? 0),
    discountAmount: String(event?.discountAmount ?? 0),
    isActive: event?.isActive ?? true,
    isPinned: event?.isPinned ?? false,
    hasExposurePeriod: Boolean(event?.exposureStartAt && event.exposureEndAt),
    exposureStartAt: toDateInput(event?.exposureStartAt ?? null),
    exposureEndAt: toDateInput(event?.exposureEndAt ?? null),
    detailType: event?.detailType ?? "IMAGE",
    detailText: event?.detailText ?? "",
    thumbnail: event?.thumbnail ?? null,
    detailImages: event?.detailImages ?? [],
  };
}

function formatPrice(value: number) {
  return `${Math.max(0, value).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "-";
}

function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[#3157f6]" : "bg-[#cbd1dc]"}`}
    >
      <span
        className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function ContentSidebar() {
  return (
    <aside className="w-[260px] shrink-0 border-r border-[#e2e6ef] bg-white px-5 py-6">
      <h1 className="text-lg font-extrabold text-[#353c50]">콘텐츠</h1>
      <div className="mt-6 space-y-2 text-sm">
        <div className="flex items-center gap-2 px-2 font-bold text-[#4a5267]">
          <ChevronRight className="size-3 rotate-90" />
          <Folder className="size-4 text-[#969dae]" />
          이벤트
        </div>
        <div className="rounded-lg bg-[#eaf3ff] px-10 py-3 font-bold text-[#4c79b8]">
          이벤트
        </div>
        <div className="px-10 py-2 text-[#9ba2b2]">홈케어 상품</div>
        <div className="mt-4 flex items-center gap-2 px-2 font-bold text-[#4a5267]">
          <ChevronRight className="size-3" />
          <Folder className="size-4 text-[#969dae]" />
          공지사항
        </div>
      </div>
    </aside>
  );
}

function ImageUploadCard({
  image,
  label,
  uploading,
  onSelect,
  onRemove,
}: {
  image: ContentEventImageRecord | null;
  label: string;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#ccd3df] bg-[#f8f9fc]">
      {image ? (
        <div className="relative aspect-[4/3]">
          <Image
            src={image.publicUrl}
            alt={image.altText || image.originalName}
            fill
            loading="eager"
            sizes="320px"
            className="object-cover"
          />
          {onRemove ? (
            <button
              type="button"
              aria-label={`${label} 제거`}
              onClick={onRemove}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/65 text-white"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center text-[#9299a9] hover:bg-[#f0f3f9]">
          {uploading ? (
            <LoaderCircle className="size-7 animate-spin" />
          ) : (
            <Plus className="size-8" />
          )}
          <span className="mt-2 text-xs font-bold">{label}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onSelect(file);
            }}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

function MobilePreview({ draft }: { draft: EventDraft }) {
  const originalPrice = Number(draft.originalPrice) || 0;
  const discountAmount = Number(draft.discountAmount) || 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return (
    <aside className="min-h-0 border-l border-[#dfe5ef] bg-[#eaf4ff] px-5 py-6">
      <h2 className="text-base font-extrabold text-[#43526a]">미리보기</h2>
      <p className="mt-1 text-[10px] text-[#8aa0b8]">
        고객 앱의 모바일 상세 화면을 기준으로 표시합니다.
      </p>
      <div className="mx-auto mt-5 flex h-[700px] max-w-[360px] flex-col overflow-hidden rounded-[38px] border-[7px] border-white bg-white shadow-lg ring-1 ring-[#d9e2ed]">
        <div className="flex h-12 shrink-0 items-center justify-between px-5 text-xs font-bold text-[#20243a]">
          <span>12:30</span>
          <span>● ◒ ▰</span>
        </div>
        <div className="flex items-center justify-between px-5 py-2">
          <ArrowLeft className="size-6" />
          <span className="text-sm text-[#60738d]">공유</span>
        </div>
        <div className="border-b-8 border-[#f1f2f4] px-5 pb-5 pt-3">
          <h3 className="text-xl font-black leading-snug text-[#1f2431]">
            {draft.title || "제목을 입력해 주세요."}
          </h3>
          <p className="mt-3 text-xs leading-5 text-[#9299a8]">
            {draft.summary || "설명을 입력해 주세요."}
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              {discountAmount > 0 ? (
                <p className="text-[10px] text-[#a0a6b3] line-through">
                  {formatPrice(originalPrice)}
                </p>
              ) : null}
              <p className="text-base font-black">{formatPrice(finalPrice)}</p>
            </div>
            {draft.hasExposurePeriod && draft.exposureEndAt ? (
              <p className="text-xs text-[#9299a8]">~{draft.exposureEndAt}</p>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f4f5] py-2">
          {draft.detailType === "IMAGE" ? (
            draft.detailImages.length > 0 ? (
              <div className="space-y-2">
                {draft.detailImages.map((image) => (
                  <div
                    key={image.objectKey}
                    className="relative aspect-[4/5] bg-white"
                  >
                    <Image
                      src={image.publicUrl}
                      alt={image.altText || image.originalName}
                      fill
                      sizes="350px"
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-[#b0b5bf]">
                <ImagePlus className="size-10" />
                <p className="mt-3 text-xs font-bold">
                  상세 이미지를 등록해 주세요.
                </p>
              </div>
            )
          ) : draft.detailText ? (
            <div className="min-h-full whitespace-pre-wrap bg-white px-5 py-6 text-sm leading-7 text-[#3b4252]">
              {draft.detailText}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-[#b0b5bf]">
              <FileText className="size-10" />
              <p className="mt-3 text-xs font-bold">
                상세 텍스트를 입력해 주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function EventsClient({
  initialEvents,
}: {
  initialEvents: ContentEventRecord[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft>(() => createDraft());
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<
    "THUMBNAIL" | "DETAIL" | null
  >(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isEditing = editingId !== null;
  const isDirty = isEditing && JSON.stringify(draft) !== initialSnapshot;
  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? events.filter((event) =>
          `${event.title} ${event.summary}`.toLowerCase().includes(normalized),
        )
      : events;
  }, [events, query]);

  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);

  function resetMessages() {
    setNotice("");
    setError("");
  }

  function openEditor(event?: ContentEventRecord) {
    const nextDraft = createDraft(event);
    setEditingId(event?.id ?? "NEW");
    setDraft(nextDraft);
    setInitialSnapshot(JSON.stringify(nextDraft));
    resetMessages();
  }

  function closeEditor(force = false) {
    if (!force && isDirty) {
      setShowLeaveDialog(true);
      return;
    }
    setEditingId(null);
    setDraft(createDraft());
    setInitialSnapshot("");
    setShowLeaveDialog(false);
    resetMessages();
  }

  async function uploadFile(file: File, role: "THUMBNAIL" | "DETAIL") {
    if (role === "DETAIL" && draft.detailImages.length >= 10) {
      setError("상세 이미지는 최대 10개까지 등록할 수 있습니다.");
      return;
    }
    setUploadingTarget(role);
    resetMessages();
    try {
      const signingResponse = await fetch("/api/events/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      const signingResult = (await signingResponse.json()) as {
        uploadUrl?: string;
        image?: Omit<
          ContentEventImageRecord,
          "id" | "role" | "altText" | "sortOrder"
        >;
        error?: string;
      };
      if (
        !signingResponse.ok ||
        !signingResult.uploadUrl ||
        !signingResult.image
      ) {
        throw new Error(
          signingResult.error ?? "이미지 업로드를 준비하지 못했습니다.",
        );
      }
      const uploadResponse = await fetch(signingResult.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`${file.name} 이미지를 업로드하지 못했습니다.`);
      }
      const image: ContentEventImageRecord = {
        ...signingResult.image,
        id: `pending:${signingResult.image.objectKey}`,
        role,
        altText: "",
        sortOrder: role === "THUMBNAIL" ? 0 : draft.detailImages.length,
      };
      setDraft((current) =>
        role === "THUMBNAIL"
          ? { ...current, thumbnail: image }
          : { ...current, detailImages: [...current.detailImages, image] },
      );
      setNotice("이미지를 업로드했습니다. 저장하면 이벤트에 반영됩니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setUploadingTarget(null);
    }
  }

  function moveDetailImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.detailImages.length) return;
    setDraft((current) => {
      const images = [...current.detailImages];
      [images[index], images[target]] = [images[target], images[index]];
      return {
        ...current,
        detailImages: images.map((image, sortOrder) => ({
          ...image,
          sortOrder,
        })),
      };
    });
  }

  async function saveEvent() {
    resetMessages();
    if (!draft.thumbnail) {
      setError("대표 이미지를 등록해 주세요.");
      return;
    }
    setIsWorking(true);
    try {
      const response = await fetch(
        editingId === "NEW" ? "/api/events" : `/api/events/${editingId}`,
        {
          method: editingId === "NEW" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            originalPrice: Number(draft.originalPrice),
            discountAmount: Number(draft.discountAmount),
            currency: "KRW",
          }),
        },
      );
      const result = (await response.json()) as {
        event?: ContentEventRecord;
        error?: string;
      };
      if (!response.ok || !result.event) {
        throw new Error(result.error ?? "이벤트를 저장하지 못했습니다.");
      }
      setEvents((current) => {
        const remaining = current.filter(
          (event) => event.id !== result.event!.id,
        );
        return [result.event!, ...remaining].sort(
          (left, right) => Number(right.isPinned) - Number(left.isPinned),
        );
      });
      setInitialSnapshot(JSON.stringify(createDraft(result.event)));
      setNotice("이벤트를 저장했습니다.");
      setEditingId(null);
      setDraft(createDraft());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "이벤트를 저장하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function toggleEvent(
    event: ContentEventRecord,
    field: "isActive" | "isPinned",
  ) {
    setIsWorking(true);
    resetMessages();
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !event[field] }),
      });
      const result = (await response.json()) as {
        event?: ContentEventRecord;
        error?: string;
      };
      if (!response.ok || !result.event) {
        throw new Error(result.error ?? "이벤트 상태를 변경하지 못했습니다.");
      }
      setEvents((current) =>
        current
          .map((item) => (item.id === event.id ? result.event! : item))
          .sort(
            (left, right) => Number(right.isPinned) - Number(left.isPinned),
          ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "이벤트 상태를 변경하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteEvent(event: ContentEventRecord) {
    if (!window.confirm(`'${event.title}' 이벤트를 삭제할까요?`)) return;
    setIsWorking(true);
    resetMessages();
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "이벤트를 삭제하지 못했습니다.");
      }
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setNotice("이벤트를 삭제했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "이벤트를 삭제하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
        <ContentSidebar />
        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#e2e6ef] px-8">
            <h2 className="text-lg font-extrabold text-[#30374a]">
              이벤트 목록
            </h2>
            <button
              type="button"
              onClick={() => openEditor()}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white hover:bg-[#284be0]"
            >
              <Plus className="size-4" /> 등록
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
            <div className="flex items-center gap-6">
              <p className="min-w-20 text-base font-extrabold text-[#3c4356]">
                총 {events.length}개
              </p>
              <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-[#dfe3ea] px-4 text-[#9299a9]">
                <Search className="size-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="제목이나 한줄 소개로 검색해 주세요."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#3e4659] outline-none"
                />
              </label>
            </div>
            {notice || error ? (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-[#fff0f2] text-[#c64558]" : "bg-[#edf8f2] text-[#34805b]"}`}
              >
                {error || notice}
              </div>
            ) : null}
            <div className="mt-5 min-h-0 flex-1 overflow-auto rounded-xl border border-[#e2e6ed]">
              <div className="grid min-w-[1050px] grid-cols-[44px_72px_88px_minmax(260px,1fr)_120px_170px_70px_70px_220px] items-center gap-3 border-b border-[#dde2ea] bg-[#f7f8fa] px-4 py-3 text-xs font-extrabold text-[#586074]">
                <span>고정</span>
                <span>활성화</span>
                <span>이미지</span>
                <span>제목</span>
                <span>판매가격</span>
                <span>노출기간</span>
                <span>조회수</span>
                <span>상담수</span>
                <span />
              </div>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const finalPrice = event.originalPrice - event.discountAmount;
                  return (
                    <div
                      key={event.id}
                      className="grid min-w-[1050px] grid-cols-[44px_72px_88px_minmax(260px,1fr)_120px_170px_70px_70px_220px] items-center gap-3 border-b border-[#edf0f4] px-4 py-4 text-xs text-[#4e566a] last:border-b-0 hover:bg-[#fbfcff]"
                    >
                      <button
                        type="button"
                        aria-label={
                          event.isPinned ? "상단고정 해제" : "상단고정"
                        }
                        disabled={isWorking}
                        onClick={() => void toggleEvent(event, "isPinned")}
                        className={
                          event.isPinned ? "text-[#3157f6]" : "text-[#a2a8b5]"
                        }
                      >
                        <Pin
                          className="size-4"
                          fill={event.isPinned ? "currentColor" : "none"}
                        />
                      </button>
                      <Switch
                        checked={event.isActive}
                        disabled={isWorking}
                        label={`${event.title} 활성화`}
                        onChange={() => void toggleEvent(event, "isActive")}
                      />
                      <div className="relative size-16 overflow-hidden rounded-lg bg-[#eef0f5]">
                        {event.thumbnail ? (
                          <Image
                            src={event.thumbnail.publicUrl}
                            alt={event.thumbnail.altText || event.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <ImagePlus className="absolute inset-0 m-auto size-5 text-[#aab0bd]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#343b4f]">
                          {event.title}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-[#969dad]">
                          {event.summary || "한줄 소개 없음"}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-[#30374a]">
                          {formatPrice(finalPrice)}
                        </p>
                        {event.discountAmount > 0 ? (
                          <p className="mt-1 text-[10px] text-[#a5aab5] line-through">
                            {formatPrice(event.originalPrice)}
                          </p>
                        ) : null}
                      </div>
                      <div className="leading-5 text-[#81889a]">
                        <p>{formatDate(event.exposureStartAt)}</p>
                        <p>~ {formatDate(event.exposureEndAt)}</p>
                      </div>
                      <span>{event.viewCount.toLocaleString("ko-KR")}</span>
                      <span>
                        {event.consultationCount.toLocaleString("ko-KR")}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(event)}
                          className="rounded-lg border border-[#cfd5df] px-3 py-2 font-bold text-[#60687a] hover:bg-[#f4f6fa]"
                        >
                          상세/수정
                        </button>
                        <button
                          type="button"
                          disabled
                          title="푸시알림은 추후 연결 예정입니다."
                          className="flex items-center gap-1 rounded-lg bg-[#8066ec] px-3 py-2 font-bold text-white opacity-55"
                        >
                          <Megaphone className="size-3" /> 푸시
                        </button>
                        <button
                          type="button"
                          aria-label={`${event.title} 삭제`}
                          disabled={isWorking}
                          onClick={() => void deleteEvent(event)}
                          className="flex size-8 items-center justify-center rounded-lg text-[#c05b6a] hover:bg-[#fff0f2]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center text-[#9ca3b2]">
                  <CalendarDays className="size-10" />
                  <p className="mt-3 text-sm font-bold">
                    표시할 이벤트가 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  const finalPrice = Math.max(
    0,
    (Number(draft.originalPrice) || 0) - (Number(draft.discountAmount) || 0),
  );

  return (
    <div className="flex h-full min-h-0 min-w-[1220px] flex-col bg-[#f4f7fb]">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e0e5ed] bg-white px-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => closeEditor()}
            className="flex size-9 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#697185]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-lg font-extrabold text-[#30374a]">
            {editingId === "NEW" ? "이벤트 등록" : "이벤트 수정"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => closeEditor()}
            className="h-10 rounded-xl border border-[#cfd5df] px-5 text-sm font-bold text-[#6b7283]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isWorking || uploadingTarget !== null}
            onClick={() => void saveEvent()}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-6 text-sm font-bold text-white disabled:bg-[#aab7eb]"
          >
            {isWorking ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            저장
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(720px,1fr)_410px]">
        <main className="min-h-0 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[900px] space-y-6">
            {notice || error ? (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-[#fff0f2] text-[#c64558]" : "bg-[#edf8f2] text-[#34805b]"}`}
              >
                {error || notice}
              </div>
            ) : null}

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-6">
              <h2 className="text-sm font-extrabold text-[#3d4457]">
                기본 설정
              </h2>
              <div className="mt-6 grid grid-cols-[130px_1fr] items-center gap-x-6 gap-y-5 text-sm">
                <span className="font-bold text-[#596175]">활성화</span>
                <Switch
                  checked={draft.isActive}
                  label="이벤트 활성화"
                  onChange={(isActive) => setDraft({ ...draft, isActive })}
                />
                <span className="font-bold text-[#596175]">상단고정</span>
                <label className="flex items-center gap-3 text-[#70788a]">
                  <input
                    type="checkbox"
                    checked={draft.isPinned}
                    onChange={(event) =>
                      setDraft({ ...draft, isPinned: event.target.checked })
                    }
                    className="size-4 accent-[#3157f6]"
                  />
                  목록 최상단에 고정
                </label>
                <label
                  htmlFor="event-title"
                  className="font-bold text-[#596175]"
                >
                  제목 <span className="text-[#df5163]">*</span>
                </label>
                <input
                  id="event-title"
                  value={draft.title}
                  maxLength={120}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder="제목을 입력해 주세요."
                  className="h-11 rounded-xl border border-[#dfe3ea] px-4 outline-none focus:border-[#7187f6]"
                />
                <span className="font-bold text-[#596175]">가격</span>
                <div className="grid grid-cols-[1fr_1fr_130px] gap-3">
                  <label className="flex h-11 items-center rounded-xl border border-[#dfe3ea] px-3">
                    <span className="mr-2 text-xs text-[#969dad]">
                      기본가격
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={draft.originalPrice}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          originalPrice: event.target.value,
                        })
                      }
                      className="min-w-0 flex-1 text-right outline-none"
                    />
                  </label>
                  <label className="flex h-11 items-center rounded-xl border border-[#dfe3ea] px-3">
                    <span className="mr-2 text-xs text-[#969dad]">
                      할인금액
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={draft.discountAmount}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          discountAmount: event.target.value,
                        })
                      }
                      className="min-w-0 flex-1 text-right outline-none"
                    />
                  </label>
                  <div className="flex h-11 items-center justify-center rounded-xl bg-[#f3f4f7] font-bold text-[#42495c]">
                    {formatPrice(finalPrice)}
                  </div>
                </div>
                <span className="font-bold text-[#596175]">노출기간</span>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[#6b7386]">
                    <input
                      type="checkbox"
                      checked={draft.hasExposurePeriod}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          hasExposurePeriod: event.target.checked,
                        })
                      }
                      className="size-4 accent-[#3157f6]"
                    />
                    기간 설정
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      disabled={!draft.hasExposurePeriod}
                      value={draft.exposureStartAt}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          exposureStartAt: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-[#dfe3ea] px-3 disabled:bg-[#f4f5f7]"
                    />
                    <span className="text-[#9ca2af]">~</span>
                    <input
                      type="date"
                      disabled={!draft.hasExposurePeriod}
                      value={draft.exposureEndAt}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          exposureEndAt: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-[#dfe3ea] px-3 disabled:bg-[#f4f5f7]"
                    />
                  </div>
                </div>
                <label
                  htmlFor="event-summary"
                  className="font-bold text-[#596175]"
                >
                  한줄 소개
                </label>
                <input
                  id="event-summary"
                  value={draft.summary}
                  maxLength={300}
                  onChange={(event) =>
                    setDraft({ ...draft, summary: event.target.value })
                  }
                  placeholder="고객에게 보여줄 짧은 설명을 입력해 주세요."
                  className="h-11 rounded-xl border border-[#dfe3ea] px-4 outline-none focus:border-[#7187f6]"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-6">
              <h2 className="text-sm font-extrabold text-[#3d4457]">
                대표이미지 <span className="text-[#df5163]">*</span>
              </h2>
              <p className="mt-1 text-[11px] text-[#969dad]">
                이벤트 목록에 표시되는 썸네일입니다. 4:3 비율을 권장합니다.
              </p>
              <div className="mt-4 w-[260px]">
                <ImageUploadCard
                  image={draft.thumbnail}
                  label="대표 이미지 추가"
                  uploading={uploadingTarget === "THUMBNAIL"}
                  onSelect={(file) => void uploadFile(file, "THUMBNAIL")}
                  onRemove={() => setDraft({ ...draft, thumbnail: null })}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-[#3d4457]">
                    상세정보 <span className="text-[#df5163]">*</span>
                  </h2>
                  <p className="mt-1 text-[11px] text-[#969dad]">
                    상세 페이지는 이미지 또는 텍스트 중 하나로 구성합니다.
                  </p>
                </div>
                <div className="flex rounded-xl bg-[#f1f3f7] p-1">
                  {(["IMAGE", "TEXT"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDraft({ ...draft, detailType: type })}
                      className={`rounded-lg px-5 py-2 text-xs font-bold ${draft.detailType === type ? "bg-white text-[#3157f6] shadow-sm" : "text-[#858c9d]"}`}
                    >
                      {type === "IMAGE" ? "이미지" : "텍스트"}
                    </button>
                  ))}
                </div>
              </div>

              {draft.detailType === "IMAGE" ? (
                <div className="mt-5">
                  <div className="grid grid-cols-3 gap-4">
                    {draft.detailImages.map((image, index) => (
                      <div
                        key={image.objectKey}
                        className="overflow-hidden rounded-xl border border-[#e0e4ec] bg-[#fafbfc]"
                      >
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={image.publicUrl}
                            alt={image.altText || image.originalName}
                            fill
                            sizes="240px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2">
                          <p className="min-w-0 flex-1 truncate text-[10px] text-[#697185]">
                            {index + 1}. {image.originalName}
                          </p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveDetailImage(index, -1)}
                              className="rounded p-1 text-[#7c8496] disabled:opacity-25"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === draft.detailImages.length - 1}
                              onClick={() => moveDetailImage(index, 1)}
                              className="rounded p-1 text-[#7c8496] disabled:opacity-25"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`${image.originalName} 제거`}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  detailImages: draft.detailImages
                                    .filter(
                                      (item) =>
                                        item.objectKey !== image.objectKey,
                                    )
                                    .map((item, sortOrder) => ({
                                      ...item,
                                      sortOrder,
                                    })),
                                })
                              }
                              className="rounded p-1 text-[#cf5366]"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {draft.detailImages.length < 10 ? (
                      <ImageUploadCard
                        image={null}
                        label="상세 이미지 추가"
                        uploading={uploadingTarget === "DETAIL"}
                        onSelect={(file) => void uploadFile(file, "DETAIL")}
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 text-[10px] text-[#969dad]">
                    최대 10장, 파일당 10MB · 등록 순서대로 고객에게 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <textarea
                    value={draft.detailText}
                    maxLength={100_000}
                    onChange={(event) =>
                      setDraft({ ...draft, detailText: event.target.value })
                    }
                    placeholder="이벤트 상세 내용을 입력해 주세요."
                    className="min-h-[320px] w-full resize-y rounded-xl border border-[#dfe3ea] px-4 py-3 text-sm leading-7 outline-none focus:border-[#7187f6]"
                  />
                  <p className="mt-2 text-right text-[10px] text-[#969dad]">
                    {draft.detailText.length.toLocaleString("ko-KR")} / 100,000
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
        <MobilePreview draft={draft} />
      </div>

      {showLeaveDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d2433]/45 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fff0f2] text-[#d64558]">
                <Megaphone className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#30374a]">
                  저장하지 않고 나가시겠어요?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#858c9d]">
                  화면을 이동하면 입력한 내용이 사라집니다.
                </p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => closeEditor(true)}
                className="h-11 rounded-xl bg-[#d94758] text-sm font-bold text-white"
              >
                나가기
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveDialog(false)}
                className="h-11 rounded-xl border border-[#d9dde5] text-sm font-bold text-[#6d7486]"
              >
                계속 편집
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
