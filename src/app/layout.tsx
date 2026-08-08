import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR Recruit · 招聘数据仪表盘",
  description: "飞书联动的招聘数据看板，智能生成每日总结",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <SessionProvider>
          <ThemeProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
              </main>
            </div>
          </ThemeProvider>
        </SessionProvider>
        <Toaster position="top-center" toastOptions={{ className: "text-sm", duration: 3000 }} />
      </body>
    </html>
  );
}
