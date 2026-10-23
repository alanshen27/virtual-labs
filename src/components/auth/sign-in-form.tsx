"use client";

import { App, Button, Card, Form, Input, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";

export function SignInForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/create";
  const [github, setGithub] = useState(false);
  const [devEmail, setDevEmail] = useState("teacher@localhost");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/status")
        .then(async (response) => {
          const body: unknown = await response.json();
          if (!body || typeof body !== "object") return;
          const record = body as { githubEnabled?: unknown; devEmail?: unknown };
          setGithub(record.githubEnabled === true);
          if (typeof record.devEmail === "string") setDevEmail(record.devEmail);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-svh bg-[#f5f5f5]">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <Card>
          <Typography.Title level={3}>Sign in</Typography.Title>
          <Typography.Paragraph type="secondary">
            Creating and saving labs needs an account. Built-in experiments stay open without one. For local testing,
            use {devEmail} and the dev password from the README.
          </Typography.Paragraph>
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={async (values: { email: string; password: string }) => {
              const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
              });
              if (result?.error) {
                message.error("Those credentials were not recognised.");
                return;
              }
              router.push(callbackUrl);
              router.refresh();
            }}
          >
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Enter the dev email." }]}>
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Sign in
            </Button>
          </Form>
          {github ? (
            <Button className="mt-4" block onClick={() => void signIn("github", { callbackUrl })}>
              Continue with GitHub
            </Button>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
