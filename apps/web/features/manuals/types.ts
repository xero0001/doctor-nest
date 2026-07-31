export type ManualFolderRecord = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
};

export type ManualTagRecord = {
  id: string;
  name: string;
  color: string;
};

export type ManualDocumentRecord = {
  id: string;
  folderId: string;
  title: string;
  slug: string;
  contentMarkdown: string;
  sortOrder: number;
  updatedAt: string;
  tags: ManualTagRecord[];
};
