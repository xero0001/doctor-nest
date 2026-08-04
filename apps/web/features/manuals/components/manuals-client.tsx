"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Check,
  ChevronRight,
  FilePlus2,
  Folder,
  FolderPlus,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from "react";
import { Fragment, useMemo, useState } from "react";

import { SectionTabs } from "@/components/section-tabs";
import { SECTION_SIDEBAR_WIDTH_PX } from "@/features/navigation/components/section-sidebar";
import type {
  ManualDocumentRecord,
  ManualDocumentImageRecord,
  ManualFolderRecord,
} from "@/features/manuals/types";

type DocumentDraft = {
  title: string;
  folderId: string;
  tags: string;
  contentMarkdown: string;
  cautionMarkdown: string;
  cautionEnabled: boolean;
  isActive: boolean;
  images: ManualDocumentImageRecord[];
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

type DraggedTreeItem = {
  kind: "folder" | "document";
  id: string;
};

type DropPlacement = "before" | "inside" | "after";

type TreeDropTarget = {
  kind: "root" | "folder" | "document";
  id?: string;
  placement: DropPlacement;
};

const manualAreaTabs = [
  { value: "MANUAL", label: "치료태그 매뉴얼" },
  {
    value: "GLOSSARY",
    label: "용어 사전",
    disabled: true,
    title: "용어 사전은 준비 중입니다.",
  },
] as const;

const manualImageAccept =
  "image/jpeg,image/png,image/webp,image/gif,image/avif";
const manualImageTypes = new Set(manualImageAccept.split(","));
const maxManualImageSizeBytes = 10 * 1024 * 1024;

const ManualContentEditor = dynamic(
  () =>
    import("@/features/manuals/components/manual-content-editor").then(
      (module) => module.ManualContentEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[476px] animate-pulse rounded-xl border border-[#e1e5ed] bg-[#fafbfc]" />
    ),
  },
);

function createDraft(
  document: ManualDocumentRecord | undefined,
): DocumentDraft {
  return {
    title: document?.title ?? "",
    folderId: document?.folderId ?? "",
    tags: document?.tags.map((tag) => tag.name).join(", ") ?? "",
    contentMarkdown: document?.contentMarkdown ?? "",
    cautionMarkdown: document?.cautionMarkdown ?? "",
    cautionEnabled: document?.cautionEnabled ?? false,
    isActive: document?.isActive ?? true,
    images: document?.images ?? [],
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
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }

  return ids;
}

function getDropPlacement(
  event: DragEvent<HTMLElement>,
  allowInside: boolean,
): DropPlacement {
  const bounds = event.currentTarget.getBoundingClientRect();
  const offsetRatio = (event.clientY - bounds.top) / bounds.height;

  if (!allowInside) return offsetRatio < 0.5 ? "before" : "after";
  if (offsetRatio < 0.25) return "before";
  if (offsetRatio > 0.75) return "after";
  return "inside";
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
  const [manualArea, setManualArea] = useState<"MANUAL" | "GLOSSARY">("MANUAL");
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [draggedTreeItem, setDraggedTreeItem] =
    useState<DraggedTreeItem | null>(null);
  const [treeDropTarget, setTreeDropTarget] =
    useState<TreeDropTarget | null>(null);
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
  const documentsByFolder = useMemo(() => {
    const grouped = new Map<string, ManualDocumentRecord[]>();

    for (const document of documents) {
      grouped.set(document.folderId, [
        ...(grouped.get(document.folderId) ?? []),
        document,
      ]);
    }

    for (const items of grouped.values()) {
      items.sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "ko"),
      );
    }

    return grouped;
  }, [documents]);
  const normalizedQuery = query.trim().toLowerCase();
  const isDirty = Boolean(
    selectedDocument &&
    (draft.title !== selectedDocument.title ||
      draft.folderId !== selectedDocument.folderId ||
      draft.contentMarkdown !== selectedDocument.contentMarkdown ||
      draft.cautionMarkdown !== selectedDocument.cautionMarkdown ||
      draft.cautionEnabled !== selectedDocument.cautionEnabled ||
      draft.isActive !== selectedDocument.isActive ||
      JSON.stringify(draft.images) !==
        JSON.stringify(selectedDocument.images) ||
      draft.tags !== selectedDocument.tags.map((tag) => tag.name).join(", ")),
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
            cautionMarkdown: draft.cautionMarkdown,
            cautionEnabled: draft.cautionEnabled,
            isActive: draft.isActive,
            tags: draft.tags.split(","),
            images: draft.images.map((image) => ({
              objectKey: image.objectKey,
              originalName: image.originalName,
              contentType: image.contentType,
              sizeBytes: image.sizeBytes,
              altText: image.altText,
            })),
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
      setNotice(
        isCreate ? "새 폴더를 만들었습니다." : "폴더 이름을 바꿨습니다.",
      );
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
      let response = await fetch(`/api/manuals/folders/${selectedFolder.id}`, {
        method: "DELETE",
      });
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
      setSelectedFolderId(nextDocument?.folderId ?? nextFolders[0]?.id ?? "");
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

  async function moveFolder(folder: ManualFolderRecord, direction: -1 | 1) {
    if (isWorking) return;

    const siblings = folders
      .filter((item) => item.parentId === folder.parentId)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "ko"),
      );
    const currentIndex = siblings.findIndex((item) => item.id === folder.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const previousFolders = folders;
    const reordered = [...siblings];
    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];
    const orderById = new Map(
      reordered.map((item, sortOrder) => [item.id, sortOrder]),
    );
    setFolders((current) =>
      current.map((item) =>
        orderById.has(item.id)
          ? { ...item, sortOrder: orderById.get(item.id)! }
          : item,
      ),
    );
    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch("/api/manuals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "folders",
          itemId: folder.id,
          parentId: folder.parentId,
          orderedIds: reordered.map((item) => item.id),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "폴더 순서를 바꾸지 못했습니다.");
      }
      setNotice("폴더 순서를 저장했습니다.");
    } catch (caughtError) {
      setFolders(previousFolders);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "폴더 순서를 바꾸지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function moveDocument(
    document: ManualDocumentRecord,
    direction: -1 | 1,
  ) {
    if (isWorking) return;

    const siblings = documentsByFolder.get(document.folderId) ?? [];
    const currentIndex = siblings.findIndex((item) => item.id === document.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const previousDocuments = documents;
    const reordered = [...siblings];
    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];
    const orderById = new Map(
      reordered.map((item, sortOrder) => [item.id, sortOrder]),
    );
    setDocuments((current) =>
      current.map((item) =>
        orderById.has(item.id)
          ? { ...item, sortOrder: orderById.get(item.id)! }
          : item,
      ),
    );
    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch("/api/manuals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "documents",
          itemId: document.id,
          folderId: document.folderId,
          orderedIds: reordered.map((item) => item.id),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "치료태그 순서를 바꾸지 못했습니다.");
      }
      setNotice("치료태그 순서를 저장했습니다.");
    } catch (caughtError) {
      setDocuments(previousDocuments);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "치료태그 순서를 바꾸지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function relocateFolder(
    folderId: string,
    targetParentId: string | null,
    targetIndex: number,
  ) {
    if (isWorking) return;

    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;

    const descendantIds = collectFolderIds(folder.id, folders);
    if (targetParentId && descendantIds.has(targetParentId)) {
      setError("폴더를 자기 자신이나 하위 폴더 안으로 옮길 수 없습니다.");
      return;
    }

    const previousFolders = folders;
    const sourceSiblings = folders
      .filter(
        (item) => item.parentId === folder.parentId && item.id !== folder.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "ko"),
      );
    const targetSiblings = folders
      .filter(
        (item) => item.parentId === targetParentId && item.id !== folder.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "ko"),
      );
    const insertionIndex = Math.max(
      0,
      Math.min(targetIndex, targetSiblings.length),
    );
    const reorderedTarget = [...targetSiblings];
    reorderedTarget.splice(insertionIndex, 0, {
      ...folder,
      parentId: targetParentId,
    });

    const currentTargetOrder = folders
      .filter((item) => item.parentId === targetParentId)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "ko"),
      )
      .map((item) => item.id);
    const nextTargetOrder = reorderedTarget.map((item) => item.id);
    if (
      folder.parentId === targetParentId &&
      currentTargetOrder.join(":") === nextTargetOrder.join(":")
    ) {
      return;
    }

    const sourceOrderById = new Map(
      sourceSiblings.map((item, sortOrder) => [item.id, sortOrder]),
    );
    const targetOrderById = new Map(
      reorderedTarget.map((item, sortOrder) => [item.id, sortOrder]),
    );
    setFolders((current) =>
      current.map((item) => {
        const targetSortOrder = targetOrderById.get(item.id);
        if (targetSortOrder !== undefined) {
          return {
            ...item,
            parentId: item.id === folder.id ? targetParentId : item.parentId,
            sortOrder: targetSortOrder,
          };
        }

        const sourceSortOrder = sourceOrderById.get(item.id);
        return sourceSortOrder === undefined
          ? item
          : { ...item, sortOrder: sourceSortOrder };
      }),
    );
    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch("/api/manuals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "folders",
          itemId: folder.id,
          parentId: targetParentId,
          orderedIds: nextTargetOrder,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "폴더를 옮기지 못했습니다.");
      }
      setNotice("폴더 위치를 저장했습니다.");
    } catch (caughtError) {
      setFolders(previousFolders);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "폴더를 옮기지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function relocateDocument(
    documentId: string,
    targetFolderId: string,
    targetIndex: number,
  ) {
    if (isWorking) return;

    const document = documents.find((item) => item.id === documentId);
    if (!document || !folders.some((folder) => folder.id === targetFolderId)) {
      return;
    }

    const previousDocuments = documents;
    const previousDraftFolderId = draft.folderId;
    const sourceSiblings = documents
      .filter(
        (item) =>
          item.folderId === document.folderId && item.id !== document.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "ko"),
      );
    const targetSiblings = documents
      .filter(
        (item) =>
          item.folderId === targetFolderId && item.id !== document.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "ko"),
      );
    const insertionIndex = Math.max(
      0,
      Math.min(targetIndex, targetSiblings.length),
    );
    const reorderedTarget = [...targetSiblings];
    reorderedTarget.splice(insertionIndex, 0, {
      ...document,
      folderId: targetFolderId,
    });

    const currentTargetOrder = documents
      .filter((item) => item.folderId === targetFolderId)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "ko"),
      )
      .map((item) => item.id);
    const nextTargetOrder = reorderedTarget.map((item) => item.id);
    if (
      document.folderId === targetFolderId &&
      currentTargetOrder.join(":") === nextTargetOrder.join(":")
    ) {
      return;
    }

    const sourceOrderById = new Map(
      sourceSiblings.map((item, sortOrder) => [item.id, sortOrder]),
    );
    const targetOrderById = new Map(
      reorderedTarget.map((item, sortOrder) => [item.id, sortOrder]),
    );
    setDocuments((current) =>
      current.map((item) => {
        const targetSortOrder = targetOrderById.get(item.id);
        if (targetSortOrder !== undefined) {
          return {
            ...item,
            folderId:
              item.id === document.id ? targetFolderId : item.folderId,
            sortOrder: targetSortOrder,
          };
        }

        const sourceSortOrder = sourceOrderById.get(item.id);
        return sourceSortOrder === undefined
          ? item
          : { ...item, sortOrder: sourceSortOrder };
      }),
    );
    if (selectedDocumentId === document.id) {
      setSelectedFolderId(targetFolderId);
      setDraft((current) => ({ ...current, folderId: targetFolderId }));
    }
    setIsWorking(true);
    resetMessages();

    try {
      const response = await fetch("/api/manuals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "documents",
          itemId: document.id,
          folderId: targetFolderId,
          orderedIds: nextTargetOrder,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "치료태그를 옮기지 못했습니다.");
      }
      setNotice("치료태그 위치를 저장했습니다.");
    } catch (caughtError) {
      setDocuments(previousDocuments);
      if (selectedDocumentId === document.id) {
        setSelectedFolderId(document.folderId);
        setDraft((current) => ({
          ...current,
          folderId: previousDraftFolderId,
        }));
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "치료태그를 옮기지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  function startTreeDrag(
    event: DragEvent<HTMLButtonElement>,
    item: DraggedTreeItem,
  ) {
    if (isWorking || normalizedQuery) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${item.kind}:${item.id}`);
    setDraggedTreeItem(item);
    setTreeDropTarget(null);
  }

  function finishTreeDrag() {
    setDraggedTreeItem(null);
    setTreeDropTarget(null);
  }

  function handleFolderDragOver(
    event: DragEvent<HTMLDivElement>,
    folder: ManualFolderRecord,
  ) {
    if (!draggedTreeItem || isWorking || normalizedQuery) return;

    if (draggedTreeItem.kind === "folder") {
      const descendantIds = collectFolderIds(draggedTreeItem.id, folders);
      if (descendantIds.has(folder.id)) return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setTreeDropTarget({
      kind: "folder",
      id: folder.id,
      placement:
        draggedTreeItem.kind === "document"
          ? "inside"
          : getDropPlacement(event, true),
    });
  }

  function dropOnFolder(
    event: DragEvent<HTMLDivElement>,
    folder: ManualFolderRecord,
  ) {
    event.preventDefault();
    const draggedItem = draggedTreeItem;
    const placement =
      treeDropTarget?.kind === "folder" && treeDropTarget.id === folder.id
        ? treeDropTarget.placement
        : "inside";
    finishTreeDrag();
    if (!draggedItem) return;

    if (draggedItem.kind === "document") {
      const targetIndex = documents.filter(
        (document) =>
          document.folderId === folder.id && document.id !== draggedItem.id,
      ).length;
      void relocateDocument(draggedItem.id, folder.id, targetIndex);
      return;
    }

    if (placement === "inside") {
      const targetIndex = folders.filter(
        (item) => item.parentId === folder.id && item.id !== draggedItem.id,
      ).length;
      void relocateFolder(draggedItem.id, folder.id, targetIndex);
      return;
    }

    const targetSiblings = folders
      .filter(
        (item) =>
          item.parentId === folder.parentId && item.id !== draggedItem.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "ko"),
      );
    const folderIndex = targetSiblings.findIndex(
      (item) => item.id === folder.id,
    );
    void relocateFolder(
      draggedItem.id,
      folder.parentId,
      folderIndex + (placement === "after" ? 1 : 0),
    );
  }

  function handleDocumentDragOver(
    event: DragEvent<HTMLDivElement>,
    document: ManualDocumentRecord,
  ) {
    if (
      draggedTreeItem?.kind !== "document" ||
      isWorking ||
      normalizedQuery ||
      draggedTreeItem.id === document.id
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setTreeDropTarget({
      kind: "document",
      id: document.id,
      placement: getDropPlacement(event, false),
    });
  }

  function dropOnDocument(
    event: DragEvent<HTMLDivElement>,
    document: ManualDocumentRecord,
  ) {
    event.preventDefault();
    const draggedItem = draggedTreeItem;
    const placement =
      treeDropTarget?.kind === "document" &&
      treeDropTarget.id === document.id
        ? treeDropTarget.placement
        : "before";
    finishTreeDrag();
    if (draggedItem?.kind !== "document") return;

    const targetSiblings = (documentsByFolder.get(document.folderId) ?? [])
      .filter((item) => item.id !== draggedItem.id)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "ko"),
      );
    const documentIndex = targetSiblings.findIndex(
      (item) => item.id === document.id,
    );
    void relocateDocument(
      draggedItem.id,
      document.folderId,
      documentIndex + (placement === "after" ? 1 : 0),
    );
  }

  function handleRootDragOver(event: DragEvent<HTMLDivElement>) {
    if (
      draggedTreeItem?.kind !== "folder" ||
      isWorking ||
      normalizedQuery
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setTreeDropTarget({ kind: "root", placement: "inside" });
  }

  function dropOnRoot(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const draggedItem = draggedTreeItem;
    finishTreeDrag();
    if (draggedItem?.kind !== "folder") return;

    const targetIndex = folders.filter(
      (folder) => folder.parentId === null && folder.id !== draggedItem.id,
    ).length;
    void relocateFolder(draggedItem.id, null, targetIndex);
  }

  function handleTreeHandleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    item: DraggedTreeItem,
  ) {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowUp" ? -1 : 1;
    if (item.kind === "folder") {
      const folder = folders.find((candidate) => candidate.id === item.id);
      if (folder) void moveFolder(folder, direction);
    } else {
      const document = documents.find((candidate) => candidate.id === item.id);
      if (document) void moveDocument(document, direction);
    }
  }

  async function toggleFolderActive(folder: ManualFolderRecord) {
    if (isWorking) return;
    const nextActive = !folder.isActive;
    const previousFolders = folders;
    const affectedFolderIds = collectFolderIds(folder.id, folders);
    setIsWorking(true);
    resetMessages();
    setFolders((current) =>
      current.map((item) =>
        affectedFolderIds.has(item.id)
          ? { ...item, isActive: nextActive }
          : item,
      ),
    );

    try {
      const response = await fetch(`/api/manuals/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const result = (await response.json()) as {
        folder?: ManualFolderRecord;
        affectedFolderIds?: string[];
        error?: string;
      };
      if (!response.ok || !result.folder) {
        throw new Error(result.error ?? "폴더 사용 여부를 바꾸지 못했습니다.");
      }
      const savedAffectedIds = new Set(result.affectedFolderIds ?? [folder.id]);
      setFolders((current) =>
        current.map((item) => {
          if (item.id === folder.id) return result.folder!;
          return savedAffectedIds.has(item.id)
            ? { ...item, isActive: nextActive }
            : item;
        }),
      );
    } catch (caughtError) {
      setFolders(previousFolders);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "폴더 사용 여부를 바꾸지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function toggleDocumentActive(document: ManualDocumentRecord) {
    if (isWorking) return;
    const nextActive = !document.isActive;
    setIsWorking(true);
    resetMessages();
    setDocuments((current) =>
      current.map((item) =>
        item.id === document.id ? { ...item, isActive: nextActive } : item,
      ),
    );
    if (selectedDocumentId === document.id) {
      setDraft((current) => ({ ...current, isActive: nextActive }));
    }

    try {
      const response = await fetch(`/api/manuals/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const result = (await response.json()) as {
        document?: ManualDocumentRecord;
        error?: string;
      };
      if (!response.ok || !result.document) {
        throw new Error(
          result.error ?? "치료태그 사용 여부를 바꾸지 못했습니다.",
        );
      }
      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id ? result.document! : item,
        ),
      );
    } catch (caughtError) {
      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id
            ? { ...item, isActive: document.isActive }
            : item,
        ),
      );
      if (selectedDocumentId === document.id) {
        setDraft((current) => ({ ...current, isActive: document.isActive }));
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "치료태그 사용 여부를 바꾸지 못했습니다.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function uploadImageFiles(files: File[]) {
    if (files.length === 0 || isUploadingImages) return;

    if (draft.images.length + files.length > 10) {
      setError("이미지는 최대 10개까지 등록할 수 있습니다.");
      return;
    }

    if (files.some((file) => !manualImageTypes.has(file.type))) {
      setError("JPG, PNG, WebP, GIF, AVIF 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (files.some((file) => file.size > maxManualImageSizeBytes)) {
      setError("이미지는 파일당 10MB까지 업로드할 수 있습니다.");
      return;
    }

    setIsUploadingImages(true);
    resetMessages();

    try {
      const uploadedImages: ManualDocumentImageRecord[] = [];

      for (const file of files) {
        const signingResponse = await fetch("/api/manuals/images/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });
        const signingResult = (await signingResponse.json()) as {
          uploadUrl?: string;
          image?: Omit<
            ManualDocumentImageRecord,
            "id" | "altText" | "sortOrder"
          >;
          error?: string;
        };

        if (
          !signingResponse.ok ||
          !signingResult.uploadUrl ||
          !signingResult.image
        ) {
          throw new Error(
            signingResult.error ?? "이미지 업로드를 준비하지 못했습니다.",
          );
        }

        const uploadResponse = await fetch(signingResult.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error(`${file.name} 이미지를 업로드하지 못했습니다.`);
        }

        uploadedImages.push({
          ...signingResult.image,
          id: `pending:${signingResult.image.objectKey}`,
          altText: "",
          sortOrder: draft.images.length + uploadedImages.length,
        });
      }

      setDraft((current) => ({
        ...current,
        images: [...current.images, ...uploadedImages],
      }));
      setNotice("이미지를 업로드했습니다. 저장 버튼을 눌러 반영해 주세요.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setIsUploadingImages(false);
    }
  }

  function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadImageFiles(files);
  }

  function moveDraftImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.images.length) return;

    setDraft((current) => {
      const images = [...current.images];
      [images[index], images[targetIndex]] = [
        images[targetIndex],
        images[index],
      ];
      return {
        ...current,
        images: images.map((image, sortOrder) => ({ ...image, sortOrder })),
      };
    });
  }

  return (
    <div className="relative h-full min-h-0 min-w-[1120px]">
      <div
        className="grid h-full min-h-0 bg-[#f6f7fb]"
        style={{
          gridTemplateColumns: `${SECTION_SIDEBAR_WIDTH_PX}px minmax(760px, 1fr)`,
        }}
      >
        <aside className="flex min-h-0 flex-col border-r border-[#e3e6ee] bg-white">
          <SectionTabs
            ariaLabel="원내매뉴얼 구분"
            options={manualAreaTabs}
            value={manualArea}
            onValueChange={setManualArea}
          />
          <div className="shrink-0 border-b border-[#eceef4] px-4 py-4">
            <p className="text-xs leading-5 text-[#8c93a5]">
              {organizationName}의 상담 기준과 시술 정보를 관리합니다.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFolderDialog({
                    mode: "create",
                    name: "",
                    parentId: selectedFolderId,
                  })
                }
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dfe3ec] bg-white px-3 text-xs font-bold text-[#626a80] hover:bg-[#f8f9fc]"
              >
                <FolderPlus className="size-3.5" /> 폴더 추가
              </button>
              <button
                type="button"
                onClick={() => void createDocument()}
                disabled={isWorking}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#3157f6] px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {isWorking ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <FilePlus2 className="size-3.5" />
                )}
                치료태그 추가
              </button>
            </div>
          </div>
          <div
            onDragOver={handleRootDragOver}
            onDrop={dropOnRoot}
            className={`flex h-12 shrink-0 items-center justify-between border-b px-4 transition-colors ${
              treeDropTarget?.kind === "root"
                ? "border-[#3157f6] bg-[#eef3ff]"
                : "border-transparent"
            }`}
          >
            <span className="text-sm font-bold text-[#50586e]">
              <span className="font-extrabold text-[#303748]">전체 폴더</span>
              <span className="mx-1.5 text-[#a0a6b5]">·</span>
              치료태그 {documents.length}
            </span>
            {draggedTreeItem?.kind === "folder" ? (
              <span className="text-[11px] font-bold text-[#3157f6]">
                여기에 놓으면 최상위로 이동
              </span>
            ) : null}
          </div>
          <div className="shrink-0 border-b border-[#eceef4] px-3 pb-3">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e0e4ed] bg-[#fafbfc] px-3 text-[#9ba1b1] focus-within:border-[#7187f6] focus-within:bg-white">
              <Search className="size-3.5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="폴더명 또는 치료태그 검색"
                className="min-w-0 flex-1 bg-transparent text-xs text-[#363c50] outline-none"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {orderedFolders.map(({ folder, depth }) => {
              const selected = folder.id === selectedFolderId;
              const count = documentCountByFolder.get(folder.id) ?? 0;
              const folderDocuments = (
                documentsByFolder.get(folder.id) ?? []
              ).filter(
                (document) =>
                  !normalizedQuery ||
                  [
                    document.title,
                    document.contentMarkdown,
                    ...document.tags.map((tag) => tag.name),
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedQuery),
              );
              const matchesFolder = folder.name
                .toLowerCase()
                .includes(normalizedQuery);
              if (
                normalizedQuery &&
                !matchesFolder &&
                folderDocuments.length === 0
              ) {
                return null;
              }

              const folderDropPlacement =
                treeDropTarget?.kind === "folder" &&
                treeDropTarget.id === folder.id
                  ? treeDropTarget.placement
                  : null;

              return (
                <Fragment key={folder.id}>
                  <div
                    data-manual-folder-id={folder.id}
                    onDragOver={(event) => handleFolderDragOver(event, folder)}
                    onDrop={(event) => dropOnFolder(event, folder)}
                    className={`group flex h-12 items-center border-y-2 border-transparent pr-2 text-[15px] transition-colors ${
                      selected
                        ? "bg-[#eef2ff] font-extrabold text-[#3157f6]"
                        : "text-[#60687d] hover:bg-[#f8f9fc]"
                    } ${folder.isActive ? "" : "opacity-50"} ${
                      folderDropPlacement === "before"
                        ? "border-t-[#3157f6]"
                        : folderDropPlacement === "after"
                          ? "border-b-[#3157f6]"
                          : folderDropPlacement === "inside"
                            ? "border-[#8ca0fa] bg-[#e8efff]"
                            : ""
                    }`}
                    style={{ paddingLeft: 10 + depth * 16 }}
                  >
                    <button
                      type="button"
                      draggable={!isWorking && !normalizedQuery}
                      onDragStart={(event) =>
                        startTreeDrag(event, { kind: "folder", id: folder.id })
                      }
                      onDragEnd={finishTreeDrag}
                      onKeyDown={(event) =>
                        handleTreeHandleKeyDown(event, {
                          kind: "folder",
                          id: folder.id,
                        })
                      }
                      disabled={isWorking || Boolean(normalizedQuery)}
                      aria-label={`${folder.name} 폴더 드래그하여 이동`}
                      title="드래그하여 이동 · Alt+↑/↓로 순서 변경"
                      className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#b0b6c3] hover:bg-white hover:text-[#687187] active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectFolder(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-1.5 text-left"
                    >
                      {depth > 0 ? (
                        <ChevronRight className="size-3.5 text-[#b1b6c3]" />
                      ) : null}
                      <Folder
                        className={`size-[18px] shrink-0 ${
                          selected ? "fill-[#dfe6ff]" : "text-[#9ba2b4]"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {folder.name}
                      </span>
                      <span className="text-xs font-semibold text-[#a7adba]">
                        {count}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={folder.isActive}
                      onClick={() => void toggleFolderActive(folder)}
                      disabled={isWorking}
                      aria-label={`${folder.name} 폴더 ${folder.isActive ? "비활성화" : "활성화"}`}
                      className={`relative ml-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
                        folder.isActive ? "bg-[#3157f6]" : "bg-[#cfd4de]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                          folder.isActive ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {(normalizedQuery
                    ? folderDocuments
                    : (documentsByFolder.get(folder.id) ?? [])
                  ).map((document) => {
                    const documentSelected = document.id === selectedDocumentId;
                    const documentDropPlacement =
                      treeDropTarget?.kind === "document" &&
                      treeDropTarget.id === document.id
                        ? treeDropTarget.placement
                        : null;

                    return (
                      <div
                        key={document.id}
                        data-manual-document-id={document.id}
                        onDragOver={(event) =>
                          handleDocumentDragOver(event, document)
                        }
                        onDrop={(event) => dropOnDocument(event, document)}
                        className={`flex min-h-11 items-center border-y-2 border-transparent pr-2 text-sm transition-colors ${
                          documentSelected
                            ? "bg-[#f3f6ff] font-bold text-[#3157f6]"
                            : "font-semibold text-[#687084] hover:bg-[#fafbfc]"
                        } ${document.isActive ? "" : "opacity-50"} ${
                          documentDropPlacement === "before"
                            ? "border-t-[#3157f6]"
                            : documentDropPlacement === "after"
                              ? "border-b-[#3157f6]"
                              : ""
                        }`}
                        style={{ paddingLeft: 30 + depth * 16 }}
                      >
                        <button
                          type="button"
                          draggable={!isWorking && !normalizedQuery}
                          onDragStart={(event) =>
                            startTreeDrag(event, {
                              kind: "document",
                              id: document.id,
                            })
                          }
                          onDragEnd={finishTreeDrag}
                          onKeyDown={(event) =>
                            handleTreeHandleKeyDown(event, {
                              kind: "document",
                              id: document.id,
                            })
                          }
                          disabled={isWorking || Boolean(normalizedQuery)}
                          aria-label={`${document.title} 치료태그 드래그하여 이동`}
                          title="드래그하여 이동 · Alt+↑/↓로 순서 변경"
                          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-[#c0c5cf] hover:bg-white hover:text-[#687187] active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
                        >
                          <GripVertical className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => selectDocument(document)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-2 text-left"
                        >
                          <Tags className="size-4 shrink-0 text-[#ed5b6c]" />
                          <span className="truncate">{document.title}</span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={document.isActive}
                          onClick={() => void toggleDocumentActive(document)}
                          disabled={isWorking}
                          aria-label={`${document.title} ${document.isActive ? "비활성화" : "활성화"}`}
                          className={`relative ml-1 h-5 w-9 shrink-0 rounded-full transition-colors ${
                            document.isActive ? "bg-[#3157f6]" : "bg-[#cfd4de]"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
                              document.isActive ? "left-[18px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}

            {folders.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs leading-5 text-[#9aa1b1]">
                폴더를 추가한 뒤
                <br />
                치료태그 매뉴얼을 작성해 주세요.
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
                className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#e0e4ec] text-xs font-semibold text-[#6e7588] hover:bg-[#f8f9fc]"
              >
                <Pencil className="size-3" /> 이름 변경
              </button>
              <button
                type="button"
                onClick={() => void deleteFolder()}
                className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#f1dce1] text-xs font-semibold text-[#d34e63] hover:bg-[#fff5f6]"
              >
                <Trash2 className="size-3" /> 삭제
              </button>
            </div>
          ) : null}
        </aside>

        <main className="relative flex min-h-0 flex-col bg-white">
          {selectedDocument ? (
            <>
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e8ef] px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-5">
                  <Tags className="size-5 shrink-0 text-[#eb3e52]" />
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    aria-label="치료태그 이름"
                    className="min-w-0 flex-1 truncate bg-transparent text-base font-extrabold tracking-[-0.02em] text-[#2f3549] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.isActive}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        isActive: !current.isActive,
                      }))
                    }
                    className="flex h-9 items-center gap-2 rounded-lg border border-[#dfe3ec] px-3 text-xs font-bold text-[#697084]"
                  >
                    AI 필수 참조
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        draft.isActive ? "bg-[#3157f6]" : "bg-[#cfd4de]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
                          draft.isActive ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteDocument()}
                    disabled={isWorking}
                    aria-label="치료태그 매뉴얼 삭제"
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

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fb]">
                <div className="mx-auto max-w-[980px] space-y-5 px-7 py-6">
                  <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-extrabold text-[#3d4458]">
                          내용
                        </h2>
                        <p className="mt-1 text-xs text-[#969dad]">
                          서식 도구를 사용해 고객에게 보여줄 내용을 편집할 수
                          있습니다.
                        </p>
                      </div>
                      <span className="rounded-md bg-[#f1f3f8] px-2.5 py-1.5 font-mono text-xs text-[#82899b]">
                        {draft.contentMarkdown.length.toLocaleString("ko-KR")} /
                        100,000
                      </span>
                    </div>
                    <ManualContentEditor
                      value={draft.contentMarkdown}
                      onChange={(contentMarkdown) =>
                        setDraft((current) => ({
                          ...current,
                          contentMarkdown,
                        }))
                      }
                    />
                  </section>

                  <section className="grid grid-cols-2 gap-4 rounded-2xl border border-[#e1e5ed] bg-white p-6">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[#596175]">
                        폴더
                      </span>
                      <select
                        value={draft.folderId}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            folderId: event.target.value,
                          }))
                        }
                        aria-label="치료태그 폴더"
                        className="h-11 w-full rounded-xl border border-[#dfe3ea] bg-white px-4 text-sm font-semibold text-[#626a7d] outline-none focus:border-[#7187f6]"
                      >
                        {orderedFolders.map(({ folder, depth }) => (
                          <option key={folder.id} value={folder.id}>
                            {"　".repeat(depth)}
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[#596175]">
                        AI 검색 키워드
                      </span>
                      <input
                        value={draft.tags}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            tags: event.target.value,
                          }))
                        }
                        placeholder="키워드를 쉼표로 구분해 주세요."
                        aria-label="AI 검색 키워드"
                        className="h-11 w-full rounded-xl border border-[#dfe3ea] px-4 text-sm text-[#626a7d] outline-none focus:border-[#7187f6]"
                      />
                    </label>
                  </section>

                  <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-extrabold text-[#3d4458]">
                          이미지
                        </h2>
                        <p className="mt-1 text-xs leading-4 text-[#969dad]">
                          S3에 직접 업로드하고 CloudFront 주소로 제공합니다.
                          최대 10개, 파일당 10MB입니다.
                        </p>
                      </div>
                      <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#eef2ff] px-3 text-xs font-bold text-[#3157f6] hover:bg-[#e4eaff]">
                        {isUploadingImages ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="size-3.5" />
                        )}
                        이미지 추가
                        <input
                          type="file"
                          accept={manualImageAccept}
                          multiple
                          disabled={
                            isUploadingImages || draft.images.length >= 10
                          }
                          onChange={uploadImages}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {draft.images.length > 0 ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {draft.images.map((image, index) => (
                          <div
                            key={image.objectKey}
                            className="overflow-hidden rounded-xl border border-[#e1e5ed] bg-[#fafbfc]"
                          >
                            <div className="relative aspect-[4/3] bg-[#eef0f5]">
                              <Image
                                src={image.publicUrl}
                                alt={image.altText || image.originalName}
                                fill
                                sizes="(max-width: 1200px) 40vw, 280px"
                                className="object-cover"
                              />
                            </div>
                            <div className="space-y-2 p-3">
                              <p className="truncate text-xs font-semibold text-[#656d80]">
                                {image.originalName}
                              </p>
                              <input
                                value={image.altText}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    images: current.images.map((item) =>
                                      item.objectKey === image.objectKey
                                        ? {
                                            ...item,
                                            altText: event.target.value,
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                                maxLength={200}
                                placeholder="이미지 설명"
                                aria-label={`${image.originalName} 이미지 설명`}
                                className="h-8 w-full rounded-lg border border-[#dfe3ec] bg-white px-2.5 text-xs outline-none focus:border-[#7187f6]"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveDraftImage(index, -1)}
                                  disabled={index === 0}
                                  aria-label={`${image.originalName} 앞으로 이동`}
                                  className="flex size-7 items-center justify-center rounded-md border border-[#e0e4ec] text-[#7e8598] disabled:opacity-30"
                                >
                                  <ArrowUp className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveDraftImage(index, 1)}
                                  disabled={index === draft.images.length - 1}
                                  aria-label={`${image.originalName} 뒤로 이동`}
                                  className="flex size-7 items-center justify-center rounded-md border border-[#e0e4ec] text-[#7e8598] disabled:opacity-30"
                                >
                                  <ArrowDown className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((current) => ({
                                      ...current,
                                      images: current.images
                                        .filter(
                                          (item) =>
                                            item.objectKey !== image.objectKey,
                                        )
                                        .map((item, sortOrder) => ({
                                          ...item,
                                          sortOrder,
                                        })),
                                    }))
                                  }
                                  aria-label={`${image.originalName} 이미지 제거`}
                                  className="flex size-7 items-center justify-center rounded-md border border-[#f0dbe0] text-[#d34e63]"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label
                        aria-label="이미지 파일 선택 또는 드래그해서 업로드"
                        onDragEnter={(event) => {
                          event.preventDefault();
                          if (!isUploadingImages && draft.images.length < 10) {
                            setIsDraggingImages(true);
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          setIsDraggingImages(false);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDraggingImages(false);
                          if (isUploadingImages || draft.images.length >= 10) {
                            return;
                          }
                          void uploadImageFiles(
                            Array.from(event.dataTransfer.files),
                          );
                        }}
                        className={`mt-4 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition ${
                          isUploadingImages || draft.images.length >= 10
                            ? "cursor-not-allowed border-[#d9dde6] bg-[#f6f7f9] text-[#a0a6b4] opacity-70"
                            : isDraggingImages
                              ? "cursor-copy border-[#3157f6] bg-[#eef2ff] text-[#3157f6] ring-4 ring-[#3157f6]/10"
                              : "cursor-pointer border-[#ccd3df] bg-[#fafbfc] text-[#8d95a7] hover:border-[#7187f6] hover:bg-[#f5f7ff] hover:text-[#3157f6]"
                        }`}
                      >
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#3157f6]">
                          {isUploadingImages ? (
                            <LoaderCircle className="size-6 animate-spin" />
                          ) : (
                            <ImagePlus className="size-6" />
                          )}
                        </span>
                        <p className="mt-4 text-sm font-bold">
                          {isUploadingImages
                            ? "이미지를 업로드하고 있습니다."
                            : isDraggingImages
                              ? "여기에 놓아 업로드"
                              : "클릭하거나 이미지를 드래그해 업로드"}
                        </p>
                        <p className="mt-1 text-xs text-[#969dad]">
                          JPG, PNG, WebP, GIF, AVIF · 파일당 최대 10MB
                        </p>
                        <input
                          type="file"
                          accept={manualImageAccept}
                          multiple
                          disabled={
                            isUploadingImages || draft.images.length >= 10
                          }
                          onChange={uploadImages}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#e1e5ed] bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-[#fff4df] text-[#d58b21]">
                          <AlertTriangle className="size-4" />
                        </span>
                        <div>
                          <h2 className="text-base font-extrabold text-[#3d4458]">
                            주의사항 메시지
                          </h2>
                          <p className="mt-1 text-xs leading-4 text-[#969dad]">
                            활성화하면 상담 시 전달할 주의사항으로 사용됩니다.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={draft.cautionEnabled}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            cautionEnabled: !current.cautionEnabled,
                          }))
                        }
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          draft.cautionEnabled ? "bg-[#3157f6]" : "bg-[#cfd4de]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                            draft.cautionEnabled ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <textarea
                      value={draft.cautionMarkdown}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          cautionMarkdown: event.target.value,
                        }))
                      }
                      aria-label="주의사항 메시지"
                      maxLength={20_000}
                      placeholder="시술 후 주의사항과 고객에게 전달할 메시지를 마크다운으로 입력해 주세요."
                      className={`mt-4 min-h-40 w-full resize-y rounded-xl border border-[#e2e5ed] px-4 py-3 font-mono text-xs leading-6 text-[#454c60] outline-none focus:border-[#7187f6] ${
                        draft.cautionEnabled ? "bg-white" : "bg-[#f5f6f8]"
                      }`}
                    />
                  </section>
                </div>
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
                  {error ? (
                    <X className="size-3.5" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
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
              <p className="mt-2 text-xs leading-5 text-[#939aab]">
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
            <label className="mt-5 block text-xs font-bold text-[#697084]">
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
              <label className="mt-4 block text-xs font-bold text-[#697084]">
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
              <p className="mt-4 rounded-lg bg-[#fff0f2] px-3 py-2 text-xs font-semibold text-[#d8465b]">
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
