"use client";

import { Check, LoaderCircle, Search, Tags, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TreatmentTagOption = {
  id: string;
  name: string;
  color: string;
};

function safeColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#3157F6";
}

function haveSameTags(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedRight = new Set(right);
  return left.every((name) => normalizedRight.has(name));
}

export function TreatmentTagEditorDialog({
  options,
  selectedNames,
  saving,
  error,
  onClose,
  onSave,
}: {
  options: TreatmentTagOption[];
  selectedNames: string[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (names: string[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [draftNames, setDraftNames] = useState(() => selectedNames);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() =>
      searchInputRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        !draftNames.includes(option.name) &&
        (!normalizedQuery ||
          option.name.toLowerCase().includes(normalizedQuery)),
    );
  }, [draftNames, options, query]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1d2433]/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="treatment-tag-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e2e5eb] bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[#e7eaf0] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <Tags className="size-4.5" />
            </span>
            <div>
              <h2
                id="treatment-tag-dialog-title"
                className="text-base font-bold tracking-[-0.02em] text-[#30374a]"
              >
                치료태그 편집
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#858c9d]">
                치료태그를 검색해 고객에게 추가할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="닫기"
            disabled={saving}
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-[#778095] transition hover:bg-[#f5f6f8] disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-semibold text-[#c64558]"
            >
              {error}
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-bold text-[#596176]">
              현재 치료태그
            </p>
            <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-[#e0e4ed] bg-[#fafbfc] p-2.5">
              {draftNames.length > 0 ? (
                draftNames.map((name) => {
                  const option = options.find((item) => item.name === name);
                  return (
                    <span
                      key={name}
                      className="inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-bold text-white"
                      style={{
                        backgroundColor: safeColor(option?.color ?? ""),
                      }}
                    >
                      <span className="truncate">{name}</span>
                      <button
                        type="button"
                        aria-label={`${name} 선택 해제`}
                        onClick={() =>
                          setDraftNames((current) =>
                            current.filter((item) => item !== name),
                          )
                        }
                        className="flex size-5 shrink-0 items-center justify-center rounded-full transition hover:bg-black/15"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="px-1 text-xs text-[#9aa1b0]">
                  선택된 치료태그가 없습니다.
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-[#596176]">
              치료태그 검색
            </label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-[#dfe3ea] px-3 text-[#8b92a5] transition focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
              <Search className="size-4 shrink-0" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="치료태그명을 입력해 주세요."
                aria-label="치료태그 검색"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#4f576c] outline-none placeholder:text-[#a8aebc]"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="rounded-md p-1 hover:bg-[#f1f3f7]"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-[#e4e7ee] p-1.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setDraftNames((current) => [...current, option.name]);
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#f6f7fa]"
                  >
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: safeColor(option.color) }}
                    >
                      {option.name}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#778095]">
                      <Check className="size-3.5" />
                      추가
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-xs text-[#9ba1b1]">
                  {options.length === draftNames.length
                    ? "모든 치료태그가 선택되었습니다."
                    : "검색 결과가 없습니다."}
                </p>
              )}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-[#e7eaf0] bg-[#fafbfc] px-6 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 rounded-lg border border-[#d9dde5] bg-white px-4 text-sm font-semibold text-[#596176] transition hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving || haveSameTags(draftNames, selectedNames)}
            onClick={() => void onSave(draftNames)}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#3157f6] px-5 text-sm font-semibold text-white transition hover:bg-[#2448d8] disabled:cursor-not-allowed disabled:bg-[#b7c0dd]"
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            저장
          </button>
        </footer>
      </section>
    </div>
  );
}
