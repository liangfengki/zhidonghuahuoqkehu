import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2B Lead Gen | 企业获客平台",
  description: "智能全球客户线索挖掘与邮件营销平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
