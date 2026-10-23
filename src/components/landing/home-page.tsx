"use client";

import { Button, Card, Typography } from "antd";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { builtinCards } from "@/lib/catalog";

export function HomePage() {
  return (
    <div className="min-h-svh bg-[#f5f5f5]">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 lg:px-8">
        <div className="max-w-3xl">
          <Typography.Title style={{ marginBottom: 12 }}>Science you can move</Typography.Title>
          <Typography.Paragraph style={{ fontSize: 18, lineHeight: 1.6 }}>
            Teachers design a visualisation by chatting with the model. Students run the experiment, keep an activity
            sheet, and export the data.
          </Typography.Paragraph>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <Typography.Title level={3}>Create</Typography.Title>
            <Typography.Paragraph>
              Sign in, describe the lab, and watch the preview update. Ask for sliders, a chart, and the export files
              you want students to download.
            </Typography.Paragraph>
            <Link href="/create">
              <Button type="primary" size="large">
                Design a lab
              </Button>
            </Link>
          </Card>
          <Card>
            <Typography.Title level={3}>Explore</Typography.Title>
            <Typography.Paragraph>
              Open a built-in experiment with no account. Change the controls, fill in the activity sheet, and take a
              short tour the first time.
            </Typography.Paragraph>
            <Link href="/explore">
              <Button size="large">Run an experiment</Button>
            </Link>
          </Card>
        </div>
        <section>
          <Typography.Title level={3}>Built-in labs</Typography.Title>
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
