export type ManualFolderRecord = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
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
  cautionMarkdown: string;
  cautionEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
  tags: ManualTagRecord[];
  images: ManualDocumentImageRecord[];
};

export type ManualDocumentImageRecord = {
  id: string;
  objectKey: string;
  publicUrl: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  altText: string;
  sortOrder: number;
};
