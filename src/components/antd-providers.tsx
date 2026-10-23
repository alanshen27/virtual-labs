"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider } from "antd";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    colorBgLayout: "#f5f5f5",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "var(--font-sans), sans-serif",
    controlHeight: 40,
    padding: 16,
    paddingLG: 24,
    paddingXL: 32,
  },
  components: {
    Slider: { railSize: 6, handleSize: 16, handleSizeHover: 18 },
    Card: { paddingLG: 24 },
    Layout: { headerHeight: 64, bodyBg: "#f5f5f5" },
  },
};

export function AntdProviders({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <SessionProvider>
        <ConfigProvider theme={theme}>
          <App>{children}</App>
        </ConfigProvider>
      </SessionProvider>
    </StyleProvider>
  );
}
