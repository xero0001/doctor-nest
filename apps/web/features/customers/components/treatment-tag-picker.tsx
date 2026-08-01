"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type TreatmentTagOption = {
  id: string;
  name: string;
  color: string;
};

function safeColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#3157F6";
}

export function TreatmentTagPicker({
  options,
  selectedNames,
  onChange,
  disabled = false,
  compact = false,
  placement = "bottom",
}: {
  options: TreatmentTagOption[];
  selectedNames: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
  placement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function setPickerOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }

  useEffect(() => {
    if (!open) return;

    function closePicker(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }

    document.addEventListener("mousedown", closePicker);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePicker);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        option.name.toLowerCase().includes(normalizedQuery),
      )
    : options;

  function toggleTag(name: string) {
    onChange(
      selectedNames.includes(name)
        ? selectedNames.filter((selectedName) => selectedName !== name)
        : [...selectedNames, name],
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setPickerOpen(!open);
        }}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setPickerOpen(!open);
          }
        }}
        aria-disabled={disabled}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-1.5 border bg-white text-left outline-none transition focus:border-[#7187f6] focus:ring-3 focus:ring-[#3157f6]/10 ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${
          compact
            ? "min-h-[46px] rounded-none border-0 px-3 py-1.5"
            : "min-h-11 rounded-xl border-[#dfe3ec] px-3 py-2"
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selectedNames.length > 0 ? (
            selectedNames.map((name) => {
              const tag = options.find((option) => option.name === name);
              return (
                <span
                  key={name}
                  className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: safeColor(tag?.color ?? "") }}
                >
                  <span className="truncate">{name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${name} 제거`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTag(name);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleTag(name);
                      }
                    }}
                    className="rounded-full hover:bg-black/15"
                  >
                    <X className="size-3 shrink-0" />
                  </span>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-[#b2b7c4]">치료태그 선택</span>
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-[#9ba1b1]" />
      </div>

      {open ? (
        <div
          className={`absolute left-0 z-50 w-full min-w-64 overflow-hidden rounded-xl border border-[#dfe3ec] bg-white shadow-[0_16px_40px_rgba(35,43,75,0.18)] ${
            placement === "top"
              ? "bottom-[calc(100%+6px)]"
              : "top-[calc(100%+6px)]"
          }`}
        >
          <label className="flex items-center gap-2 border-b border-[#edf0f5] px-3 py-2.5 text-[#8b92a5] focus-within:text-[#3157f6]">
            <Search className="size-3.5 shrink-0" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="치료태그 검색"
              aria-label="치료태그 검색"
              className="min-w-0 flex-1 bg-transparent text-xs text-[#4f576c] outline-none placeholder:text-[#a8aebc]"
            />
          </label>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = selectedNames.includes(option.name);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleTag(option.name)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                      selected ? "bg-[#eef3ff]" : "hover:bg-[#f6f7fa]"
                    }`}
                  >
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                      style={{ backgroundColor: safeColor(option.color) }}
                    >
                      {option.name}
                    </span>
                    {selected ? (
                      <Check className="ml-auto size-4 text-[#3157f6]" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-xs text-[#9ba1b1]">
                {options.length > 0
                  ? "검색 결과가 없습니다."
                  : "등록된 치료태그가 없습니다."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
