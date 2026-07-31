import { getDatabase } from "@doctornest/database";

import { ManualsClient } from "@/features/manuals/components/manuals-client";
import type {
  ManualDocumentRecord,
  ManualFolderRecord,
} from "@/features/manuals/types";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ManualsPage() {
  const user = await requireUser("/service/manuals");
  const [folders, documents] = await Promise.all([
    getDatabase().manualFolder.findMany({
      where: { hospitalId: user.hospitalId },
      select: {
        id: true,
        parentId: true,
        name: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getDatabase().manualDocument.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        tags: {
          include: { tag: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);
  const serializedFolders: ManualFolderRecord[] = folders;
  const serializedDocuments: ManualDocumentRecord[] = documents.map(
    (document) => ({
      id: document.id,
      folderId: document.folderId,
      title: document.title,
      slug: document.slug,
      contentMarkdown: document.contentMarkdown,
      sortOrder: document.sortOrder,
      updatedAt: document.updatedAt.toISOString(),
      tags: document.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    }),
  );

  return (
    <ManualsClient
      organizationName={user.hospital.name}
      initialFolders={serializedFolders}
      initialDocuments={serializedDocuments}
    />
  );
}
