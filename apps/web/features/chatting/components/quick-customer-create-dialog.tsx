"use client";

import { LoaderCircle, UserPlus, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  TreatmentTagPicker,
  type TreatmentTagOption,
} from "@/features/customers/components/treatment-tag-picker";
import type { BasicServiceSettings } from "@/features/settings/service-settings-types";
import {
  phoneCountryOptions,
  type PhoneCountryCode,
} from "@/lib/phone-country";

export type QuickCreatedCustomer = {
  id: string;
  chartNumber: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthDate: string | null;
};

type CustomerDraft = {
  name: string;
  phone: string;
  phoneCountryCode: PhoneCountryCode;
  chartNumber: string;
  visitType: "" | "NEW" | "RETURNING";
  birthDate: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  treatmentTags: string[];
  nationality: string;
  marketingConsent: boolean;
};

const initialDraft: CustomerDraft = {
  name: "",
  phone: "",
  phoneCountryCode: "+82",
  chartNumber: "",
  visitType: "",
  birthDate: "",
  gender: "",
  treatmentTags: [],
  nationality: "",
  marketingConsent: false,
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-sm text-[#30364b] outline-none transition placeholder:text-[#aab0bf] focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-bold text-[#596176]">
      {children}
    </span>
  );
}

export function QuickCustomerCreateDialog({
  inputFields,
  treatmentTags,
  onClose,
  onCreated,
}: {
  inputFields: BasicServiceSettings["inputFields"];
  treatmentTags: TreatmentTagOption[];
  onClose: () => void;
  onCreated: (patient: QuickCreatedCustomer) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() =>
      nameInputRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        event.stopImmediatePropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onClose]);

  function updateDraft<K extends keyof CustomerDraft>(
    field: K,
    value: CustomerDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (!draft.name.trim() || !draft.phone.trim()) {
      setError("고객명과 휴대폰번호를 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patients: [draft] }),
      });
      const result = (await response.json()) as {
        patients?: QuickCreatedCustomer[];
        error?: string;
      };
      const patient = result.patients?.[0];

      if (!response.ok || !patient) {
        throw new Error(result.error ?? "고객 정보를 등록하지 못했습니다.");
      }

      onCreated(patient);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "고객 정보를 등록하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1f2433]/50 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <form
        onSubmit={(event) => void createCustomer(event)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-customer-create-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#e2e5eb] bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-[#e7eaf0] px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <UserPlus className="size-4.5" />
            </span>
            <div>
              <h2
                id="quick-customer-create-title"
                className="text-base font-bold tracking-[-0.02em] text-[#30374a]"
              >
                새 고객입력
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#858c9d]">
                병원 고객입력 설정에 맞춰 고객 정보를 간편 등록합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="새 고객입력 닫기"
            className="flex size-9 items-center justify-center rounded-lg text-[#778095] transition hover:bg-[#f5f6f8] disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <FieldLabel>
                고객명 <span className="text-[#d8465b]">*</span>
              </FieldLabel>
              <input
                ref={nameInputRef}
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="고객명을 입력해 주세요."
                disabled={isSaving}
                className={fieldClassName}
              />
            </label>

            <label>
              <FieldLabel>
                휴대폰번호 <span className="text-[#d8465b]">*</span>
              </FieldLabel>
              <div className="flex h-11 overflow-hidden rounded-xl border border-[#dfe3ec] bg-white transition focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                {inputFields.countryCode ? (
                  <select
                    value={draft.phoneCountryCode}
                    onChange={(event) =>
                      updateDraft(
                        "phoneCountryCode",
                        event.target.value as PhoneCountryCode,
                      )
                    }
                    aria-label="휴대폰 국가번호"
                    disabled={isSaving}
                    className="w-[112px] shrink-0 border-r border-[#e1e5ed] bg-transparent px-2 text-xs font-semibold text-[#657087] outline-none"
                  >
                    {phoneCountryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} {option.label.split(" (")[0]}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  placeholder="01012345678"
                  inputMode="tel"
                  disabled={isSaving}
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#30364b] outline-none placeholder:text-[#aab0bf]"
                />
              </div>
            </label>

            {inputFields.chartNumber ? (
              <label>
                <FieldLabel>차트번호</FieldLabel>
                <input
                  value={draft.chartNumber}
                  onChange={(event) =>
                    updateDraft("chartNumber", event.target.value)
                  }
                  placeholder="차트번호를 입력해 주세요."
                  disabled={isSaving}
                  className={fieldClassName}
                />
              </label>
            ) : null}

            {inputFields.visitType ? (
              <label>
                <FieldLabel>초/재진</FieldLabel>
                <select
                  value={draft.visitType}
                  onChange={(event) =>
                    updateDraft(
                      "visitType",
                      event.target.value as CustomerDraft["visitType"],
                    )
                  }
                  disabled={isSaving}
                  className={fieldClassName}
                >
                  <option value="">선택</option>
                  <option value="NEW">초진</option>
                  <option value="RETURNING">재진</option>
                </select>
              </label>
            ) : null}

            {inputFields.birthDate ? (
              <label>
                <FieldLabel>생년월일</FieldLabel>
                <input
                  type="date"
                  value={draft.birthDate}
                  onChange={(event) =>
                    updateDraft("birthDate", event.target.value)
                  }
                  disabled={isSaving}
                  className={fieldClassName}
                />
              </label>
            ) : null}

            {inputFields.gender ? (
              <label>
                <FieldLabel>성별</FieldLabel>
                <select
                  value={draft.gender}
                  onChange={(event) =>
                    updateDraft(
                      "gender",
                      event.target.value as CustomerDraft["gender"],
                    )
                  }
                  disabled={isSaving}
                  className={fieldClassName}
                >
                  <option value="">선택</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </label>
            ) : null}

            {inputFields.nationality ? (
              <label>
                <FieldLabel>국적</FieldLabel>
                <input
                  value={draft.nationality}
                  onChange={(event) =>
                    updateDraft("nationality", event.target.value)
                  }
                  placeholder="예) 대한민국"
                  disabled={isSaving}
                  className={fieldClassName}
                />
              </label>
            ) : null}

            {inputFields.marketingConsent ? (
              <label>
                <FieldLabel>광고성메시지 수신동의</FieldLabel>
                <select
                  value={draft.marketingConsent ? "YES" : "NO"}
                  onChange={(event) =>
                    updateDraft(
                      "marketingConsent",
                      event.target.value === "YES",
                    )
                  }
                  disabled={isSaving}
                  className={fieldClassName}
                >
                  <option value="NO">동의 안함</option>
                  <option value="YES">동의함</option>
                </select>
              </label>
            ) : null}

            {inputFields.treatmentTag ? (
              <div className="sm:col-span-2">
                <FieldLabel>치료태그</FieldLabel>
                <TreatmentTagPicker
                  options={treatmentTags}
                  selectedNames={draft.treatmentTags}
                  onChange={(names) => updateDraft("treatmentTags", names)}
                  disabled={isSaving}
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-semibold text-[#c64558]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-[#e7eaf0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-xl border border-[#dfe3ec] px-5 text-sm font-bold text-[#747b8f] hover:bg-[#f7f8fb] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving || !draft.name.trim() || !draft.phone.trim()}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d9dde6]"
          >
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            고객 등록
          </button>
        </footer>
      </form>
    </div>
  );
}
