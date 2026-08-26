"use client";

import { api } from "@/lib/api";
import type { SearchResults } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { FileText, Folder, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SearchBox({
  roomId,
  onOpenFolder,
}: {
  roomId: string;
  onOpenFolder: (folderId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useQuery({
    queryKey: ["search", roomId, debounced],
    queryFn: () =>
      api<SearchResults>(`/datarooms/${roomId}/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
  });

  const showResults = open && debounced.length >= 2;
  const hits = results.data;
  const empty = hits && hits.files.length === 0 && hits.folders.length === 0;

  function go(folderId: string) {
    setOpen(false);
    setQuery("");
    onOpenFolder(folderId);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search in this Data Room…"
        className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-8 pr-8 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-100"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showResults && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
          {empty ? (
            <p className="px-3 py-2 text-sm text-zinc-400">No matches for “{debounced}”</p>
          ) : (
            <>
              {hits?.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => go(f.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50"
                >
                  <Folder className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-800">{f.name}</span>
                    <span className="block truncate text-xs text-zinc-400">{f.path}</span>
                  </span>
                </button>
              ))}
              {hits?.files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => go(f.folderId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-zinc-800">{f.name}</span>
                    <span className="block truncate text-xs text-zinc-400">{f.path}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
