"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const router = useRouter();
  const { auth } = useAuth();

  useEffect(() => {
    if (!auth.loading) {
      router.replace(auth.user ? "/leads" : "/auth/login");
    }
  }, [auth.loading, auth.user, router]);

  return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
}
