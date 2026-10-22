"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decodeShareHash } from "@/lib/share";
import { saveCustomLab } from "@/lib/storage";

export default function SharePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.location.hash.replace(/^#/, "");
      let hash = raw;
      try {
        hash = decodeURIComponent(raw);
      } catch {
        hash = raw;
      }
      try {
        const lab = decodeShareHash(hash);
        saveCustomLab(lab);
        router.replace(`/lab/${lab.id}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "This link doesn't contain a valid lab.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-medium">Link could not be opened</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Opening lab…</p>
      )}
    </div>
  );
}
