"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: { text: string; linkText: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-zinc-900">
          <Building2 className="h-6 w-6" />
          <span className="text-lg font-semibold">Acme Data Room</span>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mb-5 text-sm text-zinc-500">{subtitle}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          {footer.text}{" "}
          <Link href={footer.href} className="font-medium text-zinc-900 underline underline-offset-2">
            {footer.linkText}
          </Link>
        </p>
      </div>
    </main>
  );
}
