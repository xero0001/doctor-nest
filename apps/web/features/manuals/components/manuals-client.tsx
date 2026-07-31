"use client";

import {
  BookOpenText,
  Check,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  LoaderCircle,
  Pencil,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import { SectionTabs } from "@/components/section-tabs";
import type {
  ManualDocumentRecord,
  ManualFolderRecord,
} from "@/features/manuals/types";

type DocumentDraft = {
  title: string;
  folderId: string;
  tags: string;
  contentMarkdown: string;
};

type FolderDialog =
  | {
      mode: "create";
      name: string;
      parentId: string;
    }
  | {
      mode: "rename";
      folderId: string;
      name: string;
      parentId: string;
    };

const editorTabs = [
  { value: "EDIT", label: "편집" },
  { value: "PREVIEW", label: "미리보기" },
] as const;

function createDraft(document: ManualDocumentRecord | undefined): DocumentDraft {
  return {
    title: document?.title ?? "",
    folderId: document?.folderId ?? "",
    tags: document?.tags.map((tag) => tag.name).join(", ") ?? "",
    contentMarkdown: document?.contentMarkdown ?? "",
  };
}

function orderFolders(folders: ManualFolderRecord[]) {
  const children = new Map<string | null, ManualFolderRecord[]>();

  for (const folder of folders) {
    const key = folder.parentId;
    children.set(key, [...(children.get(key) ?? []), folder]);
  }

  for (const items of children.values()) {
    items.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, "ko"),
    );
  }

  const ordered: Array<{ folder: ManualFolderRecord; depth: number }> = [];
  const visited = new Set<string>();

  function visit(parentId: string | null, depth: number) {
    for (const folder of children.get(parentId) ?? []) {
      if (visited.has(folder.id)) continue;
      visited.add(folder.id);
      ordered.push({ folder, depth });
      visit(folder.id, depth + 1);
    }
  }

  visit(null, 0);

  for (const folder of folders) {
    if (!visited.has(folder.id)) {
      ordered.push({ folder, depth: 0 });
    }
  }

  return ordered;
}

function collectFolderIds(folderId: string, folders: ManualFolderRecord[]) {
  const ids = new Set([folderId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const folder of folders) {
      if (
        folder.parentId &&
        ids.has(folder.parentId) &&
        !ids.has(folder.id)
      ) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }

  return ids;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ManualsClient({
  organizationName,
  initialFolders,
  initialDocuments,
}: {
  organizationName: string;
  initialFolders: ManualFolderRecord[];
  initialDocuments: ManualDocumentRecord[];
}) {
  const initialDocument = initialDocuments[0];
  const [folders, setFolders] = useState(initialFolders);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState(
    initialDocument?.folderId ?? initialFolders[0]?.id ?? "",
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    initialDocument?.id ?? "",
  );
  const [draft, setDraft] = useState<DocumentDraft>(() =>
    createDraft(initialDocument),
  );
  const [query, setQuery] = useState("");
  const [editorView, setEditorView] = useState<"EDIT" | "PREVIEW">("EDIT");
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId,
  );
  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const orderedFolders = useMemo(() => orderFolders(folders), [folders]);
  const documentCountByFolder = useMemo(() => {
    const counts = new Map<string, number>();

    for (const document of documents) {
      counts.set(document.folderId, (counts.get(document.folderId) ?? 0) + 1);
    }

    return counts;
  }, [documents]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleDocuments = useMemo(
    () =>
      documents
        .filter((document) => {
          const matchesFolder =
            normalizedQuery || !selectedFolderId
              ? true
              : document.folderId === selectedFolderId;
          const matchesQuery =
            !normalizedQuery ||
            [
              document.title,
              document.contentMarkdown,
              ...document.tags.map((tag) => tag.name),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

          return matchesFolder && matchesQuery;
        })
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.title.localeCompare(right.title, "ko"),
        ),
    [documents, normalizedQuery, selectedFolderId],
  );
  const isDirty = Boolean(
    selectedDocument &&
      (draft.title !== selectedDocument.title ||
        draft.folderId !== selectedDocument.folderId ||
        draft.contentMarkdown !== selectedDocument.contentMarkdown ||
        draft.tags !==
          selectedDocument.tags.map((tag) => tag.name).join(", ")),
  );

  function resetMessages() {
    setError("");
    setNotice("");
  }

  function selectDocument(document: ManualDocumentRecord) {
    if (
      isDirty &&
      !window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")
    ) {
      return;
    }

    setSelectedDocumentId(document.id);
    setSelectedFolderId(document.folderId);
    setDraft(createDraft(document));
    setEditorView("EDIT");
    resetMessages();
  }

  function selectFolder(folderId: string) {
    if (
      isDirty &&
      !window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")
    ) {
      return;
    }

    setSelectedFolderId(folderId);
    const nextDocument = documents.find(
      (document) => document.folderId === folderId,
    );
    setSelectedDocumentId(nextDocument?.id ?? "");
    setDraft(createDraft(nextDocument));
    resetMessages();
  }

  async function createDocument() {
    const folderId = selectedFolderId || folders[0]?.id;

    if (!folderId) {
      setFolderDialog({ mode: "create", name: "", parentId: "" });
      setError("문서를 만들기 전에 폴더를 추가해 주세요.");
      return;
    }

    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch("/api/manuals/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const result = (await response.json()) as {
        document?: ManualDocumentRecord;
        error?: string;
      };

      if (!response.ok || !result.document) {
        throw new Error(result.error ?? "문서를 만들지 못했습니다.");
      }

      setDocuments((current) => [...current, result.document!]);
      setSelectedDocumentId(result.document.id);
      setSelectedFolderId(result.document.folderId);
      setDraft(createDraft(result.document));
      setEditorView("EDIT");
      setNotice("새 문서를 만들었습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "문서를 만들지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function saveDocument() {
    if (!selectedDocument || isSaving) return;

    setIsSaving(true);
    resetMessages();

    try {
      const response = await fetch(
        `/api/manuals/documents/${selectedDocument.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            folderId: draft.folderId,
            contentMarkdown: draft.contentMarkdown,
            tags: draft.tags.split(","),
          }),
        },
      );
      const result = (await response.json()) as {
        document?: ManualDocumentRecord;
        error?: string;
      };

      if (!response.ok || !result.document) {
        throw new Error(result.error ?? "문서를 저장하지 못했습니다.");
      }

      setDocuments((current) =>
        current.map((document) =>
          document.id === result.document!.id ? result.document! : document,
        ),
      );
      setSelectedFolderId(result.document.folderId);
      setDraft(createDraft(result.document));
      setNotice("문서를 저장했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "문서를 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDocument() {
    if (
      !selectedDocument ||
      !window.confirm(`"${selectedDocument.title}" 문서를 삭제할까요?`)
    ) {
      return;
    }

    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch(
        `/api/manuals/documents/${selectedDocument.id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        deletedDocumentId?: string;
        error?: string;
      };

      if (!response.ok || !result.deletedDocumentId) {
        throw new Error(result.error ?? "문서를 삭제하지 못했습니다.");
      }

      const nextDocuments = documents.filter(
        (document) => document.id !== result.deletedDocumentId,
      );
      const nextDocument =
        nextDocuments.find(
          (document) => document.folderId === selectedFolderId,
        ) ?? nextDocuments[0];

      setDocuments(nextDocuments);
      setSelectedDocumentId(nextDocument?.id ?? "");
      setSelectedFolderId(
        nextDocument?.folderId || selectedFolderId || folders[0]?.id || "",
      );
      setDraft(createDraft(nextDocument));
      setNotice("문서를 삭제했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "문서를 삭제하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function submitFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderDialog || isWorking) return;

    setIsWorking(true);
    resetMessages();

    try {
      const isCreate = folderDialog.mode === "create";
      const response = await fetch(
        isCreate
          ? "/api/manuals/folders"
          : `/api/manuals/folders/${folderDialog.folderId}`,
        {
          method: isCreate ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: folderDialog.name,
            parentId: folderDialog.parentId || null,
          }),
        },
      );
      const result = (await response.json()) as {
        folder?: ManualFolderRecord;
        error?: string;
      };

      if (!response.ok || !result.folder) {
        throw new Error(result.error ?? "폴더를 저장하지 못했습니다.");
      }

      setFolders((current) =>
        isCreate
          ? [...current, result.folder!]
          : current.map((folder) =>
              folder.id === result.folder!.id ? result.folder! : folder,
            ),
      );
      setSelectedFolderId(result.folder.id);
      if (isCreate) {
        setSelectedDocumentId("");
        setDraft(createDraft(undefined));
      }
      setFolderDialog(null);
      setNotice(isCreate ? "새 폴더를 만들었습니다." : "폴더 이름을 바꿨습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "폴더를 저장하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteFolder() {
    if (
      !selectedFolder ||
      !window.confirm(`"${selectedFolder.name}" 폴더를 삭제할까요?`)
    ) {
      return;
    }

    setIsWorking(true);
    resetMessages();

    try {
      let response = await fetch(
        `/api/manuals/folders/${selectedFolder.id}`,
        { method: "DELETE" },
      );
      let result = (await response.json()) as {
        deletedFolderId?: string;
        error?: string;
        requiresConfirmation?: boolean;
      };

      if (response.status === 409 && result.requiresConfirmation) {
        const confirmed = window.confirm(
          "하위 폴더와 문서도 모두 삭제됩니다. 계속할까요?",
        );

        if (!confirmed) return;

        response = await fetch(
          `/api/manuals/folders/${selectedFolder.id}?force=true`,
          { method: "DELETE" },
        );
        result = (await response.json()) as typeof result;
      }

      if (!response.ok || !result.deletedFolderId) {
        throw new Error(result.error ?? "폴더를 삭제하지 못했습니다.");
      }

      const deletedFolderIds = collectFolderIds(
        result.deletedFolderId,
        folders,
      );
      const nextFolders = folders.filter(
        (folder) => !deletedFolderIds.has(folder.id),
      );
      const nextDocuments = documents.filter(
        (document) => !deletedFolderIds.has(document.folderId),
      );
      const nextDocument = nextDocuments[0];

      setFolders(nextFolders);
      setDocuments(nextDocuments);
      setSelectedFolderId(
        nextDocument?.folderId ?? nextFolders[0]?.id ?? "",
      );
      setSelectedDocumentId(nextDocument?.id ?? "");
      setDraft(createDraft(nextDocument));
      setNotice("폴더를 삭제했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "폴더를 삭제하지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-[1120px] flex-col bg-[#f6f7fb]">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e2e6ef] bg-white px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3157f6]">
            <BookOpenText className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-[-0.03em]">
                원내매뉴얼
              </h1>
              <span className="rounded-full bg-[#f0edff] px-2 py-1 text-[9px] font-bold text-[#6657e9]">
                병원 전용
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-[#8c93a5]">
              {organizationName}의 상담 기준과 시술 정보를 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFolderDialog({
                mode: "create",
                name: "",
                parentId: selectedFolderId,
              })
            }
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3ec] bg-white px-3 text-xs font-bold text-[#626a80] hover:bg-[#f8f9fc]"
          >
            <FolderPlus className="size-3.5" /> 폴더 추가
          </button>
          <button
            type="button"
            onClick={() => void createDocument()}
            disabled={isWorking}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#3157f6] px-3.5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(49,87,246,0.2)] disabled:opacity-50"
          >
            {isWorking ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <FilePlus2 className="size-3.5" />
            )}
            문서 추가
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[250px_280px_minmax(560px,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-[#e3e6ee] bg-white">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#eceef4] px-4">
            <span className="text-xs font-bold text-[#50586e]">폴더</span>
            <span className="text-[10px] font-semibold text-[#a0a6b5]">
              {folders.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {orderedFolders.map(({ folder, depth }) => {
              const selected = folder.id === selectedFolderId;
              const count = documentCountByFolder.get(folder.id) ?? 0;

              return (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => selectFolder(folder.id)}
                  className={`group flex w-full items-center gap-2 py-2.5 pr-3 text-left text-xs ${
                    selected
                      ? "bg-[#eef2ff] font-bold text-[#3157f6]"
                      : "text-[#60687d] hover:bg-[#f8f9fc]"
                  }`}
                  style={{ paddingLeft: 14 + depth * 16 }}
                >
                  {depth > 0 ? (
                    <ChevronRight className="size-3 text-[#b1b6c3]" />
                  ) : null}
                  <Folder
                    className={`size-4 shrink-0 ${
                      selected ? "fill-[#dfe6ff]" : "text-[#9ba2b4]"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <span className="text-[9px] font-semibold text-[#a7adba]">
                    {count}
                  </span>
                </button>
              );
            })}

            {folders.length === 0 ? (
              <div className="px-5 py-10 text-center text-[11px] leading-5 text-[#9aa1b1]">
                폴더를 추가한 뒤
                <br />
                매뉴얼 문서를 작성해 주세요.
              </div>
            ) : null}
          </div>
          {selectedFolder ? (
            <div className="grid grid-cols-2 gap-2 border-t border-[#e8eaf1] p-3">
              <button
                type="button"
                onClick={() =>
                  setFolderDialog({
                    mode: "rename",
                    folderId: selectedFolder.id,
                    name: selectedFolder.name,
                    parentId: selectedFolder.parentId ?? "",
                  })
                }
                className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#e0e4ec] text-[10px] font-semibold text-[#6e7588] hover:bg-[#f8f9fc]"
              >
                <Pencil className="size-3" /> 이름 변경
              </button>
              <button
                type="button"
                onClick={() => void deleteFolder()}
                className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#f1dce1] text-[10px] font-semibold text-[#d34e63] hover:bg-[#fff5f6]"
              >
                <Trash2 className="size-3" /> 삭제
              </button>
            </div>
          ) : null}
        </aside>

        <section className="flex min-h-0 flex-col border-r border-[#e3e6ee] bg-[#fbfbfd]">
          <div className="shrink-0 border-b border-[#e7eaf1] p-3">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e0e4ed] bg-white px-3 text-[#9ba1b1] focus-within:border-[#7187f6]">
              <Search className="size-3.5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 내용, 태그 검색"
                className="min-w-0 flex-1 bg-transparent text-[11px] text-[#363c50] outline-none"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {visibleDocuments.map((document) => {
              const selected = document.id === selectedDocumentId;

              return (
                <button
                  type="button"
                  key={document.id}
                  onClick={() => selectDocument(document)}
                  className={`mb-1 w-full rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-[#cbd6ff] bg-white shadow-[0_4px_14px_rgba(49,87,246,0.08)]"
                      : "border-transparent hover:border-[#e5e8ef] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText
                      className={`mt-0.5 size-4 shrink-0 ${
                        selected ? "text-[#3157f6]" : "text-[#a0a6b4]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#42495d]">
                        {document.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#969cab]">
                        {document.contentMarkdown.replace(/[#*_>`-]/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between pl-6">
                    <div className="flex min-w-0 gap-1 overflow-hidden">
                      {document.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="shrink-0 rounded-md bg-[#f0edff] px-1.5 py-0.5 text-[8px] font-bold text-[#6657e9]"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0 text-[8px] text-[#afb4c0]">
                      {formatUpdatedAt(document.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })}

            {visibleDocuments.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-[#a1a7b6]">
                <FileText className="mb-2 size-6" />
                <p className="text-xs">
                  {normalizedQuery
                    ? "검색 결과가 없습니다."
                    : "이 폴더에 문서가 없습니다."}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <main className="relative flex min-h-0 flex-col bg-white">
          {selectedDocument ? (
            <>
              <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e5e8ef] px-5">
                <div className="min-w-0 flex-1 pr-5">
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    aria-label="문서 제목"
                    className="w-full truncate bg-transparent text-base font-bold tracking-[-0.02em] text-[#2f3549] outline-none"
                  />
                  <p className="mt-1 text-[9px] text-[#a0a6b4]">
                    /{selectedDocument.slug}
                    {isDirty ? " · 저장되지 않은 변경사항" : " · 저장됨"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void deleteDocument()}
                    disabled={isWorking}
                    aria-label="문서 삭제"
                    className="flex size-9 items-center justify-center rounded-lg border border-[#eddde1] text-[#d34e63] hover:bg-[#fff5f6]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveDocument()}
                    disabled={!isDirty || isSaving}
                    className="flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-lg bg-[#3157f6] px-3 text-xs font-bold text-white disabled:bg-[#cbd1df]"
                  >
                    {isSaving ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : isDirty ? (
                      <Save className="size-3.5" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    {isSaving ? "저장 중" : isDirty ? "저장" : "저장됨"}
                  </button>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-[#e8eaf1] bg-[#fafbfe] px-5 py-3">
                <label className="flex items-center gap-2">
                  <Folder className="size-3.5 shrink-0 text-[#8e95a7]" />
                  <select
                    value={draft.folderId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        folderId: event.target.value,
                      }))
                    }
                    aria-label="문서 폴더"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-[#e0e4ec] bg-white px-2.5 text-[10px] font-semibold text-[#626a7d] outline-none"
                  >
                    {orderedFolders.map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {"　".repeat(depth)}
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <Tags className="size-3.5 shrink-0 text-[#8e95a7]" />
                  <input
                    value={draft.tags}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="태그를 쉼표로 구분"
                    aria-label="문서 태그"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-[#e0e4ec] bg-white px-2.5 text-[10px] text-[#626a7d] outline-none"
                  />
                </label>
              </div>

              <SectionTabs
                ariaLabel="문서 편집 보기"
                options={editorTabs}
                value={editorView}
                onValueChange={setEditorView}
              />

              <div className="min-h-0 flex-1 overflow-y-auto">
                {editorView === "EDIT" ? (
                  <textarea
                    value={draft.contentMarkdown}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contentMarkdown: event.target.value,
                      }))
                    }
                    aria-label="매뉴얼 내용"
                    spellCheck={false}
                    className="h-full min-h-[560px] w-full resize-none bg-white px-7 py-6 font-mono text-[12px] leading-7 text-[#454c60] outline-none"
                  />
                ) : (
                  <article className="mx-auto max-w-[820px] px-8 py-7 text-[12px] leading-7 text-[#4e5568] [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#8066ec] [&_blockquote]:bg-[#f7f5ff] [&_blockquote]:px-4 [&_blockquote]:py-2 [&_h1]:mb-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#292f43] [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#31384d] [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-bold [&_strong]:text-[#31384d]">
                    <ReactMarkdown>{draft.contentMarkdown}</ReactMarkdown>
                  </article>
                )}
              </div>

              {error || notice ? (
                <div
                  role={error ? "alert" : "status"}
                  className={`absolute bottom-5 right-5 flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg ${
                    error
                      ? "bg-[#fff0f2] text-[#d8465b]"
                      : "bg-[#edf8f2] text-[#168657]"
                  }`}
                >
                  {error ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                  {error || notice}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#3157f6]">
                <BookOpenText className="size-7" />
              </span>
              <h2 className="text-sm font-bold text-[#41485c]">
                편집할 매뉴얼을 선택해 주세요
              </h2>
              <p className="mt-2 text-[11px] leading-5 text-[#939aab]">
                병원 상담팀이 함께 참고할 시술 정보와
                <br />
                응대 기준을 문서로 관리할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => void createDocument()}
                className="mt-5 flex h-9 items-center gap-1.5 rounded-lg bg-[#3157f6] px-4 text-xs font-bold text-white"
              >
                <FilePlus2 className="size-3.5" /> 첫 문서 만들기
              </button>
            </div>
          )}
        </main>
      </div>

      {folderDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171c31]/35 p-6 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setFolderDialog(null)}
            aria-label="폴더 창 닫기"
          />
          <form
            onSubmit={(event) => void submitFolder(event)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-folder-dialog-title"
            className="relative w-full max-w-sm rounded-2xl border border-[#e2e5ed] bg-white p-5 shadow-[0_24px_70px_rgba(24,31,65,0.2)]"
          >
            <div className="flex items-center justify-between">
              <h2 id="manual-folder-dialog-title" className="text-sm font-bold">
                {folderDialog.mode === "create" ? "새 폴더" : "폴더 이름 변경"}
              </h2>
              <button
                type="button"
                onClick={() => setFolderDialog(null)}
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-lg text-[#8e95a7] hover:bg-[#f4f5f8]"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="mt-5 block text-[10px] font-bold text-[#697084]">
              폴더 이름
              <input
                autoFocus
                value={folderDialog.name}
                onChange={(event) =>
                  setFolderDialog((current) =>
                    current ? { ...current, name: event.target.value } : null,
                  )
                }
                maxLength={50}
                className="mt-2 h-10 w-full rounded-xl border border-[#dfe3ec] px-3 text-xs font-medium outline-none focus:border-[#7187f6]"
              />
            </label>
            {folderDialog.mode === "create" ? (
              <label className="mt-4 block text-[10px] font-bold text-[#697084]">
                상위 폴더
                <select
                  value={folderDialog.parentId}
                  onChange={(event) =>
                    setFolderDialog((current) =>
                      current
                        ? { ...current, parentId: event.target.value }
                        : null,
                    )
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-[#dfe3ec] bg-white px-3 text-xs outline-none focus:border-[#7187f6]"
                >
                  <option value="">최상위 폴더</option>
                  {orderedFolders.map(({ folder, depth }) => (
                    <option key={folder.id} value={folder.id}>
                      {"　".repeat(depth)}
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-lg bg-[#fff0f2] px-3 py-2 text-[10px] font-semibold text-[#d8465b]">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFolderDialog(null)}
                className="h-9 rounded-lg border border-[#dfe3ec] px-4 text-xs font-semibold text-[#6f7689]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isWorking || !folderDialog.name.trim()}
                className="flex h-9 min-w-[76px] items-center justify-center gap-1.5 rounded-lg bg-[#3157f6] px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                {isWorking ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                저장
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
