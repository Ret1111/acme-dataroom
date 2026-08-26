"use client";

import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/browser/breadcrumbs";
import { FileTable } from "@/components/browser/file-table";
import { SearchBox } from "@/components/browser/search-box";
import { DropOverlay, UploadPanel, useUploads } from "@/components/browser/uploads";
import {
  DeleteFileDialog,
  DeleteFolderDialog,
} from "@/components/dialogs/delete-dialog";
import { MoveFileDialog } from "@/components/dialogs/move-dialog";
import { NameDialog } from "@/components/dialogs/name-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { PreviewModal } from "@/components/preview-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, getToken, API_URL } from "@/lib/api";
import type { FileItem, FolderItem, FolderView, ResourceType } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FolderPlus, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const view = useQuery({
    queryKey: ["folder", folderId],
    queryFn: () => api<FolderView>(`/folders/${folderId}`),
    retry: false,
  });

  const isOwner = view.data?.access === "owner";
  const { uploads, start: startUploads, dismiss: dismissUploads } = useUploads(folderId);

  // Drag & drop across the content area
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  // Dialog state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderItem | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [share, setShare] = useState<{ type: ResourceType; id: string; name: string } | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["folder"] });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      api("/folders", { method: "POST", body: { parentId: folderId, name } }),
    onSuccess: () => {
      invalidate();
      setNewFolderOpen(false);
      setDialogError(null);
    },
    onError: (e) => setDialogError(e.message),
  });

  const renameFolderMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api(`/folders/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      invalidate();
      setRenameFolder(null);
      setDialogError(null);
    },
    onError: (e) => setDialogError(e.message),
  });

  const renameFileMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api(`/files/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      invalidate();
      setRenameFile(null);
      setDialogError(null);
    },
    onError: (e) => setDialogError(e.message),
  });

  async function downloadFile(file: FileItem) {
    try {
      const { token } = await api<{ token: string }>(`/files/${file.id}/view-token`);
      location.href = `${API_URL}/files/${file.id}/content?st=${token}&download=1`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!isOwner) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) startUploads(files);
  }

  if (view.isError) {
    return (
      <AppShell activeSection="rooms">
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-zinc-500">
            {view.error instanceof Error ? view.error.message : "This folder is unavailable."}
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to my Data Room
          </Button>
        </div>
      </AppShell>
    );
  }

  const data = view.data;

  return (
    <AppShell activeSection="rooms" activeRoomId={data?.dataRoom.id}>
      <div
        className="relative flex h-full flex-col p-4 sm:p-6"
        onDragEnter={(e) => {
          e.preventDefault();
          if (!isOwner || !e.dataTransfer.types.includes("Files")) return;
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          if (--dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={onDrop}
      >
        <DropOverlay visible={dragging} />

        {!data ? (
          <Spinner />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Breadcrumbs
                crumbs={data.breadcrumb}
                onNavigate={(id) => router.push(`/f/${id}`)}
              />
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <SearchBox
                    roomId={data.dataRoom.id}
                    onOpenFolder={(id) => router.push(`/f/${id}`)}
                  />
                  <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
                    <FolderPlus className="h-4 w-4" /> New folder
                  </Button>
                  <Button size="sm" onClick={() => fileInput.current?.click()}>
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) startUploads(files);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                  <Eye className="h-3.5 w-3.5" /> View only
                </span>
              )}
            </div>

            <FileTable
              folders={data.folders}
              files={data.files}
              onOpenFolder={(id) => router.push(`/f/${id}`)}
              onPreviewFile={setPreview}
              onDownloadFile={downloadFile}
              emptyMessage={
                isOwner
                  ? "This folder is empty. Upload files or drag them here."
                  : "This folder is empty."
              }
              actions={
                isOwner
                  ? {
                      onRenameFolder: (f) => {
                        setDialogError(null);
                        setRenameFolder(f);
                      },
                      onShareFolder: (f) => setShare({ type: "FOLDER", id: f.id, name: f.name }),
                      onDeleteFolder: setDeleteFolder,
                      onRenameFile: (f) => {
                        setDialogError(null);
                        setRenameFile(f);
                      },
                      onMoveFile: setMoveFile,
                      onShareFile: (f) => setShare({ type: "FILE", id: f.id, name: f.name }),
                      onDeleteFile: setDeleteFile,
                    }
                  : undefined
              }
            />
          </>
        )}

        <UploadPanel uploads={uploads} onDismiss={dismissUploads} />

        {/* Dialogs */}
        {newFolderOpen && (
          <NameDialog
            title="New folder"
            placeholder="Folder name"
            submitLabel="Create"
            pending={createFolder.isPending}
            error={dialogError}
            onSubmit={(name) => createFolder.mutate(name)}
            onClose={() => {
              setNewFolderOpen(false);
              setDialogError(null);
            }}
          />
        )}
        {renameFolder && (
          <NameDialog
            title={`Rename "${renameFolder.name}"`}
            initialValue={renameFolder.name}
            submitLabel="Rename"
            pending={renameFolderMut.isPending}
            error={dialogError}
            onSubmit={(name) => renameFolderMut.mutate({ id: renameFolder.id, name })}
            onClose={() => {
              setRenameFolder(null);
              setDialogError(null);
            }}
          />
        )}
        {renameFile && (
          <NameDialog
            title={`Rename "${renameFile.name}"`}
            initialValue={renameFile.name}
            submitLabel="Rename"
            pending={renameFileMut.isPending}
            error={dialogError}
            onSubmit={(name) => renameFileMut.mutate({ id: renameFile.id, name })}
            onClose={() => {
              setRenameFile(null);
              setDialogError(null);
            }}
          />
        )}
        {moveFile && data && (
          <MoveFileDialog
            file={moveFile}
            roomId={data.dataRoom.id}
            roomName={data.dataRoom.name}
            currentFolderId={folderId}
            onClose={() => setMoveFile(null)}
          />
        )}
        {deleteFolder && (
          <DeleteFolderDialog folder={deleteFolder} onClose={() => setDeleteFolder(null)} />
        )}
        {deleteFile && <DeleteFileDialog file={deleteFile} onClose={() => setDeleteFile(null)} />}
        {share && (
          <ShareDialog
            resourceType={share.type}
            resourceId={share.id}
            resourceName={share.name}
            open
            onOpenChange={(o) => !o && setShare(null)}
          />
        )}
        {preview && (
          <PreviewModal file={preview} mode={{ kind: "own" }} onClose={() => setPreview(null)} />
        )}
      </div>
    </AppShell>
  );
}
