"use client";

import { Button, Card, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { builtinCards } from "@/lib/catalog";

export function HomePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <Heading size="8" mb="3">
            Science you can move
          </Heading>
          <Text as="p" size="4" color="gray" style={{ lineHeight: 1.6 }}>
            Teachers design a visualisation by chatting with the model. Students run the experiment, keep an activity
            sheet, and export the data.
          </Text>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card size="3">
            <Heading size="6" mb="2">
              Create
            </Heading>
            <Text as="p" size="3" color="gray" mb="4" style={{ lineHeight: 1.6 }}>
              Sign in, describe the lab, and watch the preview update. Ask for sliders, a chart, and the export files
              you want students to download.
            </Text>
            <Button size="3" asChild>
              <Link href="/create">Design a lab</Link>
            </Button>
          </Card>
          <Card size="3">
            <Heading size="6" mb="2">
              Explore
            </Heading>
            <Text as="p" size="3" color="gray" mb="4" style={{ lineHeight: 1.6 }}>
              Open a built-in experiment with no account. Change the controls, fill in the activity sheet, and take a
              short tour the first time.
            </Text>
            <Button size="3" variant="soft" color="gray" asChild>
              <Link href="/explore">Run an experiment</Link>
            </Button>
          </Card>
        </div>
        <section className="flex flex-col gap-4">
          <Heading size="6">Built-in labs</Heading>
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
