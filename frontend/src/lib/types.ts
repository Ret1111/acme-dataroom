export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DataRoom {
  id: string;
  name: string;
  createdAt: string;
  rootFolderId: string;
}

export interface FolderItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Crumb {
  id: string;
  name: string;
}

export interface FolderView {
  access: 'owner' | 'shared';
  dataRoom: { id: string; name: string };
  folder: { id: string; name: string; parentId: string | null };
  breadcrumb: Crumb[];
  folders: FolderItem[];
  files: FileItem[];
}

export interface FolderStats {
  folders: number;
  files: number;
  size: number;
}

export type ResourceType = 'DATAROOM' | 'FOLDER' | 'FILE';

export interface Share {
  id: string;
  type: 'LINK' | 'USER';
  role: 'VIEWER';
  token: string | null;
  granteeEmail: string | null;
  createdAt: string;
}

export interface SharedWithMeItem {
  id: string;
  sharedBy: { name: string; email: string };
  sharedAt: string;
  kind: ResourceType;
  name: string;
  folderId?: string;
  file?: FileItem;
}

export interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

export interface PublicRoot {
  type: ResourceType;
  name: string;
  rootFolderId?: string;
  file?: FileItem;
}

export interface PublicFolderView {
  folder: { id: string; name: string };
  breadcrumb: Crumb[];
  folders: FolderItem[];
  files: FileItem[];
}

export interface SearchResults {
  folders: { id: string; name: string; path: string }[];
  files: { id: string; name: string; size: number; folderId: string; path: string }[];
}
