"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { TAG_COLOR_PRESETS } from "@/features/settings/tag-colors";

export function TagColorSelect({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className="group flex size-8 items-center justify-center rounded-lg bg-[#f7f8fa] outline-none transition hover:bg-[#eef1f6] focus-visible:ring-2 focus-visible:ring-[#3157f6]/35 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="size-5 rounded-full shadow-sm ring-2 ring-white"
          style={{ backgroundColor: value }}
        />
        <ChevronDown className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-white text-[#8c94a6] shadow-sm transition group-aria-expanded:rotate-180" />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#dfe3ea] bg-white p-3 shadow-[0_12px_36px_rgba(38,48,82,0.18)]"
        >
          <p className="mb-2.5 text-xs font-bold text-[#596177]">색상 선택</p>
          <div className="grid grid-cols-4 gap-2.5">
            {TAG_COLOR_PRESETS.map((preset) => {
              const selected = value.toUpperCase() === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="option"
                  aria-label={preset.label}
                  aria-selected={selected}
                  title={preset.label}
                  onClick={() => {
                    onChange(preset.value);
                    setOpen(false);
                  }}
                  className={`flex size-8 items-center justify-center rounded-full border-2 border-white shadow-sm outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#3157f6] focus-visible:ring-offset-2 ${
                    selected
                      ? "ring-2 ring-[#3157f6] ring-offset-2"
                      : "ring-1 ring-[#dfe3ea]"
                  }`}
                  style={{ backgroundColor: preset.value }}
                >
                  {selected ? (
                    <Check className="size-4 text-white drop-shadow-sm" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
