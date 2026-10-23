"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function SiteHeader() {
  const { data, status } = useSession();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-8 border-b border-[var(--gray-a5)] bg-[var(--color-panel-solid)] px-6 lg:px-8">
      <Link href="/" className="text-base font-semibold text-[var(--gray-12)]">
        Virtual Labs
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/explore" className="text-[var(--gray-11)]">
          Explore
        </Link>
        <Link href="/create" className="text-[var(--gray-11)]">
          Create
        </Link>
      </nav>
      <div className="ml-auto">
        {status === "authenticated" ? (
          <Flex align="center" gap="3">
            <Text color="gray" size="2">
              {data?.user?.email ?? data?.user?.name}
            </Text>
            <Button variant="soft" color="gray" onClick={() => void signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </Flex>
        ) : (
          <Button asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
