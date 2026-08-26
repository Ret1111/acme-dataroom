"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api, clearToken } from "@/lib/api";
import type { DataRoom, User } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  FolderLock,
  LogOut,
  MoreHorizontal,
  Plus,
  Share2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DeleteRoomDialog } from "./dialogs/delete-dialog";
import { ShareDialog } from "./dialogs/share-dialog";

export function AppShell({
  children,
  activeRoomId,
  activeSection,
}: {
  children: React.ReactNode;
  activeRoomId?: string;
  activeSection: "rooms" | "shared";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/auth/me"),
  });
  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api<DataRoom[]>("/datarooms"),
  });

  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [renameRoom, setRenameRoom] = useState<DataRoom | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareRoom, setShareRoom] = useState<DataRoom | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<DataRoom | null>(null);

  const createRoom = useMutation({
    mutationFn: (name: string) =>
      api<DataRoom>("/datarooms", { method: "POST", body: { name } }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setNewRoomOpen(false);
      setNewRoomName("");
      router.push(`/f/${room.rootFolderId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const renameRoomMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<DataRoom>(`/datarooms/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["folder"] });
      setRenameRoom(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function signOut() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <Building2 className="h-5 w-5" />
          Acme Data Room
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
              {me.data?.user.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden sm:block">{me.data?.user.name}</span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="px-2.5 py-1.5 text-xs text-zinc-500">{me.data?.user.email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white p-3 sm:block">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Data Rooms
            </span>
            <button
              onClick={() => setNewRoomOpen(true)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="New Data Room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-0.5">
            {rooms.data?.map((room) => (
              <div
                key={room.id}
                className={`group flex items-center rounded-md text-sm ${
                  activeSection === "rooms" && room.id === activeRoomId
                    ? "bg-zinc-100 font-medium text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <Link
                  href={`/f/${room.rootFolderId}`}
                  className="flex flex-1 items-center gap-2 truncate px-2 py-1.5"
                >
                  <FolderLock className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate">{room.name}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="mr-1 rounded p-1 text-zinc-400 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 data-[state=open]:opacity-100"
                    aria-label="Room actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onSelect={() => {
                        setRenameValue(room.name);
                        setRenameRoom(room);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShareRoom(room)}>
                      <Share2 className="h-4 w-4" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => setDeleteRoom(room)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>

          <div className="mt-4 border-t border-zinc-100 pt-3">
            <Link
              href="/shared"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                activeSection === "shared"
                  ? "bg-zinc-100 font-medium text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Users className="h-4 w-4 text-zinc-400" />
              Shared with me
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* New room */}
      <Dialog open={newRoomOpen} onOpenChange={setNewRoomOpen}>
        <DialogContent>
          <DialogTitle>New Data Room</DialogTitle>
          <DialogDescription>A separate secure space with its own sharing.</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newRoomName.trim()) createRoom.mutate(newRoomName.trim());
            }}
            className="space-y-3"
          >
            <Input
              placeholder="e.g. Project Falcon"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewRoomOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createRoom.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename room */}
      <Dialog open={!!renameRoom} onOpenChange={(o) => !o && setRenameRoom(null)}>
        <DialogContent>
          <DialogTitle>Rename Data Room</DialogTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameRoom && renameValue.trim()) {
                renameRoomMut.mutate({ id: renameRoom.id, name: renameValue.trim() });
              }
            }}
            className="mt-3 space-y-3"
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenameRoom(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={renameRoomMut.isPending}>
                Rename
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {shareRoom && (
        <ShareDialog
          resourceType="DATAROOM"
          resourceId={shareRoom.id}
          resourceName={shareRoom.name}
          open
          onOpenChange={(o) => !o && setShareRoom(null)}
        />
      )}

      {deleteRoom && (
        <DeleteRoomDialog room={deleteRoom} onClose={() => setDeleteRoom(null)} />
      )}
    </div>
  );
}
