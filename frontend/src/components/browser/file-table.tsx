"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes, formatDate } from "@/lib/format";
import type { FileItem, FolderItem } from "@/lib/types";
import {
  Download,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
} from "lucide-react";

export interface FileTableActions {
  onRenameFolder: (folder: FolderItem) => void;
  onShareFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onRenameFile: (file: FileItem) => void;
  onMoveFile: (file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
}

export function FileTable({
  folders,
  files,
  onOpenFolder,
  onPreviewFile,
  onDownloadFile,
  actions,
  emptyMessage,
}: {
  folders: FolderItem[];
  files: FileItem[];
  onOpenFolder: (id: string) => void;
  onPreviewFile: (file: FileItem) => void;
  onDownloadFile?: (file: FileItem) => void;
  actions?: FileTableActions;
  emptyMessage: string;
}) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <FolderOpen className="h-10 w-10 text-zinc-300" />
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  const cellBtn =
    "flex w-full items-center gap-2.5 truncate px-4 py-2.5 text-left text-sm text-zinc-800";

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[540px] table-fixed">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="w-24 px-4 py-2.5 font-medium">Size</th>
            <th className="w-36 px-4 py-2.5 font-medium">Modified</th>
            <th className="w-12 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {folders.map((folder) => (
            <tr key={folder.id} className="group hover:bg-zinc-50">
              <td className="truncate">
                <button className={cellBtn} onDoubleClick={() => onOpenFolder(folder.id)} onClick={() => onOpenFolder(folder.id)}>
                  <Folder className="h-4.5 w-4.5 shrink-0 fill-zinc-300 text-zinc-400" />
                  <span className="truncate font-medium">{folder.name}</span>
                </button>
              </td>
              <td className="px-4 text-sm text-zinc-400">—</td>
              <td className="whitespace-nowrap px-4 text-sm text-zinc-500">{formatDate(folder.updatedAt)}</td>
              <td className="px-2 text-right">
                {actions && (
                  <RowMenu>
                    <DropdownMenuItem onSelect={() => onOpenFolder(folder.id)}>Open</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => actions.onRenameFolder(folder)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => actions.onShareFolder(folder)}>Share</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => actions.onDeleteFolder(folder)}>
                      Delete
                    </DropdownMenuItem>
                  </RowMenu>
                )}
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr key={file.id} className="group hover:bg-zinc-50">
              <td className="truncate">
                <button className={cellBtn} onClick={() => onPreviewFile(file)}>
                  <FileText className="h-4.5 w-4.5 shrink-0 text-red-400" />
                  <span className="truncate">{file.name}</span>
                </button>
              </td>
              <td className="px-4 text-sm text-zinc-500">{formatBytes(file.size)}</td>
              <td className="whitespace-nowrap px-4 text-sm text-zinc-500">{formatDate(file.updatedAt)}</td>
              <td className="px-2 text-right">
                {actions ? (
                  <RowMenu>
                    <DropdownMenuItem onSelect={() => onPreviewFile(file)}>View</DropdownMenuItem>
                    {onDownloadFile && (
                      <DropdownMenuItem onSelect={() => onDownloadFile(file)}>
                        <Download className="h-4 w-4" /> Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => actions.onRenameFile(file)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => actions.onMoveFile(file)}>Move</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => actions.onShareFile(file)}>Share</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => actions.onDeleteFile(file)}>
                      Delete
                    </DropdownMenuItem>
                  </RowMenu>
                ) : (
                  onDownloadFile && (
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="rounded p-1.5 text-zinc-400 opacity-0 hover:bg-zinc-200 group-hover:opacity-100"
                      aria-label={`Download ${file.name}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded p-1.5 text-zinc-400 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 data-[state=open]:opacity-100"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
