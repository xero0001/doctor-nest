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
}: {
  initialPatients: InitialPatient[];
  totalCount: number;
  missingTreatmentTagCount: number;
  availableTreatmentTags: TreatmentTagOption[];
}) {
  const [mode, setMode] = useState<CustomerViewMode>("INPUT");
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

  function switchMode(nextMode: CustomerViewMode) {
    setMode(nextMode);
    setQuery("");
    setFeedback(null);
  }

  function updateRow(
    key: string,
    field: "name" | "phone" | "phoneCountryCode" | "treatmentTags",
    value: string | string[],
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
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#e4e7ee] bg-white p-5">
        <div className="border-b border-[#e8eaf0] pb-5">
          <h1 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
            고객입력
          </h1>
          <p className="mt-1 text-xs text-[#9aa0af]">
            신규 고객을 등록하고 입력 내역을 관리합니다.
          </p>
        </div>

        <nav className="mt-3 space-y-1" aria-label="고객입력 메뉴">
          {(
            [
              ["INPUT", "고객정보 입력", UserRound],
              ["ALL", "전체", UsersRound],
              ["MISSING_TAG", "치료태그 미입력", Tag],
              ["DAILY", "일자별 고객정보 입력 내역", CalendarDays],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={`flex h-11 w-full items-center gap-2 rounded-xl px-4 text-left text-sm font-bold transition ${
                mode === value
                  ? "bg-[#edf3ff] text-[#3157f6]"
                  : "text-[#4d556a] hover:bg-[#f7f8fb]"
              }`}
            >
              <Icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {value === "ALL" ? (
                <span className="text-xs">
                  {totalCount.toLocaleString("ko-KR")}
                </span>
              ) : value === "MISSING_TAG" ? (
                <span className="text-xs">
                  {missingTreatmentTagCount.toLocaleString("ko-KR")}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="mt-7">
          <h2 className="text-sm font-extrabold text-[#394055]">
            진행중인 상담자동화
          </h2>
          <div className="mt-4 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce0e9] bg-[#fafbfc] text-center text-[#a0a6b4]">
            <FileSpreadsheet className="size-6" />
            <p className="mt-2 text-xs">자동화 내역은 추후 표시됩니다.</p>
          </div>
        </div>
      </aside>

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
              <table className="w-full min-w-[800px] table-fixed border-collapse bg-white text-sm">
                <thead className="sticky top-0 z-20 bg-[#f2f4fb] text-left text-[#535b70] shadow-[0_1px_0_#dfe3ec]">
                  <tr className="h-12">
                    <th className="w-16 border-r border-[#dce1ec] px-3">No</th>
                    <th className="w-[28%] border-r border-[#dce1ec] px-3">
                      고객명<span className="text-[#e34e61]">*</span>
                    </th>
                    <th className="w-[25%] border-r border-[#dce1ec] px-3">
                      휴대폰번호<span className="text-[#e34e61]">*</span>
                    </th>
                    <th className="px-3">치료태그</th>
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
                      <td className="relative p-0">
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
