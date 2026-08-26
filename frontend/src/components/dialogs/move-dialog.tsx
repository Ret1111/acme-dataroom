"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { FileItem, TreeNode } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, FolderLock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function TreeBranch({
  node,
  depth,
  roomName,
  selected,
  currentFolderId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  roomName?: string;
  selected: string | null;
  currentFolderId: string;
  onSelect: (id: string) => void;
}) {
  const isRoot = depth === 0;
  const isCurrent = node.id === currentFolderId;
  return (
    <div>
      <button
        type="button"
        disabled={isCurrent}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm",
          selected === node.id
            ? "bg-zinc-900 text-white"
            : isCurrent
              ? "cursor-not-allowed text-zinc-300"
              : "text-zinc-700 hover:bg-zinc-100",
        )}
      >
        {isRoot ? (
          <FolderLock className="h-4 w-4 shrink-0 opacity-60" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 opacity-60" />
        )}
        <span className="truncate">
          {isRoot ? (roomName ?? "Data Room") : node.name}
          {isCurrent && " (current)"}
        </span>
      </button>
      {node.children.map((child) => (
        <TreeBranch
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          currentFolderId={currentFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function MoveFileDialog({
  file,
  roomId,
  roomName,
  currentFolderId,
  onClose,
}: {
  file: FileItem;
  roomId: string;
  roomName: string;
  currentFolderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tree = useQuery({
    queryKey: ["tree", roomId],
    queryFn: () => api<TreeNode>(`/datarooms/${roomId}/tree`),
  });

  const move = useMutation({
    mutationFn: (folderId: string) =>
      api(`/files/${file.id}`, { method: "PATCH", body: { folderId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      toast.success(`"${file.name}" moved`);
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Move “{file.name}”</DialogTitle>
        <DialogDescription>Choose a destination folder.</DialogDescription>

        <div className="mb-3 max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1.5">
          {tree.data ? (
            <TreeBranch
              node={tree.data}
              depth={0}
              roomName={roomName}
              selected={selected}
              currentFolderId={currentFolderId}
              onSelect={(id) => {
                setSelected(id);
                setError(null);
              }}
            />
          ) : (
            <p className="p-3 text-sm text-zinc-400">Loading folders…</p>
          )}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            loading={move.isPending}
            onClick={() => selected && move.mutate(selected)}
          >
            Move here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
