"use client";

import { Breadcrumbs } from "@/components/browser/breadcrumbs";
import { FileTable } from "@/components/browser/file-table";
import { PreviewModal } from "@/components/preview-modal";
import { Spinner } from "@/components/ui/spinner";
import { API_URL, api } from "@/lib/api";
import type { FileItem, PublicFolderView, PublicRoot } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Building2, Eye, FileX2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function PublicShareView() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [preview, setPreview] = useState<FileItem | null>(null);

  const root = useQuery({
    queryKey: ["public-root", token],
    queryFn: () => api<PublicRoot>(`/public/${token}`, { public: true }),
    retry: false,
  });

  const folderId = searchParams.get("folder") ?? root.data?.rootFolderId;

  const listing = useQuery({
    queryKey: ["public-folder", token, folderId],
    queryFn: () =>
      api<PublicFolderView>(`/public/${token}/folders/${folderId}`, { public: true }),
    enabled: !!folderId && root.data?.type !== "FILE",
    retry: false,
  });

  const error = root.error ?? listing.error;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-2 font-semibold text-zinc-900">
          <Building2 className="h-5 w-5" />
          Acme Data Room
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
          <Eye className="h-3.5 w-3.5" /> Shared · view only
        </span>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <FileX2 className="h-10 w-10 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              {error instanceof Error
                ? error.message
                : "This link is invalid or access has been revoked."}
            </p>
          </div>
        ) : !root.data ? (
          <Spinner />
        ) : root.data.type === "FILE" && root.data.file ? (
          // A single shared file: open the preview immediately.
          <SingleFile token={token} file={root.data.file} />
        ) : (
          <>
            <div className="mb-4">
              {listing.data && (
                <Breadcrumbs
                  crumbs={listing.data.breadcrumb}
                  onNavigate={(id) => router.push(`/s/${token}?folder=${id}`)}
                />
              )}
            </div>
            {!listing.data ? (
              <Spinner />
            ) : (
              <FileTable
                folders={listing.data.folders}
                files={listing.data.files}
                onOpenFolder={(id) => router.push(`/s/${token}?folder=${id}`)}
                onPreviewFile={setPreview}
                onDownloadFile={(file) => {
                  location.href = `${API_URL}/public/${token}/files/${file.id}/content?download=1`;
                }}
                emptyMessage="This folder is empty."
              />
            )}
          </>
        )}

        {preview && (
          <PreviewModal
            file={preview}
            mode={{ kind: "public", token }}
            onClose={() => setPreview(null)}
          />
        )}
      </main>
    </div>
  );
}

function SingleFile({ token, file }: { token: string; file: FileItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <p className="text-sm text-zinc-500">
        <strong className="text-zinc-800">{file.name}</strong> was shared with you.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Open file
      </button>
      {open && (
        <PreviewModal file={file} mode={{ kind: "public", token }} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export default function PublicSharePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PublicShareView />
    </Suspense>
  );
}
