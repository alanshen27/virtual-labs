"use client";

import { Button, Typography } from "antd";
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
    <div className="min-h-svh bg-[#f5f5f5]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        {error ? (
          <>
            <Typography.Title level={3}>Link could not be opened</Typography.Title>
            <Typography.Paragraph type="secondary">{error}</Typography.Paragraph>
            <Link href="/explore">
              <Button>Browse labs</Button>
            </Link>
          </>
        ) : (
          <Typography.Paragraph>Opening lab…</Typography.Paragraph>
        )}
      </main>
    </div>
  );
}
