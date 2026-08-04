"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SectionTabs } from "@/components/section-tabs";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { AutomationManagementDashboardView } from "@/features/automations/components/automation-management-dashboard";
import type { AutomationManagementDashboard } from "@/features/automations/management-types";
import {
  TreatmentTagPicker,
  type TreatmentTagOption,
} from "@/features/customers/components/treatment-tag-picker";
import {
  SectionSidebar,
  type SectionSidebarGroup,
} from "@/features/navigation/components/section-sidebar";

type ScheduledMessage = {
  id: string;
  dayOffset: number;
  title: string;
  content: string;
  sortOrder: number;
};

type AutomationItem = {
  id: string;
  name: string;
  nationality: string | null;
  message: string;
  messages: ScheduledMessage[];
  isActive: boolean;
  appliedCount: number;
  sentCount: number;
  tags: TreatmentTagOption[];
  createdAt: string;
  updatedAt: string;
};

type EditorDraft = {
  id: string | null;
  name: string;
  tagNames: string[];
  nationality: string;
  messages: ScheduledMessage[];
  isActive: boolean;
};

type MessageDraft = {
  index: number | null;
  dayOffset: string;
  title: string;
  content: string;
};

const duplicateTagMessage =
  "현재 설정된 치료태그로 설정된 자동화가 이미 존재합니다.";

const editorStepTabs = [
  { value: "BASIC", label: "1. 기본설정" },
  { value: "MESSAGES", label: "2. 메시지" },
] as const;

function safeColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#3157f6";
}

function normalizedMessages(automation: AutomationItem) {
  if (automation.messages.length > 0) return automation.messages;
  return automation.message
    ? [
        {
          id: `legacy-${automation.id}`,
          dayOffset: 1,
          title: "첫 안내",
          content: automation.message,
          sortOrder: 0,
        },
      ]
    : [];
}

export function AutomationsClient({
  initialAutomations,
  treatmentTags,
  initialManagementDashboard,
}: {
  initialAutomations: AutomationItem[];
  treatmentTags: TreatmentTagOption[];
  initialManagementDashboard: AutomationManagementDashboard;
}) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [automationSection, setAutomationSection] = useState<
    "AUTOMATIONS" | "MANAGEMENT"
  >("AUTOMATIONS");
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [viewer, setViewer] = useState<AutomationItem | null>(null);
  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [editorSnapshot, setEditorSnapshot] = useState("");
  const [messageDraft, setMessageDraft] = useState<MessageDraft | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingId, setPendingId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pendingExit, setPendingExit] = useState<
    { type: "CLOSE" } | { type: "LINK"; href: string } | { type: "BACK" } | null
  >(null);
  const bypassNavigationGuard = useRef(false);
  const isDirtyRef = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const isDirty = Boolean(
    editor &&
    (JSON.stringify(editor) !== editorSnapshot || messageDraft !== null),
  );
  const editorOpen = Boolean(editor);

  const filteredAutomations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return automations.filter((automation) => {
      if (automation.isActive !== (statusTab === "ACTIVE")) return false;
      if (!normalizedQuery) return true;
      return `${automation.name} ${automation.tags.map((tag) => tag.name).join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [automations, query, statusTab]);
  const statusTabs = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    for (const automation of automations) {
      if (automation.isActive) activeCount += 1;
      else inactiveCount += 1;
    }
    return [
      { value: "ACTIVE", label: "진행 중", count: activeCount },
      { value: "INACTIVE", label: "사용 안 함", count: inactiveCount },
    ] as const;
  }, [automations]);
  const sidebarGroups: SectionSidebarGroup[] = [
    {
      id: "automation-sections",
      items: [
        {
          id: "automations",
          label: "상담자동화",
          icon: Workflow,
          active: automationSection === "AUTOMATIONS",
          onSelect: () => setAutomationSection("AUTOMATIONS"),
        },
        {
          id: "management",
          label: "관리현황",
          icon: ChartNoAxesCombined,
          active: automationSection === "MANAGEMENT",
          onSelect: () => setAutomationSection("MANAGEMENT"),
        },
      ],
    },
  ];

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function interceptLink(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!anchor || anchor.target === "_blank") return;
      event.preventDefault();
      event.stopPropagation();
      setPendingExit({ type: "LINK", href: anchor.href });
    }

    window.addEventListener("beforeunload", preventUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", preventUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!editorOpen) return;
    window.history.pushState(
      { automationEditorGuard: true },
      "",
      location.href,
    );

    function interceptBack() {
      if (bypassNavigationGuard.current || !isDirtyRef.current) return;
      window.history.pushState(
        { automationEditorGuard: true },
        "",
        location.href,
      );
      setPendingExit({ type: "BACK" });
    }

    window.addEventListener("popstate", interceptBack);
    return () => window.removeEventListener("popstate", interceptBack);
  }, [editorOpen]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3_500);
  }

  function openEditor(automation?: AutomationItem, initialStep: 1 | 2 = 1) {
    bypassNavigationGuard.current = false;
    const draft: EditorDraft = automation
      ? {
          id: automation.id,
          name: automation.name,
          tagNames: automation.tags.map((tag) => tag.name),
          nationality: automation.nationality ?? "",
          messages: normalizedMessages(automation),
          isActive: automation.isActive,
        }
      : {
          id: null,
          name: "",
          tagNames: [],
          nationality: "",
          messages: [],
          isActive: true,
        };
    setEditor(draft);
    setEditorSnapshot(JSON.stringify(draft));
    setViewer(null);
    setStep(initialStep);
    setMessageDraft(null);
    setError("");
  }

  function hasConflictingTag(draft: EditorDraft) {
    return automations.some(
      (automation) =>
        automation.id !== draft.id &&
        automation.tags.some((tag) => draft.tagNames.includes(tag.name)),
    );
  }

  function goToMessageStep() {
    if (!editor) return;
    if (!editor.name.trim() || editor.tagNames.length === 0) return;
    if (hasConflictingTag(editor)) {
      showToast(duplicateTagMessage);
      return;
    }
    setStep(2);
  }

  function requestCloseEditor() {
    if (isDirty) {
      setPendingExit({ type: "CLOSE" });
      return;
    }
    setEditor(null);
  }

  function confirmExit() {
    if (!pendingExit) return;
    const target = pendingExit;
    setPendingExit(null);
    bypassNavigationGuard.current = true;
    setEditor(null);
    setMessageDraft(null);
    if (target.type === "LINK") {
      window.location.href = target.href;
    } else if (target.type === "BACK") {
      window.history.go(-2);
    } else {
      bypassNavigationGuard.current = false;
    }
  }

  function openMessageModal(index: number | null) {
    const message = index === null ? null : editor?.messages[index];
    setMessageDraft({
      index,
      dayOffset: message ? String(message.dayOffset) : "1",
      title: message?.title ?? "",
      content: message?.content ?? "",
    });
  }

  function saveMessageDraft() {
    if (!editor || !messageDraft) return;
    const dayOffset = Number(messageDraft.dayOffset);
    if (
      !Number.isInteger(dayOffset) ||
      dayOffset < 0 ||
      !messageDraft.title.trim() ||
      !messageDraft.content.trim()
    ) {
      setError("발송일, 단계명, 메시지 내용을 모두 입력해 주세요.");
      return;
    }
    const nextMessage: ScheduledMessage = {
      id:
        messageDraft.index === null
          ? `new-${crypto.randomUUID()}`
          : editor.messages[messageDraft.index].id,
      dayOffset,
      title: messageDraft.title.trim(),
      content: messageDraft.content.trim(),
      sortOrder: messageDraft.index ?? editor.messages.length,
    };
    const nextMessages =
      messageDraft.index === null
        ? [...editor.messages, nextMessage]
        : editor.messages.map((message, index) =>
            index === messageDraft.index ? nextMessage : message,
          );
    nextMessages.sort(
      (left, right) =>
        left.dayOffset - right.dayOffset || left.sortOrder - right.sortOrder,
    );
    setEditor({
      ...editor,
      messages: nextMessages.map((message, index) => ({
        ...message,
        sortOrder: index,
      })),
    });
    setMessageDraft(null);
    setError("");
  }

  function deleteMessageDraft() {
    if (!editor || messageDraft?.index === null || !messageDraft) return;
    setEditor({
      ...editor,
      messages: editor.messages
        .filter((_, index) => index !== messageDraft.index)
        .map((message, index) => ({ ...message, sortOrder: index })),
    });
    setMessageDraft(null);
  }

  async function saveAutomation() {
    if (!editor || isSaving) return;
    const tagIds = treatmentTags
      .filter((tag) => editor.tagNames.includes(tag.name))
      .map((tag) => tag.id);
    if (
      !editor.name.trim() ||
      tagIds.length === 0 ||
      editor.messages.length === 0
    ) {
      setError("명칭, 치료태그, 메시지를 모두 입력해 주세요.");
      return;
    }
    if (hasConflictingTag(editor)) {
      showToast(duplicateTagMessage);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(
        editor.id ? `/api/automations/${editor.id}` : "/api/automations",
        {
          method: editor.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editor.name,
            tagIds,
            nationality: editor.nationality,
            messages: editor.messages.map(({ dayOffset, title, content }) => ({
              dayOffset,
              title,
              content,
            })),
            isActive: editor.isActive,
          }),
        },
      );
      const result = (await response.json()) as {
        automation?: AutomationItem;
        error?: string;
      };
      if (!response.ok || !result.automation) {
        if (response.status === 409) showToast(duplicateTagMessage);
        throw new Error(result.error ?? "자동화를 저장하지 못했습니다.");
      }
      setAutomations((current) =>
        editor.id
          ? current.map((item) =>
              item.id === editor.id ? result.automation! : item,
            )
          : [result.automation!, ...current],
      );
      setViewer(result.automation);
      setEditorSnapshot(JSON.stringify(editor));
      setEditor(null);
      setMessageDraft(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "자동화를 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAutomation(automation: AutomationItem) {
    if (pendingId) return;
    setPendingId(automation.id);
    const nextActive = !automation.isActive;
    setAutomations((current) =>
      current.map((item) =>
        item.id === automation.id ? { ...item, isActive: nextActive } : item,
      ),
    );
    try {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!response.ok) throw new Error("상태를 변경하지 못했습니다.");
    } catch (toggleError) {
      setAutomations((current) =>
        current.map((item) =>
          item.id === automation.id
            ? { ...item, isActive: automation.isActive }
            : item,
        ),
      );
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "상태를 변경하지 못했습니다.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function deleteAutomation(automation: AutomationItem) {
    if (
      pendingId ||
      !window.confirm(`‘${automation.name}’ 자동화를 삭제할까요?`)
    )
      return;
    setPendingId(automation.id);
    try {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("자동화를 삭제하지 못했습니다.");
      setAutomations((current) =>
        current.filter((item) => item.id !== automation.id),
      );
      if (viewer?.id === automation.id) setViewer(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "자동화를 삭제하지 못했습니다.",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#f2f5fb]">
      {editor ? (
        <>
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e9f1] bg-white px-6">
            <h1 className="text-lg font-extrabold text-[#30364a]">
              상담자동화 {editor.id ? "수정" : "등록"}
            </h1>
            <button
              type="button"
              onClick={requestCloseEditor}
              className="rounded-lg p-2 text-[#70788c] hover:bg-[#f2f4f8]"
              aria-label="닫기"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="shrink-0 bg-white">
            <SectionTabs
              ariaLabel="자동화 등록 단계"
              options={editorStepTabs.map((tab) => ({
                ...tab,
                disabled:
                  tab.value === "MESSAGES" &&
                  (!editor.name.trim() || editor.tagNames.length === 0),
              }))}
              value={step === 1 ? "BASIC" : "MESSAGES"}
              onValueChange={(nextStep) => {
                if (nextStep === "MESSAGES") {
                  goToMessageStep();
                  return;
                }
                setStep(1);
              }}
            />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto p-8">
            <div
              className={`${step === 1 ? "max-w-3xl" : "max-w-6xl"} mx-auto rounded-3xl border border-[#e2e7f0] bg-white p-8 shadow-sm`}
            >
              {step === 1 ? (
                <div className="space-y-7">
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#596176]">
                      명칭 <b className="text-[#e34e61]">*</b>
                    </span>
                    <input
                      value={editor.name}
                      onChange={(event) =>
                        setEditor({ ...editor, name: event.target.value })
                      }
                      placeholder="자동화 명칭"
                      className="h-11 w-full rounded-xl border border-[#dfe3ec] px-4 text-sm outline-none focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10"
                    />
                  </label>
                  <div>
                    <span className="mb-2 block text-xs font-bold text-[#596176]">
                      대상 치료태그 <b className="text-[#e34e61]">*</b>
                    </span>
                    <p className="mb-3 text-xs text-[#9299aa]">
                      치료태그 하나에는 하나의 자동화만 설정할 수 있습니다.
                    </p>
                    <TreatmentTagPicker
                      options={treatmentTags}
                      selectedNames={editor.tagNames}
                      onChange={(tagNames) =>
                        setEditor({ ...editor, tagNames })
                      }
                    />
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#596176]">
                      국적 (선택)
                    </span>
                    <select
                      value={editor.nationality}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          nationality: event.target.value,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-4 text-sm outline-none focus:border-[#7187f6]"
                    >
                      <option value="">전체 국적</option>
                      <option value="대한민국">대한민국</option>
                      <option value="미국">미국</option>
                      <option value="일본">일본</option>
                      <option value="중국">중국</option>
                    </select>
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold text-[#343a4d]">
                        메시지 스케줄
                      </h2>
                      <p className="mt-1 text-xs text-[#9299aa]">
                        카드를 눌러 수정하거나 원하는 시점의 메시지를
                        추가하세요.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMessageModal(null)}
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-[#3157f6] px-4 text-sm font-bold text-white"
                    >
                      <Plus className="size-4" /> 추가
                    </button>
                  </div>
                  <div className="mt-7 flex min-h-72 items-center overflow-x-auto pb-4">
                    {editor.messages.map((message, index) => (
                      <div
                        key={message.id}
                        className="flex shrink-0 items-center"
                      >
                        <button
                          type="button"
                          onClick={() => openMessageModal(index)}
                          className="w-64 overflow-hidden rounded-2xl border border-[#b8c8fa] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between bg-[#3157f6] px-4 py-2.5 text-xs font-extrabold text-white">
                            <span>D+{message.dayOffset}</span>
                            <span className="max-w-36 truncate">
                              {message.title}
                            </span>
                          </div>
                          <p className="line-clamp-8 min-h-52 whitespace-pre-wrap px-4 py-4 text-xs leading-5 text-[#596176]">
                            {message.content}
                          </p>
                        </button>
                        {index < editor.messages.length - 1 ? (
                          <div className="flex w-12 items-center text-[#a6adbc]">
                            <span className="h-px flex-1 bg-[#a6adbc]" />
                            <ArrowRight className="size-4" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {editor.messages.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openMessageModal(null)}
                        className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ccd4e5] text-[#8d95a8] hover:border-[#7187f6] hover:text-[#3157f6]"
                      >
                        <Plus className="mb-2 size-7" />
                        <span className="text-sm font-bold">
                          첫 메시지 추가
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              {error ? (
                <p
                  role="alert"
                  className="mt-5 rounded-xl bg-[#fff1f3] px-4 py-3 text-xs font-semibold text-[#d8465b]"
                >
                  {error}
                </p>
              ) : null}
            </div>
          </main>
          <footer className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-[#e2e7f0] bg-white">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 rounded-xl border border-[#d8dde8] px-6 text-sm font-bold text-[#687086]"
              >
                이전
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                step === 1 ? goToMessageStep() : void saveAutomation()
              }
              disabled={
                isSaving ||
                (step === 1 &&
                  (!editor.name.trim() || editor.tagNames.length === 0)) ||
                (step === 2 && editor.messages.length === 0)
              }
              className="flex h-11 items-center gap-2 rounded-xl bg-[#3157f6] px-7 text-sm font-bold text-white disabled:bg-[#cfd4df]"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {step === 1 ? "다음" : "저장"}
            </button>
          </footer>
        </>
      ) : viewer ? (
        <>
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e9f1] bg-white px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="rounded-lg p-2 text-[#70788c] hover:bg-[#f2f4f8]"
                aria-label="목록으로"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h1 className="text-lg font-extrabold text-[#30364a]">
                상담자동화 조회
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="text-sm font-bold text-[#687086]"
            >
              닫기
            </button>
          </header>
          <div className="flex shrink-0 items-center justify-between px-8 py-5">
            <div>
              <h2 className="text-lg font-extrabold text-[#30364a]">
                {viewer.name}
              </h2>
              <div className="mt-2 flex gap-1.5">
                {viewer.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: safeColor(tag.color) }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${viewer.isActive ? "bg-[#eaf9f1] text-[#15945d]" : "bg-[#eef0f4] text-[#8d94a5]"}`}
            >
              {viewer.isActive ? "사용 중" : "사용 안 함"}
            </span>
          </div>
          <main className="min-h-0 flex-1 overflow-x-auto px-10 pb-8">
            <div className="flex min-h-full min-w-max items-center">
              {normalizedMessages(viewer).map((message, index, messages) => (
                <div key={message.id} className="flex items-center">
                  <article className="w-72 overflow-hidden rounded-2xl border border-[#7ebbea] bg-white shadow-sm">
                    <div className="flex items-center justify-between bg-[#168dea] px-4 py-3 text-xs font-extrabold text-white">
                      <span>D+{message.dayOffset}</span>
                      <span className="max-w-40 truncate">{message.title}</span>
                    </div>
                    <div className="min-h-64 p-5">
                      <div className="mb-4 rounded-lg bg-[#f6f7fa] px-3 py-2 text-xs font-bold text-[#747c8f]">
                        텍스트
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-5 text-[#51596d]">
                        {message.content}
                      </p>
                    </div>
                  </article>
                  {index < messages.length - 1 ? (
                    <div className="flex w-16 items-center text-[#969eae]">
                      <span className="h-px flex-1 bg-[#969eae]" />
                      <ArrowRight className="size-5" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </main>
          <footer className="flex h-20 shrink-0 items-center justify-between border-t border-[#e2e7f0] bg-white px-8">
            <button
              type="button"
              onClick={() => void deleteAutomation(viewer)}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#e0a5af] px-4 text-sm font-bold text-[#d8465b]"
            >
              <Trash2 className="size-4" /> 삭제
            </button>
            <button
              type="button"
              onClick={() => openEditor(viewer, 2)}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white"
            >
              <Pencil className="size-4" /> 메시지 수정
            </button>
          </footer>
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          <SectionSidebar
            title="자동화"
            ariaLabel="자동화 메뉴"
            groups={sidebarGroups}
          />

          <section className="flex min-w-0 flex-1 flex-col">
            {automationSection === "AUTOMATIONS" ? (
              <>
                <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#e4e8f0] bg-white px-7">
                  <div>
                    <h1 className="text-xl font-extrabold tracking-[-0.03em] text-[#30364a]">
                      상담자동화
                    </h1>
                    <p className="mt-1 text-xs text-[#8d94a6]">
                      치료태그를 기준으로 고객에게 전달할 상담 메시지를
                      설정합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditor()}
                    className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-4 text-sm font-bold text-white"
                  >
                    <Plus className="size-4" /> 등록
                  </button>
                </header>
                <SectionTabs
                  ariaLabel="자동화 상태"
                  options={statusTabs}
                  value={statusTab}
                  onValueChange={setStatusTab}
                  layout="fit"
                />
                <div className="flex shrink-0 items-center border-b border-[#e5e9f1] bg-white px-7 py-4">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#dfe3ec] px-4 focus-within:border-[#7187f6]">
                    <Search className="size-4 text-[#9ba2b1]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="자동화명 또는 치료태그로 검색"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>
                </div>
                <main className="min-h-0 flex-1 overflow-y-auto p-7">
                  {error ? (
                    <p
                      role="alert"
                      className="mb-5 rounded-xl bg-[#fff1f3] px-4 py-3 text-xs font-semibold text-[#d8465b]"
                    >
                      {error}
                    </p>
                  ) : null}
                  {filteredAutomations.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                      {filteredAutomations.map((automation) => (
                        <article
                          key={automation.id}
                          className="rounded-2xl border border-[#e2e6ef] bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setViewer(automation)}
                              className="min-w-0 text-left"
                            >
                              <h2 className="truncate text-base font-extrabold text-[#30364a] hover:text-[#3157f6]">
                                {automation.name}
                              </h2>
                              <span className="mt-1 inline-block text-[10px] font-semibold text-[#8c93a5]">
                                메시지 {normalizedMessages(automation).length}개
                                {automation.nationality
                                  ? ` · ${automation.nationality}`
                                  : ""}
                              </span>
                            </button>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={automation.isActive}
                              aria-label={`${automation.name} 사용 여부`}
                              onClick={() => void toggleAutomation(automation)}
                              disabled={pendingId === automation.id}
                              className={`relative h-6 w-11 shrink-0 rounded-full ${automation.isActive ? "bg-[#3157f6]" : "bg-[#c8cdd8]"}`}
                            >
                              <span
                                className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform ${automation.isActive ? "translate-x-5" : "translate-x-0"}`}
                              />
                            </button>
                          </div>
                          <div className="mt-4 flex min-h-10 flex-wrap gap-1.5 rounded-xl bg-[#f6f7fa] p-2.5">
                            {automation.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                                style={{
                                  backgroundColor: safeColor(tag.color),
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 grid grid-cols-2 divide-x divide-[#e8ebf1]">
                            <div>
                              <p className="text-[10px] text-[#9299aa]">
                                총 자동화 적용 건수
                              </p>
                              <strong className="mt-1 block text-lg">
                                {automation.appliedCount.toLocaleString(
                                  "ko-KR",
                                )}
                                건
                              </strong>
                            </div>
                            <div className="pl-4">
                              <p className="text-[10px] text-[#9299aa]">
                                메시지 전송 건수
                              </p>
                              <strong className="mt-1 block text-lg">
                                {automation.sentCount.toLocaleString("ko-KR")}건
                              </strong>
                            </div>
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#edf0f4] pt-4">
                            <button
                              type="button"
                              onClick={() => openEditor(automation)}
                              className="flex items-center justify-center gap-1 rounded-lg border border-[#dce1eb] py-2 text-xs font-bold text-[#697187]"
                            >
                              <Pencil className="size-3.5" /> 수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteAutomation(automation)}
                              className="flex items-center justify-center gap-1 rounded-lg border border-[#dce1eb] py-2 text-xs font-bold text-[#9a6570]"
                            >
                              <Trash2 className="size-3.5" /> 삭제
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-80 flex-col items-center justify-center text-[#939aac]">
                      <Workflow className="mb-3 size-9" />
                      <p className="text-sm font-bold">
                        {query
                          ? "검색 결과가 없습니다."
                          : "등록된 상담자동화가 없습니다."}
                      </p>
                    </div>
                  )}
                </main>
              </>
            ) : (
              <AutomationManagementDashboardView
                initialDashboard={initialManagementDashboard}
              />
            )}
          </section>
        </div>
      )}

      {messageDraft ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#20243a]/35 p-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#30364a]">
                {messageDraft.index === null ? "메시지 추가" : "메시지 편집"}
              </h2>
              <button
                type="button"
                onClick={() => setMessageDraft(null)}
                className="rounded-lg p-2 text-[#8a91a2] hover:bg-[#f3f4f7]"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-[110px_1fr] gap-3">
              <label>
                <span className="mb-2 block text-xs font-bold text-[#596176]">
                  발송일 D+
                </span>
                <input
                  type="number"
                  min={0}
                  value={messageDraft.dayOffset}
                  onChange={(event) =>
                    setMessageDraft({
                      ...messageDraft,
                      dayOffset: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] px-3 outline-none focus:border-[#7187f6]"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[#596176]">
                  단계명
                </span>
                <input
                  value={messageDraft.title}
                  onChange={(event) =>
                    setMessageDraft({
                      ...messageDraft,
                      title: event.target.value,
                    })
                  }
                  placeholder="예) 경과 안내"
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] px-3 outline-none focus:border-[#7187f6]"
                />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold text-[#596176]">
                메시지 내용
              </span>
              <textarea
                rows={9}
                maxLength={4000}
                value={messageDraft.content}
                onChange={(event) =>
                  setMessageDraft({
                    ...messageDraft,
                    content: event.target.value,
                  })
                }
                placeholder="고객에게 발송할 메시지를 입력해 주세요."
                className="w-full resize-none rounded-xl border border-[#dfe3ec] p-4 text-sm leading-6 outline-none focus:border-[#7187f6]"
              />
            </label>
            <div className="mt-6 flex justify-between">
              {messageDraft.index !== null ? (
                <button
                  type="button"
                  onClick={deleteMessageDraft}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e0a5af] px-4 text-sm font-bold text-[#d8465b]"
                >
                  <Trash2 className="size-4" /> 삭제
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMessageDraft(null)}
                  className="h-10 rounded-xl border border-[#d8dde8] px-4 text-sm font-bold text-[#687086]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveMessageDraft}
                  className="h-10 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UnsavedChangesDialog
        open={Boolean(pendingExit)}
        position="absolute"
        onConfirm={confirmExit}
        onCancel={() => setPendingExit(null)}
      />

      {toast ? (
        <div
          role="status"
          className="absolute bottom-10 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#5c5f66] px-6 py-4 text-sm font-bold text-white shadow-xl"
        >
          <CircleAlert className="size-5 fill-[#ffd633] text-[#5c5f66]" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
