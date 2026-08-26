"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { ResourceType, Share } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, Link2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ShareDialog({
  resourceType,
  resourceId,
  resourceName,
  open,
  onOpenChange,
}: {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const sharesKey = ["shares", resourceType, resourceId];
  const shares = useQuery({
    queryKey: sharesKey,
    queryFn: () =>
      api<Share[]>(`/shares/for-resource?type=${resourceType}&id=${resourceId}`),
    enabled: open,
  });

  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: sharesKey });

  const createLink = useMutation({
    mutationFn: () =>
      api<Share>("/shares", {
        method: "POST",
        body: { resourceType, resourceId, type: "LINK" },
      }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const inviteUser = useMutation({
    mutationFn: (granteeEmail: string) =>
      api<Share>("/shares", {
        method: "POST",
        body: { resourceType, resourceId, type: "USER", email: granteeEmail },
      }),
    onSuccess: () => {
      invalidate();
      setEmail("");
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (shareId: string) => api(`/shares/${shareId}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const link = shares.data?.find((s) => s.type === "LINK");
  const people = shares.data?.filter((s) => s.type === "USER") ?? [];
  const linkUrl = link ? `${location.origin}/s/${link.token}` : null;

  async function copyLink() {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const kind =
    resourceType === "DATAROOM" ? "Data Room" : resourceType === "FOLDER" ? "folder" : "file";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Share “{resourceName}”</DialogTitle>
        <DialogDescription>
          Recipients get read-only access to this {kind}
          {resourceType !== "FILE" && " and everything inside it"}.
        </DialogDescription>

        {/* Public link */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-900">
            <Globe className="h-4 w-4 text-zinc-400" /> Public link
          </h3>
          {link && linkUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input readOnly value={linkUrl} className="text-xs" onFocus={(e) => e.target.select()} />
                <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Anyone with the link can view.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  loading={revoke.isPending}
                  onClick={() => revoke.mutate(link.id)}
                >
                  Disable link
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={createLink.isPending}
              onClick={() => createLink.mutate()}
            >
              <Link2 className="h-4 w-4" /> Create public link
            </Button>
          )}
        </section>

        {/* People */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-900">
            <UserRound className="h-4 w-4 text-zinc-400" /> People with access
          </h3>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) inviteUser.mutate(email.trim());
            }}
          >
            <Input
              type="email"
              placeholder="person@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={inviteUser.isPending}>
              Share
            </Button>
          </form>

          {people.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No one has been invited yet. Invited people sign in with their email to view.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {people.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-zinc-800">{s.granteeEmail}</p>
                    <p className="text-xs text-zinc-400">Viewer</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => revoke.mutate(s.id)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
