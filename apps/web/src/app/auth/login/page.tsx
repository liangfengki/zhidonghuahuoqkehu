"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await login(email, password); toast.success("登录成功"); router.push("/leads"); }
    catch (err: any) { toast.error(err.message || "登录失败"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center"><h1 className="text-3xl font-bold">🚀 企业获客平台</h1><p className="text-sm text-gray-500 mt-2">登录你的账户</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium">邮箱</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required /></div>
          <div><label className="text-sm font-medium">密码</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "登录中..." : "登录"}</Button>
        </form>
        <p className="text-center text-sm text-gray-500">还没有账户？<Link href="/auth/register" className="text-blue-600 hover:underline">注册</Link></p>
      </div>
    </div>
  );
}
