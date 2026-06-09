"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Users, Send, Reply, Flame, ShieldCheck, TrendingUp,
  Sparkles, Clock, FileText, Mail, ArrowUpRight, ArrowDownRight,
  Play, Pause, Zap, Download, Loader2, BarChart3, CircleArrowRight
} from "lucide-react";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // --- Collect dialog state ---
  const [showCollect, setShowCollect] = useState(false);
  const [collectForm, setCollectForm] = useState({
    industry: "", country: "", keywords: "", companyDomains: "",
  });

  // --- Dashboard data ---
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet("/reports/dashboard") as Promise<any>,
  });

  const dashboard = data as any;
  const today = dashboard?.todayStats || {};

  // --- AI Config (for pipeline control) ---
  const { data: aiConfig } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => apiGet("/settings/ai") as Promise<any>,
  });

  // --- Campaigns ---
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiGet("/campaigns") as Promise<any>,
  });
  const campaigns = Array.isArray(campaignsData) ? campaignsData : [];

  // --- Mutations ---
  const triggerPipeline = useMutation({
    mutationFn: () => apiPost("/settings/ai/trigger/run", {}),
    onSuccess: (d: any) => toast.success(d?.message || "AI 全流程已启动"),
    onError: (e: any) => toast.error(e.message),
  });

  const collectMutation = useMutation({
    mutationFn: (payload: any) => apiPost("/workflow/collect", payload),
    onSuccess: () => {
      toast.success("采集任务已创建，队列处理中");
      setShowCollect(false);
      setCollectForm({ industry: "", country: "", keywords: "", companyDomains: "" });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startCampaign = useMutation({
    mutationFn: (id: string) => apiPost("/campaigns/" + id + "/start"),
    onSuccess: () => { toast.success("活动已启动"); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); },
  });
  const pauseCampaign = useMutation({
    mutationFn: (id: string) => apiPost("/campaigns/" + id + "/pause"),
    onSuccess: () => { toast.success("活动已暂停"); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); },
  });

  const handleCollect = () => {
    const payload: any = { sources: ["apollo", "hunter"] };
    if (collectForm.industry) payload.industry = collectForm.industry;
    if (collectForm.country) payload.country = collectForm.country;
    if (collectForm.keywords) payload.keywords = collectForm.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (collectForm.companyDomains) payload.companyDomains = collectForm.companyDomains.split(",").map((s: string) => s.trim()).filter(Boolean);
    collectMutation.mutate(payload);
  };

  const isConfigured = !!aiConfig?.apiKey && !!aiConfig?.productDescription;

  // --- Stat cards ---
  const statCards = [
    { label: "今日采集", value: today.collectedCount || 0, icon: Users, change: 12, bg: "from-blue-500/10 to-blue-500/5" },
    { label: "今日验证", value: today.verifiedCount || 0, icon: ShieldCheck, change: 8, bg: "from-cyan-500/10 to-cyan-500/5" },
    { label: "今日发送", value: today.sentCount || 0, icon: Send, change: -3, bg: "from-violet-500/10 to-violet-500/5" },
    { label: "今日回复", value: today.repliedCount || 0, icon: Reply, change: 15, bg: "from-emerald-500/10 to-emerald-500/5" },
    { label: "热线索", value: today.hotLeadCount || 0, icon: Flame, change: 5, bg: "from-orange-500/10 to-orange-500/5" },
  ];

  const activities = dashboard?.activities || [];
  const pending = dashboard?.pending || {};

  const pendingItems = [
    { icon: FileText, label: "待审核草稿", count: pending.drafts || 0, action: () => router.push("/leads") },
    { icon: Mail, label: "未读回复", count: pending.unreadThreads || 0, action: () => router.push("/inbox") },
    { icon: Users, label: "待验证线索", count: pending.pendingContacts || 0, action: () => router.push("/leads") },
  ];

  const funnel = dashboard?.funnel || {};
  const funnelSteps = [
    { label: "已采集", value: funnel.collected || 0 },
    { label: "已验证", value: funnel.verified || 0 },
    { label: "已发送", value: funnel.sent || 0 },
    { label: "已打开", value: funnel.opened || 0 },
    { label: "已回复", value: funnel.replied || 0 },
    { label: "热线索", value: funnel.hotLeads || 0 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">概览</h1>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">一键操作所有核心功能</p>
          </div>
          <div className="flex items-center gap-2">
            {aiConfig?.automationEnabled ? (
              <Badge variant="success" className="gap-1.5"><Sparkles size={12} />自动运行中</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5"><Sparkles size={12} />自动已关闭</Badge>
            )}
          </div>
        </div>

        {/* ===== STAT CARDS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((c, i) => (
            <Card key={i} className="group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted-fg)]">{c.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${c.bg} border border-[var(--color-glass-border)]`}>
                    <c.icon size={16} className="text-[var(--color-fg)]" />
                  </div>
                </div>
                {isLoading ? (
                  <div className="h-8 w-12 bg-[var(--color-subtle)] rounded-lg animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-[var(--color-fg)] tabular-nums">{c.value.toLocaleString()}</p>
                )}
                <div className={`flex items-center gap-1 text-xs ${c.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {c.change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  <span>{Math.abs(c.change)}% 较昨日</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <Card className="border-[var(--color-accent)]/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap size={17} className="text-[var(--color-accent)]" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Run AI Pipeline */}
              <button
                onClick={() => {
                  if (!isConfigured) { toast.error("请先在设置中配置 AI API Key 和产品描述"); return; }
                  triggerPipeline.mutate();
                }}
                disabled={triggerPipeline.isPending}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/15 to-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/40 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/25 shrink-0">
                  {triggerPipeline.isPending ? (
                    <Loader2 size={18} className="text-white animate-spin" />
                  ) : (
                    <Play size={18} className="text-white ml-0.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)]">一键运行 AI</p>
                  <p className="text-xs text-[var(--color-muted-fg)] truncate">采集 &rarr; 写邮件 &rarr; 发送</p>
                </div>
              </button>

              {/* 2. Collect Leads */}
              <button
                onClick={() => setShowCollect(true)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/15 hover:border-blue-500/30 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Download size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)]">采集线索</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">从 Apollo/Hunter 获取</p>
                </div>
              </button>

              {/* 3. Go to Leads */}
              <button
                onClick={() => router.push("/leads")}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/15 hover:border-cyan-500/30 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
                  <Users size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)]">线索库</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">管理所有线索</p>
                </div>
              </button>

              {/* 4. Inbox */}
              <button
                onClick={() => router.push("/inbox")}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/30 transition-all duration-200 text-left relative"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <Mail size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)]">收件箱</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">查看客户回复</p>
                </div>
                {(pending.unreadThreads || 0) > 0 && (
                  <span className="absolute top-2 right-3 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold px-1.5">
                    {pending.unreadThreads}
                  </span>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ===== TWO-COLUMN: Campaigns + Activity | Pending + Funnel ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Quick Control */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send size={17} className="text-[var(--color-accent)]" />
                  邮件活动
                </CardTitle>
                {campaigns.length > 0 && (
                  <Badge variant="secondary">{campaigns.length} 个</Badge>
                )}
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-6 text-[var(--color-muted-fg)]">
                    <Send size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无邮件活动</p>
                    <p className="text-xs mt-1 opacity-60">在设置中创建模板后可快速发起活动</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaigns.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] hover:border-[var(--color-accent)]/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === "running" ? "bg-emerald-500 animate-pulse" : c.status === "paused" ? "bg-amber-500" : "bg-[var(--color-muted-fg)]/40"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-fg)] truncate">{c.name}</p>
                            <p className="text-xs text-[var(--color-muted-fg)]">
                              {c.status === "running" ? "运行中" : c.status === "paused" ? "已暂停" : "草稿"} · 已发 {c.totalSent || 0} · 回复 {c.totalReplied || 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(c.status === "draft" || c.status === "paused") && (
                            <Button size="sm" variant="ghost" onClick={() => startCampaign.mutate(c.id)} disabled={startCampaign.isPending} className="text-emerald-600 dark:text-emerald-400">
                              <Play size={14} />
                            </Button>
                          )}
                          {c.status === "running" && (
                            <Button size="sm" variant="ghost" onClick={() => pauseCampaign.mutate(c.id)} disabled={pauseCampaign.isPending} className="text-amber-600 dark:text-amber-400">
                              <Pause size={14} />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => router.push("/settings")} className="text-[var(--color-muted-fg)]">
                            <BarChart3 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Activity Timeline */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock size={17} className="text-[var(--color-accent)]" />
                  AI 活动日志
                </CardTitle>
                <Badge variant="secondary" className="text-xs">今日</Badge>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-muted-fg)] text-sm">暂无活动记录</div>
                ) : (
                  <div className="space-y-0">
                    {activities.map((act: any, i: number) => {
                      const iconMap: Record<string, any> = { collect: Users, send: Send, reply: Reply, hot: Flame, verify: ShieldCheck };
                      const colorMap: Record<string, string> = { collect: "text-blue-500", send: "text-violet-500", reply: "text-emerald-500", hot: "text-orange-500", verify: "text-cyan-500" };
                      const Icon = iconMap[act.type] || FileText;
                      const color = colorMap[act.type] || "text-[var(--color-muted-fg)]";
                      return (
                        <div key={i} className="flex items-start gap-4 py-3 border-b border-[var(--color-glass-border)] last:border-0">
                          <span className="text-xs text-[var(--color-muted-fg)] w-10 tabular-nums shrink-0 mt-0.5">{act.time}</span>
                          <div className="p-1.5 rounded-lg bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                            <Icon size={14} className={color} />
                          </div>
                          <span className="text-sm text-[var(--color-fg)]">{act.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-4">
            {/* Pending Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame size={17} className="text-[var(--color-accent)]" />
                  待处理
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {pendingItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--color-subtle)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={16} className="text-[var(--color-muted-fg)]" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[var(--color-accent)]">{item.count}</span>
                      <CircleArrowRight size={14} className="text-[var(--color-muted-fg)]" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Mini funnel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp size={17} className="text-[var(--color-accent)]" />
                  销售漏斗
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {funnelSteps.map((step, i) => {
                  const max = Math.max(...funnelSteps.map((s) => s.value), 1);
                  const pct = Math.round((step.value / max) * 100);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-muted-fg)] w-14 shrink-0">{step.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-subtle)] overflow-hidden">
                        <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-[var(--color-fg)] w-8 text-right">{step.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== COLLECT DIALOG ===== */}
        <Dialog open={showCollect} onOpenChange={setShowCollect}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>采集线索</DialogTitle>
              <DialogClose onClick={() => setShowCollect(false)} />
            </DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleCollect(); }}>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">关键词（逗号分隔）</label>
                <Input value={collectForm.keywords} onChange={(e) => setCollectForm({ ...collectForm, keywords: e.target.value })} placeholder="importer, wholesale, buyer" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">行业</label>
                  <Input value={collectForm.industry} onChange={(e) => setCollectForm({ ...collectForm, industry: e.target.value })} placeholder="电子产品" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">国家</label>
                  <Input value={collectForm.country} onChange={(e) => setCollectForm({ ...collectForm, country: e.target.value })} placeholder="USA" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">指定公司域名（可选）</label>
                <Input value={collectForm.companyDomains} onChange={(e) => setCollectForm({ ...collectForm, companyDomains: e.target.value })} placeholder="example.com, company.com" className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={collectMutation.isPending}>
                {collectMutation.isPending ? <><Loader2 size={16} className="mr-2 animate-spin" />采集中...</> : "开始采集"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
