"use client";

import { api, getToken } from "@/lib/api";
import type { DataRoom } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

/** Entry point: route to the user's Data Room, or to login. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<DataRoom[]>("/datarooms")
      .then(async (rooms) => {
        // A user who deleted all their rooms gets a fresh one instead of a
        // redirect loop to /login.
        const room =
          rooms[0] ??
          (await api<DataRoom>("/datarooms", {
            method: "POST",
            body: { name: "My Data Room" },
          }));
        router.replace(`/f/${room.rootFolderId}`);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return <Spinner />;
}
