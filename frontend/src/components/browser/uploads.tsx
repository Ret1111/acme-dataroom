"use client";

import { uploadFile } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, X, XCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface UploadEntry {
  id: string;
  name: string;
  percent: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

/** Per-file upload queue with progress, shared by button and drag-and-drop. */
export function useUploads(folderId: string) {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const counter = useRef(0);
  const queryClient = useQueryClient();

  const start = useCallback(
    (files: globalThis.File[]) => {
      for (const file of files) {
        const id = `u${++counter.current}`;
        setUploads((u) => [
          ...u,
          { id, name: file.name, percent: 0, status: "uploading" },
        ]);

        const update = (patch: Partial<UploadEntry>) =>
          setUploads((u) => u.map((e) => (e.id === id ? { ...e, ...patch } : e)));

        uploadFile(folderId, file, (percent) => update({ percent }))
          .promise.then(() => {
            update({ status: "done", percent: 100 });
            queryClient.invalidateQueries({ queryKey: ["folder", folderId] });
          })
          .catch((err: Error) => update({ status: "error", error: err.message }));
      }
    },
    [folderId, queryClient],
  );

  const dismiss = useCallback(() => {
    setUploads((u) => u.filter((e) => e.status === "uploading"));
  }, []);

  return { uploads, start, dismiss };
}

export function UploadPanel({
  uploads,
  onDismiss,
}: {
  uploads: UploadEntry[];
  onDismiss: () => void;
}) {
  if (uploads.length === 0) return null;
  const active = uploads.filter((u) => u.status === "uploading").length;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <span className="text-sm font-medium text-zinc-700">
          {active > 0
            ? `Uploading ${active} file${active === 1 ? "" : "s"}…`
            : "Uploads finished"}
        </span>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-200"
          aria-label="Dismiss finished uploads"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-64 divide-y divide-zinc-50 overflow-y-auto">
        {uploads.map((u) => (
          <li key={u.id} className="px-3 py-2">
            <div className="flex items-center gap-2">
              {u.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              ) : u.status === "error" ? (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <FileUp className="h-4 w-4 shrink-0 animate-pulse text-zinc-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">{u.name}</span>
              {u.status === "uploading" && (
                <span className="text-xs tabular-nums text-zinc-400">{u.percent}%</span>
              )}
            </div>
            {u.status === "error" ? (
              <p className="mt-1 pl-6 text-xs text-red-600">{u.error}</p>
            ) : (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    u.status === "done" ? "bg-green-500" : "bg-zinc-900",
                  )}
                  style={{ width: `${u.percent}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full-page overlay shown while dragging files over the browser area. */
export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-500 bg-white/80">
      <div className="flex flex-col items-center gap-2 text-zinc-600">
        <FileUp className="h-8 w-8" />
        <p className="text-sm font-medium">Drop files to upload</p>
      </div>
    </div>
  );
}
