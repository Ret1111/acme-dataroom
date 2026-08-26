"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { API_URL, api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { FileItem } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Download, FileWarning } from "lucide-react";

export type PreviewMode = { kind: "own" } | { kind: "public"; token: string };

export function PreviewModal({
  file,
  mode,
  onClose,
}: {
  file: FileItem;
  mode: PreviewMode;
  onClose: () => void;
}) {
  // Own files stream via a short-lived signed token (iframes can't send headers).
  const viewToken = useQuery({
    queryKey: ["view-token", file.id],
    queryFn: () => api<{ token: string }>(`/files/${file.id}/view-token`),
    enabled: mode.kind === "own",
    staleTime: 5 * 60_000,
  });

  let src: string | null = null;
  let downloadUrl: string | null = null;
  if (mode.kind === "public") {
    src = `${API_URL}/public/${mode.token}/files/${file.id}/content`;
    downloadUrl = `${src}?download=1`;
  } else if (viewToken.data) {
    src = `${API_URL}/files/${file.id}/content?st=${viewToken.data.token}`;
    downloadUrl = `${src}&download=1`;
  }

  const isPdf = file.mimeType === "application/pdf";
  const isImage = file.mimeType.startsWith("image/");
  const previewable = isPdf || isImage;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide className="flex h-[85vh] flex-col">
        <div className="mb-3 flex items-center justify-between gap-4 pr-8">
          <DialogTitle>
            {file.name}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {formatBytes(file.size)}
            </span>
          </DialogTitle>
          {downloadUrl && (
            <a href={downloadUrl} download={file.name}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> Download
              </Button>
            </a>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          {!src ? (
            <Spinner />
          ) : previewable ? (
            isPdf ? (
              <iframe src={src} title={file.name} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
              <FileWarning className="h-10 w-10 text-zinc-300" />
              <p className="text-sm">No preview available for this file type.</p>
              {downloadUrl && (
                <a href={downloadUrl} download={file.name}>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" /> Download instead
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
