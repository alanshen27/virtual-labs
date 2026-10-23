"use client";

import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/site-header";
import { useNotice } from "@/components/notice";

export function SignInForm() {
  const notice = useNotice();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/create";
  const [github, setGithub] = useState(false);
  const [devEmail, setDevEmail] = useState("teacher@localhost");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setFieldError("Enter the dev email.");
      return;
    }
    if (!password) {
      setFieldError("Enter the password.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (result?.error) {
      notice.error("Those credentials were not recognised.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <Card size="3">
          <Heading size="6" mb="2">
            Sign in
          </Heading>
          <Text as="p" color="gray" mb="5" style={{ lineHeight: 1.6 }}>
            Creating and saving labs needs an account. Built-in experiments stay open without one. For local testing,
            use {devEmail} and the dev password from the README.
          </Text>
          <form onSubmit={(event) => void onSubmit(event)}>
            <Flex direction="column" gap="4">
              <label htmlFor="email">
                <Text as="div" size="2" mb="1" weight="medium">
                  Email
                </Text>
                <TextField.Root
                  id="email"
                  autoComplete="username"
                  size="3"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label htmlFor="password">
                <Text as="div" size="2" mb="1" weight="medium">
                  Password
                </Text>
                <TextField.Root
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  size="3"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {fieldError ? (
                <Text color="red" size="2">
                  {fieldError}
                </Text>
              ) : null}
              <Button type="submit" size="3" disabled={busy}>
                Sign in
              </Button>
            </Flex>
          </form>
          {github ? (
            <Button mt="4" size="3" variant="soft" color="gray" style={{ width: "100%" }} onClick={() => void signIn("github", { callbackUrl })}>
              Continue with GitHub
            </Button>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
