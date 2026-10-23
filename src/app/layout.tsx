import type { Metadata } from "next";
import { Theme } from "@radix-ui/themes";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Virtual Labs",
  description:
    "Teachers design science visualisations in chat. Students run the experiment, keep an activity sheet, and export the data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        <Theme
          className="min-h-svh"
          accentColor="indigo"
          appearance="light"
          grayColor="slate"
          panelBackground="solid"
          radius="medium"
          scaling="110%"
        >
          <Providers>{children}</Providers>
        </Theme>
      </body>
    </html>
  );
}
