"use client";

import { AppShell } from "@/components/app-shell";
import { PreviewModal } from "@/components/preview-modal";
import { Spinner } from "@/components/ui/spinner";
import { api, getToken } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { FileItem, SharedWithMeItem } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { FileText, Folder, FolderLock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SharedPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<FileItem | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const shared = useQuery({
    queryKey: ["shared-with-me"],
    queryFn: () => api<SharedWithMeItem[]>("/shares/shared-with-me"),
  });

  function open(item: SharedWithMeItem) {
    if (item.kind === "FILE" && item.file) setPreview(item.file);
    else if (item.folderId) router.push(`/f/${item.folderId}`);
  }

  const icons = {
    DATAROOM: <FolderLock className="h-4.5 w-4.5 shrink-0 text-zinc-400" />,
    FOLDER: <Folder className="h-4.5 w-4.5 shrink-0 fill-zinc-300 text-zinc-400" />,
    FILE: <FileText className="h-4.5 w-4.5 shrink-0 text-red-400" />,
  };

  return (
    <AppShell activeSection="shared">
      <div className="p-4 sm:p-6">
        <h1 className="mb-4 text-lg font-semibold text-zinc-900">Shared with me</h1>

        {shared.isPending ? (
          <Spinner />
        ) : !shared.data || shared.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center">
            <Users className="h-10 w-10 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              Nothing has been shared with you yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[540px] table-fixed">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="w-48 px-4 py-2.5 font-medium">Shared by</th>
                  <th className="w-36 px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shared.data.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <td className="truncate">
                      <button
                        onClick={() => open(item)}
                        className="flex w-full items-center gap-2.5 truncate px-4 py-2.5 text-left text-sm font-medium text-zinc-800"
                      >
                        {icons[item.kind]}
                        <span className="truncate">{item.name}</span>
                      </button>
                    </td>
                    <td className="truncate px-4 text-sm text-zinc-500">
                      {item.sharedBy.name}
                      <span className="block truncate text-xs text-zinc-400">
                        {item.sharedBy.email}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 text-sm text-zinc-500">{formatDate(item.sharedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {preview && (
          <PreviewModal file={preview} mode={{ kind: "own" }} onClose={() => setPreview(null)} />
        )}
      </div>
    </AppShell>
  );
}
