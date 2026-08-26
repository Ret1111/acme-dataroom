"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { DataRoom, FileItem, FolderItem, FolderStats } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function ContentsWarning({ folderId }: { folderId: string }) {
  const stats = useQuery({
    queryKey: ["folder-stats", folderId],
    queryFn: () => api<FolderStats>(`/folders/${folderId}/stats`),
  });

  if (!stats.data) return null;
  const { folders, files, size } = stats.data;
  if (folders === 0 && files === 0) {
    return <p className="mb-4 text-sm text-zinc-500">It is empty.</p>;
  }
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        This will permanently delete{" "}
        <strong>
          {files} file{files === 1 ? "" : "s"}
        </strong>
        {folders > 0 && (
          <>
            {" "}
            and{" "}
            <strong>
              {folders} folder{folders === 1 ? "" : "s"}
            </strong>
          </>
        )}{" "}
        ({formatBytes(size)}). Anyone it was shared with will lose access.
      </span>
    </div>
  );
}

function ConfirmDelete({
  title,
  description,
  warning,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  warning?: React.ReactNode;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {warning}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" loading={pending} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFolderDialog({
  folder,
  onClose,
}: {
  folder: FolderItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api(`/folders/${folder.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      toast.success(`Folder "${folder.name}" deleted`);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <ConfirmDelete
      title={`Delete "${folder.name}"?`}
      description="This cannot be undone."
      warning={<ContentsWarning folderId={folder.id} />}
      pending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onClose={onClose}
    />
  );
}

export function DeleteFileDialog({
  file,
  onClose,
}: {
  file: FileItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api(`/files/${file.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      toast.success(`"${file.name}" deleted`);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <ConfirmDelete
      title={`Delete "${file.name}"?`}
      description={`This file (${formatBytes(file.size)}) will be permanently deleted, and anyone it was shared with will lose access.`}
      pending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onClose={onClose}
    />
  );
}

export function DeleteRoomDialog({
  room,
  onClose,
}: {
  room: DataRoom;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => api(`/datarooms/${room.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(`Data Room "${room.name}" deleted`);
      onClose();
      router.replace("/");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <ConfirmDelete
      title={`Delete Data Room "${room.name}"?`}
      description="The entire room, including all folders and files, will be permanently deleted."
      warning={<ContentsWarning folderId={room.rootFolderId} />}
      pending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onClose={onClose}
    />
  );
}
