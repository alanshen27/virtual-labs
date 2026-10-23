"use client";

import { Callout } from "@radix-ui/themes";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Notice = { tone: "success" | "error"; text: string };

const NoticeContext = createContext<{
  success: (text: string) => void;
  error: (text: string) => void;
} | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const show = useCallback((tone: Notice["tone"], text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => {
      setNotice((current) => (current?.text === text ? null : current));
    }, 4000);
  }, []);

  return (
    <NoticeContext.Provider
      value={{
        success: (text) => show("success", text),
        error: (text) => show("error", text),
      }}
    >
      {children}
      {notice ? (
        <div className="pointer-events-none fixed right-6 bottom-6 z-50 max-w-sm">
          <Callout.Root color={notice.tone === "error" ? "red" : "green"} role="status">
            <Callout.Text>{notice.text}</Callout.Text>
          </Callout.Root>
        </div>
      ) : null}
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const notice = useContext(NoticeContext);
  if (!notice) throw new Error("useNotice must be used inside NoticeProvider");
  return notice;
}
