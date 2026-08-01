"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Info,
  LoaderCircle,
  Plus,
  Save,
  Settings2,
  Trash2,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/components/use-unsaved-changes-guard";
import { useServiceNavigation } from "@/features/navigation/service-navigation-context";
import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";
import type {
  AutomationTagSelectionMode,
  BasicServiceSettings,
  CustomerInputFieldKey,
  TreatmentTagSetting,
} from "@/features/settings/service-settings-types";

const inputFieldDefinitions: Array<{
  key: CustomerInputFieldKey;
  label: string;
}> = [
  { key: "chartNumber", label: "차트번호" },
  { key: "visitType", label: "초진/재진" },
  { key: "countryCode", label: "국가번호" },
  { key: "birthDate", label: "생년월일" },
  { key: "gender", label: "성별" },
  { key: "treatmentTag", label: "치료태그" },
  { key: "nationality", label: "국적" },
  { key: "marketingConsent", label: "광고성메시지 수신여부" },
];

const tagColors = [
  "#1687F8",
  "#3157F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#64748B",
];

function cloneSettings(settings: BasicServiceSettings): BasicServiceSettings {
  return {
    ...settings,
    inputFields: { ...settings.inputFields },
    treatmentTags: settings.treatmentTags.map((tag) => ({ ...tag })),
  };
}

function SettingsSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#1687f8]" : "bg-[#c8cdd6]"
      }`}
    >
      <span
        className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef5ff] text-[#1687f8]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-base font-extrabold text-[#30374a]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#9299aa]">{description}</p>
      </div>
    </div>
  );
}

export function BasicSettingsClient({
  initialSettings,
}: {
  initialSettings: BasicServiceSettings;
}) {
  const { setAppointmentManagementEnabled } = useServiceNavigation();
  const savedAppointmentManagementEnabled = useRef(
    initialSettings.appointmentManagementEnabled,
  );
  const [settings, setSettings] = useState(() =>
    cloneSettings(initialSettings),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialSettings),
  );
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColors[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const hasPendingTag = Boolean(newTagName.trim());
  const isDirty =
    JSON.stringify(settings) !== savedSnapshot || Boolean(newTagName.trim());
  const navigationGuard = useUnsavedChangesGuard(isDirty);
  const normalizedNames = useMemo(
    () => new Set(settings.treatmentTags.map((tag) => tag.name.toLowerCase())),
    [settings.treatmentTags],
  );

  useEffect(
    () => () => {
      setAppointmentManagementEnabled(
        savedAppointmentManagementEnabled.current,
      );
    },
    [setAppointmentManagementEnabled],
  );

  function resetFeedback() {
    setNotice("");
    setError("");
  }

  function updateInputField(key: CustomerInputFieldKey, checked: boolean) {
    setSettings((current) => ({
      ...current,
      inputFields: { ...current.inputFields, [key]: checked },
    }));
    resetFeedback();
  }

  function updateTag(id: string, update: Partial<TreatmentTagSetting>) {
    setSettings((current) => ({
      ...current,
      treatmentTags: current.treatmentTags.map((tag) =>
        tag.id === id ? { ...tag, ...update } : tag,
      ),
    }));
    resetFeedback();
  }

  function addTag() {
    const name = newTagName.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (normalizedNames.has(name.toLowerCase())) {
      setError("같은 이름의 치료태그가 이미 있습니다.");
      return;
    }
    setSettings((current) => ({
      ...current,
      treatmentTags: [
        ...current.treatmentTags,
        {
          id: `new-${crypto.randomUUID()}`,
          name,
          color: newTagColor,
          assignmentCount: 0,
          automationCount: 0,
        },
      ],
    }));
    setNewTagName("");
    setNewTagColor(
      tagColors[(settings.treatmentTags.length + 1) % tagColors.length],
    );
    resetFeedback();
  }

  function removeTag(tag: TreatmentTagSetting) {
    if (tag.assignmentCount > 0 || tag.automationCount > 0) return;
    setSettings((current) => ({
      ...current,
      treatmentTags: current.treatmentTags.filter((item) => item.id !== tag.id),
    }));
    resetFeedback();
  }

  async function saveSettings() {
    if (isSaving) return;
    const pendingName = newTagName.trim().replace(/\s+/g, " ");
    if (pendingName && normalizedNames.has(pendingName.toLowerCase())) {
      setError("같은 이름의 치료태그가 이미 있습니다.");
      return;
    }
    const treatmentTags = pendingName
      ? [
          ...settings.treatmentTags,
          {
            id: `new-${crypto.randomUUID()}`,
            name: pendingName,
            color: newTagColor,
            assignmentCount: 0,
            automationCount: 0,
          },
        ]
      : settings.treatmentTags;
    if (treatmentTags.some((tag) => !tag.name.trim())) {
      setError("치료태그명을 입력해 주세요.");
      return;
    }
    if (
      !Number.isInteger(settings.autoResponseContextMessageCount) ||
      settings.autoResponseContextMessageCount < 1 ||
      settings.autoResponseContextMessageCount > 50
    ) {
      setError("최근 대화 윈도우는 1~50턴 사이로 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    resetFeedback();
    try {
      const response = await fetch("/api/settings/basic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputFields: settings.inputFields,
          automationTagSelectionMode: settings.automationTagSelectionMode,
          autoResponseContextEnabled: settings.autoResponseContextEnabled,
          autoResponseContextMessageCount:
            settings.autoResponseContextMessageCount,
          appointmentManagementEnabled: settings.appointmentManagementEnabled,
          treatmentTags: treatmentTags.map(({ id, name, color }) => ({
            id,
            name,
            color,
          })),
        }),
      });
      const result = (await response.json()) as {
        settings?: BasicServiceSettings;
        error?: string;
      };
      if (!response.ok || !result.settings) {
        throw new Error(
          result.error ?? "서비스 기본설정을 저장하지 못했습니다.",
        );
      }
      const nextSettings = cloneSettings(result.settings);
      savedAppointmentManagementEnabled.current =
        nextSettings.appointmentManagementEnabled;
      setAppointmentManagementEnabled(
        nextSettings.appointmentManagementEnabled,
      );
      setSettings(nextSettings);
      setSavedSnapshot(JSON.stringify(nextSettings));
      setNewTagName("");
      setNotice("서비스 기본설정을 저장했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "서비스 기본설정을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef5ff] text-[#1687f8]">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                기본설정
              </h1>
              <p className="mt-0.5 text-xs text-[#9299a9]">
                고객입력과 자동화, 예약관리의 기본 동작을 설정합니다.
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[1100px] space-y-6">
            {notice || error ? (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-[#fff0f2] text-[#c64558]"
                    : "bg-[#edf8f2] text-[#34805b]"
                }`}
              >
                {error ? (
                  <Info className="size-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0" />
                )}
                {error || notice}
              </div>
            ) : null}

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-start justify-between gap-6">
                <SectionHeading
                  icon={Settings2}
                  title="입력정보 관리"
                  description="고객입력 > 고객정보 입력에서 일괄 입력할 항목을 켜고 끌 수 있습니다. 고객명과 휴대폰번호는 필수 항목입니다."
                />
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9299aa]">
                  필수 입력 여부 안내 <CircleHelp className="size-4" />
                </span>
              </div>
              <div className="mt-7 grid grid-cols-4 gap-3">
                {inputFieldDefinitions.map((field) => (
                  <div
                    key={field.key}
                    className="flex h-14 items-center justify-between rounded-xl border border-[#dfe4ec] bg-white px-4"
                  >
                    <span className="text-sm font-bold text-[#596176]">
                      {field.label}
                    </span>
                    <SettingsSwitch
                      checked={settings.inputFields[field.key]}
                      label={`${field.label} 입력 사용`}
                      onChange={(checked) =>
                        updateInputField(field.key, checked)
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <SectionHeading
                icon={Workflow}
                title="상담자동화 적용 방식"
                description="고객에게 치료태그가 여러 개 입력됐을 때 동작할 상담자동화의 범위를 정합니다."
              />
              <div className="mt-6 space-y-3">
                {(
                  [
                    {
                      value: "FIRST",
                      title: "첫 번째로 입력된 치료태그만 상담자동화 적용",
                      description:
                        "치료태그가 2개 이상이면 가장 먼저 입력된 태그의 자동화만 적용합니다.",
                    },
                    {
                      value: "ALL",
                      title: "입력된 모든 치료태그로 상담자동화 적용",
                      description:
                        "입력된 각 치료태그에 연결된 모든 상담자동화를 적용합니다.",
                    },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 transition ${
                      settings.automationTagSelectionMode === option.value
                        ? "border-[#9ac9f7] bg-[#f4f9ff]"
                        : "border-[#e4e7ed] hover:bg-[#fafbfc]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="automationTagSelectionMode"
                      value={option.value}
                      checked={
                        settings.automationTagSelectionMode === option.value
                      }
                      onChange={() => {
                        setSettings((current) => ({
                          ...current,
                          automationTagSelectionMode:
                            option.value as AutomationTagSelectionMode,
                        }));
                        resetFeedback();
                      }}
                      className="mt-1 size-5 accent-[#1687f8]"
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-[#4d5569]">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-xs text-[#9299aa]">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div
                className={`mt-5 flex items-center justify-between gap-6 rounded-xl border p-5 transition-colors ${
                  settings.autoResponseContextEnabled
                    ? "border-[#cfe0f6] bg-[#f6faff]"
                    : "border-[#e4e7ed] bg-[#f8f9fb]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#4d5569]">
                        최근 대화 윈도우 사용
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#9299aa]">
                        상담자동화가 답변을 만들 때 최근 대화를 함께 참고합니다.
                      </p>
                    </div>
                    <SettingsSwitch
                      checked={settings.autoResponseContextEnabled}
                      label="최근 대화 윈도우 사용"
                      onChange={(checked) => {
                        setSettings((current) => ({
                          ...current,
                          autoResponseContextEnabled: checked,
                        }));
                        resetFeedback();
                      }}
                    />
                  </div>
                </div>

                <label className="shrink-0">
                  <span className="text-xs font-bold text-[#697084]">
                    최근 대화 턴 수
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      disabled={!settings.autoResponseContextEnabled}
                      value={settings.autoResponseContextMessageCount}
                      onChange={(event) => {
                        setSettings((current) => ({
                          ...current,
                          autoResponseContextMessageCount: Number(
                            event.target.value,
                          ),
                        }));
                        resetFeedback();
                      }}
                      className="h-10 w-24 rounded-xl border border-[#d9deea] bg-white px-3 text-sm font-semibold outline-none focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10 disabled:cursor-not-allowed disabled:bg-[#eef0f4] disabled:text-[#9ba1af]"
                    />
                    <span className="text-sm font-semibold text-[#777f93]">
                      턴
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-center justify-between gap-6">
                <SectionHeading
                  icon={CalendarDays}
                  title="예약관리 사용"
                  description="비활성화하면 좌측 서비스 메뉴에서 예약관리 화면이 숨겨집니다."
                />
                <SettingsSwitch
                  checked={settings.appointmentManagementEnabled}
                  label="예약관리 사용"
                  onChange={(checked) => {
                    setAppointmentManagementEnabled(checked);
                    setSettings((current) => ({
                      ...current,
                      appointmentManagementEnabled: checked,
                    }));
                    resetFeedback();
                  }}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-end justify-between gap-6">
                <SectionHeading
                  icon={Workflow}
                  title="치료태그"
                  description="등록된 치료태그를 고객입력, 상담자동화 및 원내매뉴얼에서 함께 사용합니다."
                />
                <span className="text-xs font-bold text-[#7d8497]">
                  {settings.treatmentTags.length} / 50
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-xl border border-[#dfe3ea] px-3 focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(event) => setNewTagColor(event.target.value)}
                    aria-label="새 치료태그 색상"
                    className="absolute left-3 size-6 cursor-pointer opacity-0"
                  />
                  <span
                    className="mr-3 size-5 shrink-0 rounded-full ring-2 ring-white shadow"
                    style={{ backgroundColor: newTagColor }}
                  />
                  <input
                    value={newTagName}
                    maxLength={30}
                    onChange={(event) => {
                      setNewTagName(event.target.value);
                      resetFeedback();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="새로운 치료태그를 입력해 주세요."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b6c2]"
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    !newTagName.trim() || settings.treatmentTags.length >= 50
                  }
                  onClick={addTag}
                  className="flex h-11 items-center gap-2 rounded-xl bg-[#1687f8] px-6 text-sm font-bold text-white disabled:bg-[#c9ced8]"
                >
                  <Plus className="size-4" /> 추가
                </button>
              </div>

              <div className="mt-5 space-y-2.5">
                {settings.treatmentTags.length > 0 ? (
                  settings.treatmentTags.map((tag) => {
                    const inUse =
                      tag.assignmentCount > 0 || tag.automationCount > 0;
                    return (
                      <div
                        key={tag.id}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e0e4eb] px-3 py-2"
                      >
                        <label className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#f7f8fa]">
                          <input
                            type="color"
                            value={tag.color}
                            onChange={(event) =>
                              updateTag(tag.id, { color: event.target.value })
                            }
                            aria-label={`${tag.name} 색상`}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                          <span
                            className="size-5 rounded-full shadow-sm"
                            style={{ backgroundColor: tag.color }}
                          />
                        </label>
                        <input
                          value={tag.name}
                          maxLength={30}
                          onChange={(event) =>
                            updateTag(tag.id, { name: event.target.value })
                          }
                          aria-label="치료태그명"
                          className="h-9 min-w-0 flex-1 rounded-lg px-2 text-sm font-bold text-[#4d5569] outline-none focus:bg-[#f7f9ff] focus:ring-2 focus:ring-[#7187f6]/25"
                        />
                        {inUse ? (
                          <span className="shrink-0 text-[11px] font-semibold text-[#9299aa]">
                            고객 {tag.assignmentCount.toLocaleString("ko-KR")}명
                            {tag.automationCount > 0
                              ? ` · 자동화 ${tag.automationCount}개`
                              : ""}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={inUse}
                          title={
                            inUse
                              ? "고객 또는 상담자동화에서 사용 중인 태그는 삭제할 수 없습니다."
                              : "치료태그 삭제"
                          }
                          aria-label={`${tag.name} 삭제`}
                          onClick={() => removeTag(tag)}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#e2d7da] px-3 text-xs font-bold text-[#c64558] hover:bg-[#fff4f5] disabled:cursor-not-allowed disabled:border-[#e5e7eb] disabled:text-[#b7bcc6]"
                        >
                          <Trash2 className="size-3.5" /> 삭제
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#dce1ea] bg-[#fafbfc] text-[#9ba2b1]">
                    <Workflow className="size-6" />
                    <p className="mt-2 text-xs font-bold">
                      등록된 치료태그가 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>

        <footer className="flex h-[72px] shrink-0 items-center justify-end gap-4 border-t border-[#dfe4ec] bg-white px-8">
          {hasPendingTag ? (
            <span className="text-xs text-[#9299aa]">
              입력 중인 태그도 저장 시 함께 추가됩니다.
            </span>
          ) : null}
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={() => void saveSettings()}
            className="flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-[#1687f8] px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#c9ced8]"
          >
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSaving ? "저장 중" : "저장"}
          </button>
        </footer>
      </section>

      <UnsavedChangesDialog
        open={navigationGuard.dialogOpen}
        position="absolute"
        onConfirm={navigationGuard.confirmExit}
        onCancel={navigationGuard.cancelExit}
      />
    </div>
  );
}
