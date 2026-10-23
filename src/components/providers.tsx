"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [shell, setShell] = useState<ReactNode>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/components/antd-providers").then((mod) => {
      if (!cancelled) setShell(<mod.AntdProviders>{children}</mod.AntdProviders>);
    });
    return () => {
      cancelled = true;
    };
  }, [children]);

  if (!shell) return <div className="min-h-svh bg-[#f5f5f5]" />;
  return shell;
}
