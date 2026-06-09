"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("欢迎回来");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-bg)] to-[var(--color-accent)]/10" />
      <div className="absolute top-1/3 -left-20 w-96 h-96 bg-[var(--color-accent)]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md glass-heavy rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-xl shadow-[var(--color-accent)]/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">企业获客平台</h1>
          <p className="text-sm text-[var(--color-muted-fg)]">AI 驱动的智能客户获取系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" required />
          </div>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" placeholder="登录密码" required />
          </div>
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-muted-fg)]">
          还没有账户？{" "}
          <Link href="/auth/register" className="text-[var(--color-accent)] hover:underline font-medium">创建账户</Link>
        </p>
      </div>
    </div>
  );
}
