"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { NoticeProvider } from "@/components/notice";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NoticeProvider>{children}</NoticeProvider>
    </SessionProvider>
  );
}
