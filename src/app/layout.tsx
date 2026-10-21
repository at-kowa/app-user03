import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "情シス質問箱",
  description: "質問・要望・不具合の受付と FAQ（技術検証版）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background">
        <SessionProvider>
          {/* URL を読む部品は Suspense で囲む（Next.js 16 の事前描画のため） */}
          <Suspense fallback={null}>
            <AppHeader />
          </Suspense>
          <Suspense fallback={<p className="py-8 text-center text-muted-foreground">読み込み中…</p>}>{children}</Suspense>
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
