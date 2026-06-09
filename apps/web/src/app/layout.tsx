import type { Metadata } from "next";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { QueryProvider } from "@/providers/query-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "企业获客平台 | AI驱动智能获客",
  description: "智能全球客户线索挖掘与邮件营销平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              <Toaster position="top-right" />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
