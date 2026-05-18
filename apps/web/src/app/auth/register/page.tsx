"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await register(form); toast.success("注册成功！"); router.push("/leads"); }
    catch (err: any) { toast.error(err.message || "注册失败"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center"><h1 className="text-3xl font-bold">🚀 企业获客平台</h1><p className="text-sm text-gray-500 mt-2">创建你的账户</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium">姓名</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="张三" required /></div>
          <div><label className="text-sm font-medium">邮箱</label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" required /></div>
          <div><label className="text-sm font-medium">密码</label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="至少6位" required /></div>
          <div><label className="text-sm font-medium">企业名（可选）</label><Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="你的公司" /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "注册中..." : "注册"}</Button>
        </form>
        <p className="text-center text-sm text-gray-500">已有账户？<Link href="/auth/login" className="text-blue-600 hover:underline">登录</Link></p>
      </div>
    </div>
  );
}
