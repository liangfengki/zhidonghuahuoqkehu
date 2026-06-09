"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, User, Mail, KeyRound, Building2 } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("注册成功，欢迎加入");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-bg)] to-[var(--color-accent)]/10" />
      <div className="absolute bottom-1/3 -left-20 w-96 h-96 bg-[var(--color-accent)]/15 rounded-full blur-3xl" />
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md glass-heavy rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-xl shadow-[var(--color-accent)]/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">创建新账户</h1>
          <p className="text-sm text-[var(--color-muted-fg)]">开启 AI 驱动的获客之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pl-10" placeholder="姓名" required />
          </div>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="pl-10" placeholder="you@example.com" required />
          </div>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="pl-10" placeholder="至少6位密码" required />
          </div>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="pl-10" placeholder="公司名（可选）" />
          </div>
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading ? "注册中..." : "创建账户"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-muted-fg)]">
          已有账户？{" "}
          <Link href="/auth/login" className="text-[var(--color-accent)] hover:underline font-medium">登录</Link>
        </p>
      </div>
    </div>
  );
}
