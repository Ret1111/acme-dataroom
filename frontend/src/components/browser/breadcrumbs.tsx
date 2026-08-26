"use client";

import type { Crumb } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs({
  crumbs,
  onNavigate,
}: {
  crumbs: Crumb[];
  onNavigate: (folderId: string) => void;
}) {
  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={crumb.id}>
            {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />}
            {last ? (
              <span className="truncate font-medium text-zinc-900">{crumb.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(crumb.id)}
                className="max-w-40 truncate rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {crumb.name}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
