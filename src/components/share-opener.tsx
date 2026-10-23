"use client";

import { Button, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { decodeShareHash } from "@/lib/share";
import { saveCustomLab } from "@/lib/storage";

export function ShareOpener() {
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
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        {error ? (
          <>
            <Heading size="6" mb="2">
              Link could not be opened
            </Heading>
            <Text as="p" color="gray" mb="4">
              {error}
            </Text>
            <Button asChild variant="soft" color="gray">
              <Link href="/explore">Browse labs</Link>
            </Button>
          </>
        ) : (
          <Text color="gray">Opening lab…</Text>
        )}
      </main>
    </div>
  );
}
