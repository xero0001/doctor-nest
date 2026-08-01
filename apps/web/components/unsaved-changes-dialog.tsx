"use client";

import { CircleAlert } from "lucide-react";
import { useId } from "react";

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
  title = "저장하지 않고 나가시겠어요?",
  description = "화면을 이동하면 입력한 내용이 사라집니다.",
  confirmLabel = "나가기",
  cancelLabel = "계속 편집",
  position = "fixed",
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  position?: "fixed" | "absolute";
}) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) return null;

  return (
    <div
      className={`${position} inset-0 z-[70] flex items-center justify-center bg-[#1d2433]/45 p-4`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="계속 편집"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-2xl border border-[#e2e5eb] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff0f2] text-[#d64558]">
            <CircleAlert className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-[-0.02em] text-[#30374a]"
            >
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-[#858c9d]"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[#d9dde5] px-4 text-sm font-semibold text-[#596176] hover:bg-[#f7f8fa]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-[#d94758] px-4 text-sm font-semibold text-white hover:bg-[#c63c4d]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
