"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  LoaderCircle,
  MessageCircleMore,
  Link2,
  Save,
  Tag,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  TreatmentTagPicker,
  type TreatmentTagOption,
} from "./treatment-tag-picker";

type PatientDetail = {
  id: string;
  name: string;
  chartNumber: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  visitType: string;
  nationality: string;
  marketingConsent: boolean;
  notes: string;
  managementNotes: string;
  treatmentTags: string[];
  createdAt: string;
  updatedAt: string;
  channels: Array<{
    id: string;
    channel: string;
    displayName: string | null;
    externalCustomerId: string;
    phone: string | null;
    isPrimary: boolean;
    linkMethod: "AUTO" | "MANUAL" | null;
    linkedAt: string | null;
  }>;
  conversations: Array<{
    id: string;
    patientChannelId: string | null;
    channel: string;
    status: string;
    lastMessageAt: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-2 block text-xs font-bold text-[#5e667a]">
      {children}
      {required ? <span className="ml-0.5 text-[#e34e61]">*</span> : null}
    </span>
  );
}

export function CustomerDetailClient({
  initialPatient,
  availableTreatmentTags,
}: {
  initialPatient: PatientDetail;
  availableTreatmentTags: TreatmentTagOption[];
}) {
  const [draft, setDraft] = useState(initialPatient);
  const [savedSnapshot, setSavedSnapshot] = useState(initialPatient);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(initialPatient.updatedAt);
  const [pendingChannelId, setPendingChannelId] = useState("");
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSnapshot),
    [draft, savedSnapshot],
  );

  function updateDraft<Key extends keyof PatientDetail>(
    key: Key,
    value: PatientDetail[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setError("");
  }

  async function saveDetails() {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          chartNumber: draft.chartNumber,
          phone: draft.phone,
          email: draft.email,
          birthDate: draft.birthDate,
          gender: draft.gender,
          visitType: draft.visitType,
          nationality: draft.nationality,
          marketingConsent: draft.marketingConsent,
          notes: draft.notes,
          managementNotes: draft.managementNotes,
          treatmentTags: draft.treatmentTags,
        }),
      });
      const result = (await response.json()) as {
        patient?: { updatedAt: string };
        error?: string;
      };
      if (!response.ok || !result.patient) {
        throw new Error(result.error ?? "고객 상세정보를 저장하지 못했습니다.");
      }

      setSavedSnapshot(draft);
      setLastSavedAt(result.patient.updatedAt);
      setSaveState("saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "고객 상세정보를 저장하지 못했습니다.",
      );
      setSaveState("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePrimaryChannel(channelId: string) {
    if (pendingChannelId) return;
    setPendingChannelId(channelId);
    setError("");

    try {
      const response = await fetch(
        `/api/patients/${draft.id}/channels/${channelId}`,
        { method: "PATCH" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "대표 계정을 변경하지 못했습니다.");
      }

      const updateChannels = (patient: PatientDetail) => ({
        ...patient,
        channels: patient.channels.map((channel) => ({
          ...channel,
          isPrimary: channel.id === channelId,
        })),
      });
      setDraft(updateChannels);
      setSavedSnapshot(updateChannels);
      setSaveState("saved");
    } catch (channelError) {
      setError(
        channelError instanceof Error
          ? channelError.message
          : "대표 계정을 변경하지 못했습니다.",
      );
    } finally {
      setPendingChannelId("");
    }
  }

  async function unlinkChannel(channelId: string) {
    if (pendingChannelId) return;
    setPendingChannelId(channelId);
    setError("");

    try {
      const response = await fetch(
        `/api/patients/${draft.id}/channels/${channelId}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "채팅 계정 연동을 해제하지 못했습니다.");
      }

      const updateChannels = (patient: PatientDetail) => {
        const channels = patient.channels.filter(
          (channel) => channel.id !== channelId,
        );
        if (channels.length > 0 && !channels.some((channel) => channel.isPrimary)) {
          channels[0] = { ...channels[0], isPrimary: true };
        }
        return {
          ...patient,
          channels,
          conversations: patient.conversations.filter(
            (conversation) => conversation.patientChannelId !== channelId,
          ),
        };
      };
      setDraft(updateChannels);
      setSavedSnapshot(updateChannels);
      setSaveState("saved");
    } catch (channelError) {
      setError(
        channelError instanceof Error
          ? channelError.message
          : "채팅 계정 연동을 해제하지 못했습니다.",
      );
    } finally {
      setPendingChannelId("");
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1280px] flex-col bg-white">
      <header className="flex h-[70px] shrink-0 items-center gap-3 border-b border-[#e5e8ef] px-6">
        <Link
          href="/service/customers"
          aria-label="고객 목록으로 돌아가기"
          className="flex size-9 items-center justify-center rounded-xl border border-[#dfe3ec] text-[#747b8f] hover:bg-[#f7f8fb]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
            {draft.name}님의 상세정보
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[#8e95a7]">
            {draft.chartNumber || "차트번호 미등록"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-[#9399a9]">
          <Clock3 className="size-4" />
          최근 저장 {formatDateTime(lastSavedAt)}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#fbfbfc] p-6">
          <section className="grid min-h-[260px] grid-cols-3 gap-5 rounded-3xl bg-[#f4f5f8] p-5">
            <div className="flex flex-col rounded-2xl bg-white p-5">
              <h2 className="text-sm font-extrabold text-[#41485d]">상담자동화</h2>
              <p className="mt-1 text-xs text-[#969daf]">
                고객에게 적용된 상담자동화가 표시됩니다.
              </p>
              <div className="flex flex-1 flex-col items-center justify-center text-[#a2a8b7]">
                <TriangleAlert className="size-8" />
                <p className="mt-3 text-xs font-semibold">
                  적용된 상담자동화가 없습니다.
                </p>
              </div>
            </div>

            <label className="flex flex-col rounded-2xl bg-white p-5">
              <h2 className="text-sm font-extrabold text-[#41485d]">상담메모</h2>
              <p className="mt-1 text-xs text-[#969daf]">
                채팅에서도 함께 확인되는 고객 메모입니다.
              </p>
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                maxLength={5_000}
                placeholder="상담 중 확인할 메모를 입력해 주세요."
                className="mt-4 min-h-32 flex-1 resize-none rounded-xl border border-[#dfe3ec] p-3 text-sm leading-6 outline-none focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10"
              />
            </label>

            <label className="flex flex-col rounded-2xl bg-white p-5">
              <h2 className="text-sm font-extrabold text-[#41485d]">관리방향</h2>
              <p className="mt-1 text-xs text-[#969daf]">
                원장님의 관리 지시사항을 입력할 수 있습니다.
              </p>
              <textarea
                value={draft.managementNotes}
                onChange={(event) =>
                  updateDraft("managementNotes", event.target.value)
                }
                maxLength={2_000}
                placeholder="고객 관리방향을 입력해 주세요."
                className="mt-4 min-h-32 flex-1 resize-none rounded-xl border border-[#dfe3ec] p-3 text-sm leading-6 outline-none focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10"
              />
            </label>
          </section>

          <section className="mt-6 grid min-h-[310px] grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="rounded-2xl border border-[#e3e6ed] bg-white p-5">
              <div className="flex items-center gap-2">
                <Link2 className="size-5 text-[#3157f6]" />
                <h2 className="text-sm font-extrabold text-[#41485d]">
                  연결된 채팅 계정
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#969daf]">
                대표 계정은 고객 조회와 기본 프로필 표시에 사용됩니다.
              </p>
              <div className="mt-4 space-y-2">
                {draft.channels.length > 0 ? (
                  draft.channels.map((channelAccount) => (
                    <div
                      key={channelAccount.id}
                      className={`rounded-xl border p-3 ${
                        channelAccount.isPrimary
                          ? "border-[#9dacf5] bg-[#f3f6ff]"
                          : "border-[#e1e5ed] bg-[#fafbfc]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void updatePrimaryChannel(channelAccount.id)
                          }
                          disabled={
                            channelAccount.isPrimary || Boolean(pendingChannelId)
                          }
                          aria-label={`${channelAccount.displayName ?? channelAccount.channel} 대표 계정 설정`}
                          className={`mt-0.5 flex size-5 items-center justify-center rounded-full border-2 ${
                            channelAccount.isPrimary
                              ? "border-[#3157f6]"
                              : "border-[#b8bfce]"
                          }`}
                        >
                          {channelAccount.isPrimary ? (
                            <span className="size-2.5 rounded-full bg-[#3157f6]" />
                          ) : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#41485d]">
                              {channelAccount.channel}
                            </span>
                            {channelAccount.isPrimary ? (
                              <span className="rounded-full bg-[#3157f6] px-2 py-0.5 text-[9px] font-bold text-white">
                                대표
                              </span>
                            ) : null}
                            <span className="text-[9px] font-bold text-[#8e95a7]">
                              {channelAccount.linkMethod === "AUTO"
                                ? "자동 연동"
                                : "수동 연동"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-[#5f677b]">
                            {channelAccount.displayName ?? "닉네임 미등록"}
                          </p>
                          <p className="mt-1 truncate font-mono text-[10px] text-[#969daf]">
                            {channelAccount.phone ??
                              channelAccount.externalCustomerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {draft.conversations.find(
                            (conversation) =>
                              conversation.patientChannelId === channelAccount.id,
                          ) ? (
                            <Link
                              href={`/service/chatting?conversation=${draft.conversations.find((conversation) => conversation.patientChannelId === channelAccount.id)!.id}`}
                              aria-label="채팅으로 이동"
                              className="flex size-8 items-center justify-center rounded-lg text-[#7d8497] hover:bg-white hover:text-[#3157f6]"
                            >
                              <MessageCircleMore className="size-4" />
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void unlinkChannel(channelAccount.id)}
                            disabled={Boolean(pendingChannelId)}
                            aria-label="채팅 계정 연동 해제"
                            className="flex size-8 items-center justify-center rounded-lg text-[#9aa0af] hover:bg-white hover:text-[#d8465b] disabled:opacity-50"
                          >
                            {pendingChannelId === channelAccount.id ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center text-center text-[#a0a6b4]">
                    <Link2 className="size-7" />
                    <p className="mt-3 text-xs">연결된 채팅 계정이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e6ed] bg-white p-5">
              <div className="flex items-center gap-2">
                <Tag className="size-5 text-[#3157f6]" />
                <h2 className="text-sm font-extrabold text-[#41485d]">
                  치료태그 입력정보
                </h2>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#e3e6ed]">
                <div className="grid grid-cols-[180px_1fr_150px] bg-[#f2f4fb] px-4 py-3 text-xs font-bold text-[#5e667a]">
                  <span>최근 변경</span>
                  <span>치료태그</span>
                  <span>입력 경로</span>
                </div>
                <div className="grid grid-cols-[180px_1fr_150px] items-center px-4 py-4 text-xs text-[#737b8e]">
                  <span>{formatDateTime(lastSavedAt)}</span>
                  <span className="font-semibold text-[#3157f6]">
                    {draft.treatmentTags.length > 0
                      ? draft.treatmentTags.join(", ")
                      : "입력된 치료태그 없음"}
                  </span>
                  <span>고객 상세정보</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="flex w-[380px] shrink-0 flex-col border-l border-[#e3e6ed] bg-[#f7f7f8]">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <label className="block">
              <FieldLabel required>고객명</FieldLabel>
              <input
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <FieldLabel>차트번호</FieldLabel>
                <input
                  value={draft.chartNumber}
                  onChange={(event) =>
                    updateDraft("chartNumber", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
                />
              </label>
              <label>
                <FieldLabel>초/재진</FieldLabel>
                <select
                  value={draft.visitType}
                  onChange={(event) =>
                    updateDraft("visitType", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
                >
                  <option value="">선택</option>
                  <option value="NEW">초진</option>
                  <option value="RETURNING">재진</option>
                </select>
              </label>
            </div>

            <label className="block">
              <FieldLabel required>휴대폰번호</FieldLabel>
              <input
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
                inputMode="tel"
                className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <FieldLabel>생년월일</FieldLabel>
                <input
                  type="date"
                  value={draft.birthDate}
                  onChange={(event) =>
                    updateDraft("birthDate", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
                />
              </label>
              <label>
                <FieldLabel>성별</FieldLabel>
                <select
                  value={draft.gender}
                  onChange={(event) => updateDraft("gender", event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
                >
                  <option value="">선택</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </label>
            </div>

            <label className="block">
              <FieldLabel>이메일</FieldLabel>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                placeholder="customer@example.com"
                className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
              />
            </label>

            <label className="block">
              <FieldLabel>국적</FieldLabel>
              <input
                value={draft.nationality}
                onChange={(event) =>
                  updateDraft("nationality", event.target.value)
                }
                placeholder="예) 대한민국"
                className="h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm outline-none focus:border-[#7187f6]"
              />
            </label>

            <div>
              <FieldLabel>치료태그</FieldLabel>
              <TreatmentTagPicker
                options={availableTreatmentTags}
                selectedNames={draft.treatmentTags}
                onChange={(names) => updateDraft("treatmentTags", names)}
                placement="top"
              />
            </div>

            <fieldset className="border-t border-[#dfe3ec] pt-4">
              <legend className="text-xs font-bold text-[#5e667a]">
                광고성메시지 수신동의
              </legend>
              <div className="mt-3 flex gap-5 text-sm text-[#555d72]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="marketing-consent"
                    checked={draft.marketingConsent}
                    onChange={() => updateDraft("marketingConsent", true)}
                    className="size-4 accent-[#3157f6]"
                  />
                  동의함
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="marketing-consent"
                    checked={!draft.marketingConsent}
                    onChange={() => updateDraft("marketingConsent", false)}
                    className="size-4 accent-[#3157f6]"
                  />
                  동의 안함
                </label>
              </div>
            </fieldset>
          </div>

          <footer className="shrink-0 border-t border-[#dde1e9] bg-white p-5">
            {error ? (
              <p role="alert" className="mb-3 text-xs font-bold text-[#d8465b]">
                {error}
              </p>
            ) : saveState === "saved" ? (
              <p className="mb-3 flex items-center gap-1 text-xs font-bold text-[#15945d]">
                <Check className="size-4" /> 고객 상세정보를 저장했습니다.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void saveDetails()}
              disabled={!isDirty || isSaving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3157f6] text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d8dce6]"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSaving ? "저장 중" : "저장"}
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
}
