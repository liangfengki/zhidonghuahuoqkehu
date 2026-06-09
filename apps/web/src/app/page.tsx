"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const router = useRouter();
  const { auth } = useAuth();

  useEffect(() => {
    if (!auth.loading) {
      router.replace(auth.user ? "/dashboard" : "/auth/login");
    }
  }, [auth.loading, auth.user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="animate-pulse text-[var(--color-muted-fg)] text-sm">加载中...</div>
    </div>
  );
}
