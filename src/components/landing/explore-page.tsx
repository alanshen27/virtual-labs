"use client";

import { Card, Typography } from "antd";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { builtinCards } from "@/lib/catalog";

type Saved = { labId: string; title: string; summary: string; subject: string; published: boolean };

export function ExplorePage() {
  const { status } = useSession();
  const [saved, setSaved] = useState<Saved[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => {
      void fetch("/api/labs")
        .then(async (response) => {
          if (!response.ok) return;
          const body: unknown = await response.json();
          if (!body || typeof body !== "object" || !("labs" in body) || !Array.isArray(body.labs)) return;
          setSaved(body.labs as Saved[]);
        })
        .catch(() => setSaved([]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className="min-h-svh bg-[#f5f5f5]">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:px-8">
        <div>
          <Typography.Title level={2}>Explore</Typography.Title>
          <Typography.Paragraph type="secondary">
            Built-in labs run without an account. Labs you saved appear here after you sign in.
          </Typography.Paragraph>
        </div>
        {saved.length > 0 ? (
          <section>
            <Typography.Title level={3}>Your labs</Typography.Title>
            <div className="grid gap-4 md:grid-cols-2">
              {saved.map((lab) => (
                <Link key={lab.labId} href={`/lab/${lab.labId}`}>
                  <Card hoverable>
                    <Typography.Text type="secondary">
                      {lab.subject}
                      {lab.published ? " · shared with students" : " · private"}
                    </Typography.Text>
                    <Typography.Title level={4} style={{ marginTop: 4 }}>
                      {lab.title}
                    </Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {lab.summary}
                    </Typography.Paragraph>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <section>
          <Typography.Title level={3}>Built-in</Typography.Title>
          <div className="grid gap-4 md:grid-cols-2">
            {builtinCards.map((lab) => (
              <Link key={lab.id} href={`/lab/${lab.id}`}>
                <Card hoverable>
                  <Typography.Text type="secondary">{lab.subject}</Typography.Text>
                  <Typography.Title level={4} style={{ marginTop: 4 }}>
                    {lab.title}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {lab.summary}
                  </Typography.Paragraph>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
