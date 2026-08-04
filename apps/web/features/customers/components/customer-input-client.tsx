"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Tag,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import {
  SectionSidebar,
  type SectionSidebarGroup,
} from "@/features/navigation/components/section-sidebar";
import type { BasicServiceSettings } from "@/features/settings/service-settings-types";
import { phoneCountryOptions } from "@/lib/phone-country";

import {
  TreatmentTagPicker,
  type TreatmentTagOption,
} from "./treatment-tag-picker";

type PatientRow = {
  key: string;
  name: string;
  phone: string;
  phoneCountryCode: string;
  chartNumber: string;
  visitType: "" | "NEW" | "RETURNING";
  birthDate: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  nationality: string;
  marketingConsent: boolean;
  treatmentTags: string[];
};

type InitialPatient = {
  id: string;
  chartNumber: string;
  name: string;
  phone: string;
  birthDate: string | null;
  gender: string | null;
  treatmentTags: string[];
  createdAt: string;
  updatedAt: string;
};

type CustomerViewMode = "INPUT" | "ALL" | "MISSING_TAG" | "DAILY";
type SearchField = "name" | "phone" | "treatmentTags" | "chartNumber";

const MINIMUM_ROWS = 20;
const searchOptions: Array<{
  value: SearchField;
  label: string;
  placeholder: string;
}> = [
  { value: "name", label: "고객명", placeholder: "고객명으로 검색" },
  { value: "phone", label: "전화번호", placeholder: "전화번호로 검색" },
  {
    value: "treatmentTags",
    label: "치료태그",
    placeholder: "치료태그로 검색",
  },
  {
    value: "chartNumber",
    label: "차트번호",
    placeholder: "차트번호로 검색",
  },
];

function createEmptyRows() {
  return Array.from({ length: MINIMUM_ROWS }, (_, index): PatientRow => ({
    key: `new-${index}`,
    name: "",
    phone: "",
    phoneCountryCode: "+82",
    chartNumber: "",
    visitType: "",
    birthDate: "",
    gender: "",
    nationality: "",
    marketingConsent: false,
    treatmentTags: [],
  }));
}

function toKoreanDateKey(value: string | Date) {
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

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

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

function genderLabel(gender: string | null) {
  if (gender === "MALE" || gender === "남성") return "남성";
  if (gender === "FEMALE" || gender === "여성") return "여성";
  if (gender === "OTHER" || gender === "기타") return "기타";
  return "-";
}

export function CustomerInputClient({
  initialPatients,
  totalCount,
  missingTreatmentTagCount,
  availableTreatmentTags,
  inputFields,
  initialMode = "INPUT",
}: {
  initialPatients: InitialPatient[];
  totalCount: number;
  missingTreatmentTagCount: number;
  availableTreatmentTags: TreatmentTagOption[];
  inputFields: BasicServiceSettings["inputFields"];
  initialMode?: CustomerViewMode;
}) {
  const [mode, setMode] = useState<CustomerViewMode>(initialMode);
  const [rows, setRows] = useState(createEmptyRows);
  const [dirtyRowKeys, setDirtyRowKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [query, setQuery] = useState("");
  const [dailyDate, setDailyDate] = useState(() => toKoreanDateKey(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSearchOption =
    searchOptions.find((option) => option.value === searchField) ??
    searchOptions[0];
  const normalizedQuery = query.trim().toLowerCase();
  const directoryPatients = useMemo(() => {
    let patients = initialPatients;

    if (mode === "MISSING_TAG") {
      patients = patients.filter(
        (patient) => patient.treatmentTags.length === 0,
      );
    } else if (mode === "DAILY") {
      patients = patients.filter(
        (patient) => toKoreanDateKey(patient.createdAt) === dailyDate,
      );
    }

    if (!normalizedQuery) return patients;
    return patients.filter((patient) => {
      const value =
        searchField === "treatmentTags"
          ? patient.treatmentTags.join(" ")
          : patient[searchField];
      return value.toLowerCase().includes(normalizedQuery);
    });
  }, [dailyDate, initialPatients, mode, normalizedQuery, searchField]);
  const dailyTagCount = directoryPatients.filter(
    (patient) => patient.treatmentTags.length > 0,
  ).length;
  const sidebarGroups: SectionSidebarGroup[] = [
    {
      id: "customer-input-views",
      items: [
        {
          id: "input",
          label: "고객정보 입력",
          icon: UserRound,
          active: mode === "INPUT",
          onSelect: () => switchMode("INPUT"),
        },
        {
          id: "all",
          label: "전체",
          icon: UsersRound,
          badge: totalCount.toLocaleString("ko-KR"),
          active: mode === "ALL",
          onSelect: () => switchMode("ALL"),
        },
        {
          id: "missing-tag",
          label: "치료태그 미입력",
          icon: Tag,
          badge: missingTreatmentTagCount.toLocaleString("ko-KR"),
          active: mode === "MISSING_TAG",
          onSelect: () => switchMode("MISSING_TAG"),
        },
        {
          id: "daily",
          label: "일자별 고객정보 입력 내역",
          icon: CalendarDays,
          active: mode === "DAILY",
          onSelect: () => switchMode("DAILY"),
        },
      ],
    },
  ];

  function switchMode(nextMode: CustomerViewMode) {
    setMode(nextMode);
    setQuery("");
    setFeedback(null);
  }

  function updateRow<K extends keyof Omit<PatientRow, "key">>(
    key: string,
    field: K,
    value: PatientRow[K],
  ) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
    setDirtyRowKeys((current) => new Set(current).add(key));
    setFeedback(null);
  }

  async function saveRows() {
    if (dirtyRowKeys.size === 0 || isSaving || isUploading) return;
    const populatedRows = rows.filter(
      (row) =>
        dirtyRowKeys.has(row.key) &&
        (row.name.trim() || row.phone.trim() || row.treatmentTags.length > 0),
    );

    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patients: populatedRows.map((row) => ({
            name: row.name,
            phone: row.phone,
            phoneCountryCode: row.phoneCountryCode,
            chartNumber: row.chartNumber,
            visitType: row.visitType,
            birthDate: row.birthDate,
            gender: row.gender,
            nationality: row.nationality,
            marketingConsent: row.marketingConsent,
            treatmentTags: row.treatmentTags,
          })),
        }),
      });
      const result = (await response.json()) as {
        savedCount?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "고객정보를 저장하지 못했습니다.");
      }

      setFeedback({
        tone: "success",
        message: `${result.savedCount ?? 0}명의 신규 고객을 저장했습니다.`,
      });
      setRows(createEmptyRows());
      setDirtyRowKeys(new Set());
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "고객정보를 저장하지 못했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadWorkbook(file: File) {
    setIsUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/patients/import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        savedCount?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "엑셀 파일을 업로드하지 못했습니다.");
      }
      setFeedback({
        tone: "success",
        message: `${result.savedCount ?? 0}명의 고객정보를 불러왔습니다.`,
      });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "엑셀 파일을 업로드하지 못했습니다.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function changeDailyDate(offset: number) {
    const nextDate = new Date(`${dailyDate}T12:00:00+09:00`);
    nextDate.setDate(nextDate.getDate() + offset);
    setDailyDate(toKoreanDateKey(nextDate));
  }

  const modeTitle =
    mode === "ALL"
      ? "전체 고객"
      : mode === "MISSING_TAG"
        ? "치료태그 미입력 고객"
        : "일자별 고객정보 입력 내역";

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-white">
      <SectionSidebar
        title="고객입력"
        ariaLabel="고객입력 메뉴"
        groups={sidebarGroups}
        afterNavigation={
          <div>
            <h2 className="text-sm font-extrabold text-[#394055]">
              진행중인 상담자동화
            </h2>
            <div className="mt-4 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce0e9] bg-[#fafbfc] text-center text-[#a0a6b4]">
              <FileSpreadsheet className="size-6" />
              <p className="mt-2 text-xs">자동화 내역은 추후 표시됩니다.</p>
            </div>
          </div>
        }
      />

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {mode === "INPUT" ? (
          <>
            <header className="flex h-[86px] shrink-0 items-center border-b border-[#e4e7ee] px-6">
              <div>
                <h2 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
                  신규 고객정보 입력
                </h2>
                <p className="mt-1 text-xs text-[#969daf]">
                  이 탭은 신규 고객만 등록합니다. 기존 고객은 ‘전체’에서
                  확인하세요.
                </p>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-[#fbfbfc]">
              <table
                className="w-full table-fixed border-collapse bg-white text-sm"
                style={{
                  minWidth: `${660 + Object.values(inputFields).filter(Boolean).length * 170}px`,
                }}
              >
                <thead className="sticky top-0 z-20 bg-[#f2f4fb] text-left text-[#535b70] shadow-[0_1px_0_#dfe3ec]">
                  <tr className="h-12">
                    <th className="w-16 border-r border-[#dce1ec] px-3">No</th>
                    <th className="w-[180px] border-r border-[#dce1ec] px-3">
                      고객명<span className="text-[#e34e61]">*</span>
                    </th>
                    <th className="w-[240px] border-r border-[#dce1ec] px-3">
                      휴대폰번호<span className="text-[#e34e61]">*</span>
                    </th>
                    {inputFields.chartNumber ? (
                      <th className="w-[160px] border-r border-[#dce1ec] px-3">
                        차트번호
                      </th>
                    ) : null}
                    {inputFields.visitType ? (
                      <th className="w-[130px] border-r border-[#dce1ec] px-3">
                        초진/재진
                      </th>
                    ) : null}
                    {inputFields.birthDate ? (
                      <th className="w-[170px] border-r border-[#dce1ec] px-3">
                        생년월일
                      </th>
                    ) : null}
                    {inputFields.gender ? (
                      <th className="w-[130px] border-r border-[#dce1ec] px-3">
                        성별
                      </th>
                    ) : null}
                    {inputFields.treatmentTag ? (
                      <th className="w-[240px] border-r border-[#dce1ec] px-3">
                        치료태그
                      </th>
                    ) : null}
                    {inputFields.nationality ? (
                      <th className="w-[150px] border-r border-[#dce1ec] px-3">
                        국적
                      </th>
                    ) : null}
                    {inputFields.marketingConsent ? (
                      <th className="w-[180px] px-3">광고성메시지 수신여부</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.key}
                      className="h-[47px] border-b border-[#e1e5ed]"
                    >
                      <td className="border-r border-[#e1e5ed] px-3 text-xs text-[#6f778b]">
                        {index + 1}
                      </td>
                      <td className="border-r border-[#e1e5ed] p-0">
                        <input
                          value={row.name}
                          onChange={(event) =>
                            updateRow(row.key, "name", event.target.value)
                          }
                          placeholder="예) 홍길동"
                          disabled={isSaving || isUploading}
                          className="h-[46px] w-full bg-transparent px-3 outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6]"
                        />
                      </td>
                      <td className="border-r border-[#e1e5ed] p-0">
                        <div className="flex h-[46px] focus-within:bg-[#f7f9ff] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#7187f6]">
                          {inputFields.countryCode ? (
                            <select
                              value={row.phoneCountryCode}
                              onChange={(event) =>
                                updateRow(
                                  row.key,
                                  "phoneCountryCode",
                                  event.target.value,
                                )
                              }
                              aria-label={`${index + 1}번 고객 국가번호`}
                              disabled={isSaving || isUploading}
                              className="w-[86px] shrink-0 border-r border-[#e1e5ed] bg-transparent px-2 text-xs font-semibold text-[#657087] outline-none"
                            >
                              {phoneCountryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.value}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <input
                            value={row.phone}
                            onChange={(event) =>
                              updateRow(row.key, "phone", event.target.value)
                            }
                            placeholder="예) 01012345678"
                            inputMode="tel"
                            disabled={isSaving || isUploading}
                            className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-[#c5cad4]"
                          />
                        </div>
                      </td>
                      {inputFields.chartNumber ? (
                        <td className="border-r border-[#e1e5ed] p-0">
                          <input
                            value={row.chartNumber}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "chartNumber",
                                event.target.value,
                              )
                            }
                            placeholder="차트번호"
                            disabled={isSaving || isUploading}
                            className="h-[46px] w-full bg-transparent px-3 outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6]"
                          />
                        </td>
                      ) : null}
                      {inputFields.visitType ? (
                        <td className="border-r border-[#e1e5ed] p-0">
                          <select
                            value={row.visitType}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "visitType",
                                event.target.value as PatientRow["visitType"],
                              )
                            }
                            disabled={isSaving || isUploading}
                            aria-label={`${index + 1}번 고객 초진 재진`}
                            className="h-[46px] w-full bg-transparent px-3 text-sm outline-none focus:bg-[#f7f9ff]"
                          >
                            <option value="">선택</option>
                            <option value="NEW">초진</option>
                            <option value="RETURNING">재진</option>
                          </select>
                        </td>
                      ) : null}
                      {inputFields.birthDate ? (
                        <td className="border-r border-[#e1e5ed] p-0">
                          <input
                            type="date"
                            value={row.birthDate}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "birthDate",
                                event.target.value,
                              )
                            }
                            disabled={isSaving || isUploading}
                            aria-label={`${index + 1}번 고객 생년월일`}
                            className="h-[46px] w-full bg-transparent px-3 text-xs outline-none focus:bg-[#f7f9ff]"
                          />
                        </td>
                      ) : null}
                      {inputFields.gender ? (
                        <td className="border-r border-[#e1e5ed] p-0">
                          <select
                            value={row.gender}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "gender",
                                event.target.value as PatientRow["gender"],
                              )
                            }
                            disabled={isSaving || isUploading}
                            aria-label={`${index + 1}번 고객 성별`}
                            className="h-[46px] w-full bg-transparent px-3 text-sm outline-none focus:bg-[#f7f9ff]"
                          >
                            <option value="">선택</option>
                            <option value="MALE">남성</option>
                            <option value="FEMALE">여성</option>
                            <option value="OTHER">기타</option>
                          </select>
                        </td>
                      ) : null}
                      {inputFields.treatmentTag ? (
                        <td className="relative border-r border-[#e1e5ed] p-0">
                          <TreatmentTagPicker
                            compact
                            options={availableTreatmentTags}
                            selectedNames={row.treatmentTags}
                            onChange={(names) =>
                              updateRow(row.key, "treatmentTags", names)
                            }
                            disabled={isSaving || isUploading}
                          />
                        </td>
                      ) : null}
                      {inputFields.nationality ? (
                        <td className="border-r border-[#e1e5ed] p-0">
                          <input
                            value={row.nationality}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "nationality",
                                event.target.value,
                              )
                            }
                            placeholder="예) 대한민국"
                            disabled={isSaving || isUploading}
                            className="h-[46px] w-full bg-transparent px-3 outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6]"
                          />
                        </td>
                      ) : null}
                      {inputFields.marketingConsent ? (
                        <td className="p-0">
                          <select
                            value={row.marketingConsent ? "YES" : "NO"}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                "marketingConsent",
                                event.target.value === "YES",
                              )
                            }
                            disabled={isSaving || isUploading}
                            aria-label={`${index + 1}번 고객 광고성메시지 수신여부`}
                            className="h-[46px] w-full bg-transparent px-3 text-sm outline-none focus:bg-[#f7f9ff]"
                          >
                            <option value="NO">미수신</option>
                            <option value="YES">수신</option>
                          </select>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex min-h-[72px] shrink-0 items-center gap-3 border-t border-[#dfe3ec] bg-white px-6 py-3">
              <Link
                href="/api/patients/template"
                download
                className="flex h-10 items-center gap-2 rounded-xl border border-[#cfd5e2] px-4 text-xs font-bold text-[#71798c] hover:bg-[#f8faff] hover:text-[#3157f6]"
              >
                <Download className="size-4" /> 엑셀 양식 다운로드
              </Link>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadWorkbook(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isUploading}
                className="flex h-10 items-center gap-2 rounded-xl border border-[#cfd5e2] px-4 text-xs font-bold text-[#71798c] hover:bg-[#f8faff] hover:text-[#3157f6] disabled:opacity-50"
              >
                {isUploading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isUploading ? "업로드 중" : "과거 고객 엑셀 업로드"}
              </button>
              <div className="ml-auto flex items-center gap-4">
                {feedback ? (
                  <span
                    className={`flex items-center gap-1 text-xs font-bold ${
                      feedback.tone === "success"
                        ? "text-[#15945d]"
                        : "text-[#d8465b]"
                    }`}
                  >
                    {feedback.tone === "success" ? (
                      <Check className="size-4" />
                    ) : null}
                    {feedback.message}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void saveRows()}
                  disabled={dirtyRowKeys.size === 0 || isSaving || isUploading}
                  className="flex h-10 min-w-20 items-center justify-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d8dce6]"
                >
                  {isSaving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  {isSaving ? "저장 중" : "저장"}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <header className="shrink-0 border-b border-[#e4e7ee] bg-white">
              {mode === "DAILY" ? (
                <div className="flex h-16 items-center gap-3 border-b border-[#eceef3] px-6">
                  <button
                    type="button"
                    onClick={() => changeDailyDate(-1)}
                    aria-label="이전 날짜"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3ec] text-[#7b8295]"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(event) => setDailyDate(event.target.value)}
                    className="h-9 rounded-lg border border-[#dfe3ec] px-3 text-sm font-bold text-[#42495e] outline-none focus:border-[#7187f6]"
                  />
                  <button
                    type="button"
                    onClick={() => changeDailyDate(1)}
                    aria-label="다음 날짜"
                    className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3ec] text-[#7b8295]"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ) : null}
              <div className="flex h-[78px] items-center gap-8 px-6">
                <div className="flex shrink-0 items-baseline gap-4">
                  <h2 className="text-lg font-extrabold text-[#30364b]">
                    {modeTitle}
                  </h2>
                  <span className="text-sm font-bold text-[#3157f6]">
                    {directoryPatients.length.toLocaleString("ko-KR")}
                  </span>
                  {mode === "DAILY" ? (
                    <span className="text-xs font-semibold text-[#7d8497]">
                      치료태그 등록 {dailyTagCount.toLocaleString("ko-KR")}
                    </span>
                  ) : null}
                </div>
                <div className="ml-auto flex h-10 w-full max-w-[610px] items-center overflow-hidden rounded-xl border border-[#dfe3ec] focus-within:border-[#7187f6]">
                  <label className="relative flex h-full w-[132px] items-center border-r border-[#e1e5ed] px-4 text-xs font-bold text-[#737b8e]">
                    <span className="flex-1">{activeSearchOption.label}</span>
                    <ChevronDown className="size-3.5" />
                    <select
                      value={searchField}
                      onChange={(event) =>
                        setSearchField(event.target.value as SearchField)
                      }
                      aria-label="고객 검색 기준"
                      className="absolute inset-0 opacity-0"
                    >
                      {searchOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-1 items-center gap-2 px-4">
                    <Search className="size-4 text-[#9ca3b3]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={activeSearchOption.placeholder}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </label>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-white">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[#f2f4fb] text-left text-xs text-[#535b70] shadow-[0_1px_0_#dfe3ec]">
                  <tr className="h-11">
                    <th className="w-[18%] px-4">고객명</th>
                    <th className="w-[13%] px-3">차트번호</th>
                    <th className="w-[16%] px-3">휴대폰번호</th>
                    <th className="w-[13%] px-3">생년월일</th>
                    <th className="w-[9%] px-3">성별</th>
                    <th className="px-3">치료태그</th>
                    <th className="w-24 px-3 text-center">상세정보</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="h-12 border-b border-[#e4e7ee] hover:bg-[#fafbff]"
                    >
                      <td className="px-4 font-bold text-[#41485d]">
                        <Link
                          href={`/service/customers/${patient.id}`}
                          className="hover:text-[#3157f6]"
                        >
                          {patient.name}
                        </Link>
                      </td>
                      <td className="px-3 font-mono text-xs text-[#737b8e]">
                        {patient.chartNumber || "-"}
                      </td>
                      <td className="px-3 text-[#5f677b]">
                        {patient.phone || "-"}
                      </td>
                      <td className="px-3 text-[#737b8e]">
                        {formatDate(patient.birthDate)}
                      </td>
                      <td className="px-3 text-[#737b8e]">
                        {genderLabel(patient.gender)}
                      </td>
                      <td className="px-3 text-xs text-[#3157f6]">
                        {patient.treatmentTags.length > 0
                          ? patient.treatmentTags.join(", ")
                          : "-"}
                      </td>
                      <td className="px-3 text-center">
                        <Link
                          href={`/service/customers/${patient.id}`}
                          className="inline-flex h-8 items-center rounded-lg border border-[#d6dbe6] px-3 text-xs font-bold text-[#737b8e] hover:border-[#9dacf5] hover:text-[#3157f6]"
                        >
                          이동
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {directoryPatients.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-[#9da4b4]">
                  <UsersRound className="size-8" />
                  <p className="mt-3 text-sm font-semibold">
                    표시할 고객이 없습니다.
                  </p>
                </div>
              ) : null}
            </div>
            <footer className="flex h-14 shrink-0 items-center justify-end border-t border-[#e4e7ee] px-6 text-xs text-[#9aa0af]">
              {directoryPatients[0]
                ? `최근 입력 ${formatDateTime(directoryPatients[0].createdAt)}`
                : "선택한 조건에 입력 내역이 없습니다."}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
