"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type PatientRow = {
  key: string;
  id?: string;
  chartNumber: string;
  name: string;
  phone: string;
  treatmentTags: string;
  updatedAt?: string;
};

type InitialPatient = Omit<PatientRow, "key" | "treatmentTags"> & {
  id: string;
  treatmentTags: string[];
};

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

function emptyRow(index: number): PatientRow {
  return {
    key: `new-${index}`,
    chartNumber: "",
    name: "",
    phone: "",
    treatmentTags: "",
  };
}

function createRows(initialPatients: InitialPatient[]) {
  const rows: PatientRow[] = initialPatients.map((patient) => ({
    ...patient,
    key: patient.id,
    treatmentTags: patient.treatmentTags.join(", "),
  }));
  const blankCount = Math.max(5, MINIMUM_ROWS - rows.length);

  return [
    ...rows,
    ...Array.from({ length: blankCount }, (_, index) => emptyRow(index)),
  ];
}

function formatUpdatedAt(value?: string) {
  if (!value) return "아직 저장된 고객이 없습니다.";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function CustomerInputClient({
  initialPatients,
  totalCount,
  missingTreatmentTagCount,
}: {
  initialPatients: InitialPatient[];
  totalCount: number;
  missingTreatmentTagCount: number;
}) {
  const [rows, setRows] = useState(() => createRows(initialPatients));
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [query, setQuery] = useState("");
  const [isDirty, setIsDirty] = useState(false);
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
  const visibleRows = useMemo(() => {
    if (!normalizedQuery) return rows;

    return rows.filter((row) =>
      row[searchField].toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, rows, searchField]);
  const latestUpdatedAt = initialPatients.reduce<string | undefined>(
    (latest, patient) =>
      !latest ||
      (patient.updatedAt && new Date(patient.updatedAt) > new Date(latest))
        ? patient.updatedAt
        : latest,
    undefined,
  );

  function updateRow(
    key: string,
    field: "name" | "phone" | "treatmentTags",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
    setIsDirty(true);
    setFeedback(null);
  }

  async function saveRows() {
    if (!isDirty || isSaving || isUploading) return;

    const populatedRows = rows.filter(
      (row) => row.name.trim() || row.phone.trim() || row.treatmentTags.trim(),
    );

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patients: populatedRows.map((row) => ({
            id: row.id,
            chartNumber: row.chartNumber || undefined,
            name: row.name,
            phone: row.phone,
            treatmentTags: row.treatmentTags.split(/[,，]/),
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
        message: `${result.savedCount ?? 0}명의 고객정보를 저장했습니다.`,
      });
      setIsDirty(false);
      window.setTimeout(() => window.location.reload(), 450);
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
      window.setTimeout(() => window.location.reload(), 450);
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

  return (
    <div className="flex h-full min-h-0 min-w-[1100px] bg-white">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#e4e7ee] bg-white p-5">
        <div className="border-b border-[#e8eaf0] pb-5">
          <h1 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
            고객입력
          </h1>
          <p className="mt-1 text-xs text-[#9aa0af]">
            고객정보를 업데이트하거나 새로 등록할 수 있습니다.
          </p>
        </div>

        <nav className="mt-3 space-y-1" aria-label="고객입력 메뉴">
          <button
            type="button"
            className="flex h-11 w-full items-center rounded-xl bg-[#edf3ff] px-4 text-left text-sm font-bold text-[#3c526d]"
          >
            고객정보 입력
          </button>
          <div className="flex h-11 items-center justify-between border-b border-[#e8eaf0] px-4 text-sm font-bold text-[#4d556a]">
            <span>치료태그 미입력</span>
            <span className="text-xs text-[#6d7487]">
              {missingTreatmentTagCount.toLocaleString("ko-KR")}
            </span>
          </div>
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl bg-[#f5f7fb] px-4 text-left text-sm font-bold text-[#4d556a]"
          >
            <CalendarDays className="size-4 text-[#8991a3]" />
            일자별 고객정보 입력 내역
          </button>
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
        <header className="flex h-[86px] shrink-0 items-center gap-8 border-b border-[#e4e7ee] px-6">
          <div className="flex shrink-0 items-baseline gap-5">
            <h2 className="text-lg font-extrabold tracking-[-0.04em] text-[#30364b]">
              고객정보 입력
            </h2>
            <p className="text-sm font-bold text-[#737b8e]">
              전체고객
              <span className="ml-2 text-[#444c61]">
                {totalCount.toLocaleString("ko-KR")}
              </span>
            </p>
          </div>

          <div className="ml-auto flex h-10 w-full max-w-[610px] items-center overflow-hidden rounded-xl border border-[#dfe3ec] bg-white focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
            <label className="relative flex h-full w-[132px] shrink-0 cursor-pointer items-center border-r border-[#e1e5ed] px-4 text-xs font-bold text-[#737b8e]">
              <span className="min-w-0 flex-1 truncate">
                {activeSearchOption.label}
              </span>
              <ChevronDown className="size-3.5 text-[#9ba1b1]" />
              <select
                value={searchField}
                onChange={(event) =>
                  setSearchField(event.target.value as SearchField)
                }
                aria-label="고객정보 검색 기준"
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
              >
                {searchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 items-center gap-2 px-4 text-[#9ca3b3]">
              <Search className="size-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeSearchOption.placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#30364b] outline-none placeholder:text-[#b0b5c2]"
              />
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-[#fbfbfc]">
          <table className="w-full min-w-[760px] table-fixed border-collapse bg-white text-sm">
            <thead className="sticky top-0 z-10 bg-[#f2f4fb] text-left text-[#535b70] shadow-[0_1px_0_#dfe3ec]">
              <tr className="h-12">
                <th className="w-16 border-r border-[#dce1ec] px-3 font-bold">
                  No
                </th>
                <th className="w-[28%] border-r border-[#dce1ec] px-3 font-bold">
                  고객명<span className="ml-0.5 text-[#e34e61]">*</span>
                </th>
                <th className="w-[25%] border-r border-[#dce1ec] px-3 font-bold">
                  휴대폰번호<span className="ml-0.5 text-[#e34e61]">*</span>
                </th>
                <th className="px-3 font-bold">치료태그</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.key} className="h-[47px] border-b border-[#e1e5ed]">
                  <td className="border-r border-[#e1e5ed] px-3 text-xs font-medium text-[#6f778b]">
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
                      className="h-[46px] w-full bg-transparent px-3 text-sm text-[#353b4e] outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6] disabled:opacity-60"
                    />
                  </td>
                  <td className="border-r border-[#e1e5ed] p-0">
                    <input
                      value={row.phone}
                      onChange={(event) =>
                        updateRow(row.key, "phone", event.target.value)
                      }
                      placeholder="예) 01012345678"
                      inputMode="tel"
                      disabled={isSaving || isUploading}
                      className="h-[46px] w-full bg-transparent px-3 text-sm text-[#353b4e] outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6] disabled:opacity-60"
                    />
                  </td>
                  <td className="p-0">
                    <input
                      value={row.treatmentTags}
                      onChange={(event) =>
                        updateRow(
                          row.key,
                          "treatmentTags",
                          event.target.value,
                        )
                      }
                      placeholder="예) 도수치료, 리프팅"
                      disabled={isSaving || isUploading}
                      className="h-[46px] w-full bg-transparent px-3 text-sm text-[#353b4e] outline-none placeholder:text-[#c5cad4] focus:bg-[#f7f9ff] focus:ring-2 focus:ring-inset focus:ring-[#7187f6] disabled:opacity-60"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleRows.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-[#a0a6b4]">
              <Search className="size-7" />
              <p className="mt-3 text-sm font-semibold">
                검색 조건에 맞는 고객이 없습니다.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex min-h-[72px] shrink-0 items-center gap-3 border-t border-[#dfe3ec] bg-white px-6 py-3">
          <a
            href="/api/patients/template"
            className="flex h-10 items-center gap-2 rounded-xl border border-[#cfd5e2] px-4 text-xs font-bold text-[#71798c] transition hover:border-[#aebcf5] hover:bg-[#f8faff] hover:text-[#3157f6]"
          >
            <Download className="size-4" />
            엑셀 양식 다운로드
          </a>
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
            className="flex h-10 items-center gap-2 rounded-xl border border-[#cfd5e2] px-4 text-xs font-bold text-[#71798c] transition hover:border-[#aebcf5] hover:bg-[#f8faff] hover:text-[#3157f6] disabled:cursor-not-allowed disabled:opacity-50"
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
                className={`flex items-center gap-1.5 text-xs font-bold ${
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
            ) : (
              <span className="text-xs text-[#a0a6b4]">
                업데이트: {formatUpdatedAt(latestUpdatedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => void saveRows()}
              disabled={!isDirty || isSaving || isUploading}
              className="flex h-10 min-w-20 items-center justify-center gap-2 rounded-xl bg-[#3157f6] px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#d8dce6]"
            >
              {isSaving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {isSaving ? "저장 중" : "수정"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
