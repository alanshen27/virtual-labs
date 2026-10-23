"use client";

import { Button, Space, Typography } from "antd";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function SiteHeader() {
  const { data, status } = useSession();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-8 border-b border-neutral-200 bg-white px-6 lg:px-8">
      <Link href="/" className="text-base font-semibold text-neutral-900">
        Virtual Labs
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/explore" className="text-neutral-700">
          Explore
        </Link>
        <Link href="/create" className="text-neutral-700">
          Create
        </Link>
      </nav>
      <div className="ml-auto">
        {status === "authenticated" ? (
          <Space size="middle">
            <Typography.Text type="secondary">{data?.user?.email ?? data?.user?.name}</Typography.Text>
            <Button onClick={() => void signOut({ callbackUrl: "/" })}>Sign out</Button>
          </Space>
        ) : (
          <Link href="/signin">
            <Button type="primary">Sign in</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
