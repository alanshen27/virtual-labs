"use client";

import { Card, Heading, Text } from "@radix-ui/themes";
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
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14 lg:px-8">
        <div>
          <Heading size="7" mb="2">
            Explore
          </Heading>
          <Text as="p" size="3" color="gray">
            Built-in labs run without an account. Labs you saved appear here after you sign in.
          </Text>
        </div>
        {saved.length > 0 ? (
          <section className="flex flex-col gap-4">
            <Heading size="5">Your labs</Heading>
            <div className="grid gap-4 md:grid-cols-2">
              {saved.map((lab) => (
                <Card key={lab.labId} size="3" asChild>
                  <Link href={`/lab/${lab.labId}`}>
                    <Text as="p" size="2" color="gray">
                      {lab.subject}
                      {lab.published ? " · shared with students" : " · private"}
                    </Text>
                    <Heading size="4" mt="1" mb="2">
                      {lab.title}
                    </Heading>
                    <Text as="p" size="2" color="gray">
                      {lab.summary}
                    </Text>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
        <section className="flex flex-col gap-4">
          <Heading size="5">Built-in</Heading>
          <div className="grid gap-4 md:grid-cols-2">
            {builtinCards.map((lab) => (
              <Card key={lab.id} size="3" asChild>
                <Link href={`/lab/${lab.id}`}>
                  <Text as="p" size="2" color="gray">
                    {lab.subject}
                  </Text>
                  <Heading size="4" mt="1" mb="2">
                    {lab.title}
                  </Heading>
                  <Text as="p" size="2" color="gray">
                    {lab.summary}
                  </Text>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
