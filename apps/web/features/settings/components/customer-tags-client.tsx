"use client";

import {
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { HospitalSettingsSidebar } from "@/features/settings/components/hospital-settings-sidebar";

export type CustomerTagRecord = {
  id: string;
  name: string;
  color: string;
  assignmentCount: number;
};

const MAX_CUSTOMER_TAGS = 5;

export function CustomerTagsClient({
  initialTags,
}: {
  initialTags: CustomerTagRecord[];
}) {
  const [tags, setTags] = useState(initialTags);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestTags(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, string>,
  ) {
    setPendingId(body.id ?? "NEW");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings/customer-tags", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        tags?: CustomerTagRecord[];
        error?: string;
      };
      if (!response.ok || !result.tags) {
        throw new Error(result.error ?? "고객태그를 저장하지 못했습니다.");
      }
      setTags(result.tags);
      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "고객태그를 저장하지 못했습니다.",
      );
      return false;
    } finally {
      setPendingId("");
    }
  }

  async function addTag(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await requestTags("POST", { name })) {
      setNewName("");
      setNotice("고객태그를 추가했습니다.");
    }
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    if (await requestTags("PATCH", { id, name })) {
      setEditingId("");
      setEditingName("");
      setNotice("고객태그를 수정했습니다.");
    }
  }

  async function deleteTag(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    if (await requestTags("DELETE", { id })) {
      setDeletingId("");
      setNotice("고객태그를 삭제했습니다.");
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1180px] bg-[#f3f7fd]">
      <HospitalSettingsSidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center border-b border-[#dfe4ec] bg-white px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
              <Tag className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#30374a]">
                고객태그
              </h1>
              <p className="mt-0.5 text-xs text-[#9299a9]">
                고객을 상태나 특성에 따라 분류하고 관리합니다.
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[1000px]">
            {notice || error ? (
              <div
                role="status"
                className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-[#fff0f2] text-[#c64558]"
                    : "bg-[#edf8f2] text-[#34805b]"
                }`}
              >
                {error || notice}
              </div>
            ) : null}

            <section className="rounded-2xl border border-[#e0e5ed] bg-white p-7 shadow-[0_8px_30px_rgba(36,47,95,0.04)]">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#30374a]">
                    고객태그
                  </h2>
                  <p className="mt-1 text-sm text-[#9299aa]">
                    고객을 고객태그로 분류하여 관리할 수 있습니다. 최대
                    {` ${MAX_CUSTOMER_TAGS}개`}까지 등록 가능합니다.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[#697187]">
                  {tags.length} / {MAX_CUSTOMER_TAGS}
                </span>
              </div>

              <form onSubmit={addTag} className="mt-6 flex gap-3">
                <label className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-[#dfe3ea] px-4 focus-within:border-[#7187f6] focus-within:ring-3 focus-within:ring-[#3157f6]/10">
                  <Tag className="mr-2 size-4 text-[#9ba2b1]" />
                  <input
                    value={newName}
                    maxLength={30}
                    disabled={tags.length >= MAX_CUSTOMER_TAGS}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="태그명을 입력해 주세요."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    !newName.trim() ||
                    tags.length >= MAX_CUSTOMER_TAGS ||
                    pendingId === "NEW"
                  }
                  className="flex h-11 items-center gap-2 rounded-xl bg-[#3157f6] px-6 text-sm font-bold text-white disabled:bg-[#aeb9e6]"
                >
                  {pendingId === "NEW" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  추가
                </button>
              </form>

              <div className="mt-7 border-t border-[#e8ebf1] pt-6">
                {tags.length > 0 ? (
                  <ul className="space-y-3">
                    {tags.map((tag) => {
                      const editing = editingId === tag.id;
                      const confirmingDelete = deletingId === tag.id;
                      return (
                        <li
                          key={tag.id}
                          className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#e1e5ed] px-5 py-3"
                        >
                          <span
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {editing ? (
                            <input
                              value={editingName}
                              maxLength={30}
                              autoFocus
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  void saveEdit(tag.id);
                                if (event.key === "Escape") setEditingId("");
                              }}
                              className="h-10 min-w-0 flex-1 rounded-xl border border-[#7187f6] px-3 text-sm outline-none ring-3 ring-[#3157f6]/10"
                            />
                          ) : (
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold text-[#3b4357]">
                                {tag.name}
                              </p>
                              <p className="mt-1 text-xs text-[#9299aa]">
                                고객{" "}
                                {tag.assignmentCount.toLocaleString("ko-KR")}
                                명에게 적용됨
                              </p>
                            </div>
                          )}

                          {editing ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                aria-label={`${tag.name} 수정 취소`}
                                onClick={() => setEditingId("")}
                                className="flex size-9 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#778095]"
                              >
                                <X className="size-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`${tag.name} 수정 저장`}
                                disabled={
                                  !editingName.trim() || pendingId === tag.id
                                }
                                onClick={() => void saveEdit(tag.id)}
                                className="flex size-9 items-center justify-center rounded-lg bg-[#3157f6] text-white disabled:bg-[#aeb9e6]"
                              >
                                {pendingId === tag.id ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Check className="size-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {confirmingDelete ? (
                                <button
                                  type="button"
                                  onClick={() => setDeletingId("")}
                                  className="h-9 rounded-lg border border-[#dfe3ea] px-3 text-xs font-bold text-[#697187]"
                                >
                                  취소
                                </button>
                              ) : null}
                              <button
                                type="button"
                                aria-label={`${tag.name} 수정`}
                                onClick={() => {
                                  setEditingId(tag.id);
                                  setEditingName(tag.name);
                                  setDeletingId("");
                                }}
                                className="flex size-9 items-center justify-center rounded-lg border border-[#dfe3ea] text-[#697187] hover:bg-[#f7f8fb]"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                disabled={pendingId === tag.id}
                                onClick={() => void deleteTag(tag.id)}
                                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${
                                  confirmingDelete
                                    ? "border-[#d94758] bg-[#d94758] text-white"
                                    : "border-[#ead8dc] text-[#c64558] hover:bg-[#fff4f5]"
                                }`}
                              >
                                {pendingId === tag.id ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                {confirmingDelete ? "삭제 확인" : "삭제"}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce1eb] bg-[#fafbfc] text-[#9aa1b0]">
                    <Tag className="size-8" />
                    <p className="mt-3 text-sm font-bold">
                      등록된 고객태그가 없습니다.
                    </p>
                    <p className="mt-1 text-xs">
                      위 입력창에서 첫 고객태그를 추가해 주세요.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </section>
    </div>
  );
}
