import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UnsavedChangesProvider } from "@/lib/unsavedChanges";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TFT 개인 맞춤형 도우미 에이전트",
  description: "TFT 개인 맞춤형 도우미 에이전트 — 증강체 티어 정리와 덱 메모",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
      </body>
    </html>
  );
}
