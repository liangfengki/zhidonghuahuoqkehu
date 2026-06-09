"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import {
  Bot, Play, Pause, BarChart3, Sparkles, Clock, FileText,
  Users, Send, Trash2, Plus, Gauge, RefreshCw, Zap, Settings,
  CheckCircle2, Circle, ArrowRight
} from "lucide-react";

type Tab = "automation" | "campaigns" | "drafts";

export default function AiCenterPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("automation");

  // ---- Automation tab state ----
  const [aiForm, setAiForm] = useState({
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: "",
    model: "deepseek/deepseek-v4-flash:free",
    productDescription: "",
    automationEnabled: false,
  });
  const [aiFormLoaded, setAiFormLoaded] = useState(false);

  // ---- Campaigns tab state ----
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [campaignForm, setCampaignForm] = useState<any>({
    name: "",
    industryFilter: [""],
    countryFilter: [""],
    dailyLimit: 50,
  });
  const [showStats, setShowStats] = useState<string | null>(null);

  // ---- API queries ----
  const { data: aiConfigData } = useQuery({
    queryKey: ["ai-config"],
    queryFn: () => apiGet("/settings/ai") as Promise<any>,
  });

  const { data: aiDraftsData } = useQuery({
    queryKey: ["ai-drafts"],
    queryFn: () => apiGet("/settings/ai/drafts") as Promise<any>,
  });
  const aiDrafts = Array.isArray(aiDraftsData) ? aiDraftsData : [];

  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiGet("/templates") as Promise<any>,
  });
  const templates = Array.isArray(templatesData) ? templatesData : [];

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiGet("/campaigns") as Promise<any>,
  });
  const campaigns = Array.isArray(campaignsData) ? campaignsData : [];

  const { data: statsData } = useQuery({
    queryKey: ["campaign-stats", showStats],
    queryFn: () => (showStats ? (apiGet("/campaigns/" + showStats + "/stats") as Promise<any>) : null),
    enabled: !!showStats,
  });

  // Load AI config
  if (aiConfigData && !aiFormLoaded) {
    setAiFormLoaded(true);
    setAiForm({
      apiUrl: aiConfigData.apiUrl || aiForm.apiUrl,
      apiKey: aiConfigData.apiKey || "",
      model: aiConfigData.model || aiForm.model,
      productDescription: aiConfigData.productDescription || "",
      automationEnabled: aiConfigData.automationEnabled ?? false,
    });
  }

  // ---- Mutations ----
  const saveAiConfig = useMutation({
    mutationFn: (d: any) => apiPut("/settings/ai", d),
    onSuccess: () => {
      toast.success("AI 配置已保存");
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (e: any) => toast.error("保存失败：" + (e.message || "请检查网络连接")),
  });

  const extractProduct = useMutation({
    mutationFn: async () => {
      // Save config first, then extract
      await apiPut("/settings/ai", {
        apiUrl: aiForm.apiUrl, apiKey: aiForm.apiKey, model: aiForm.model,
        productDescription: aiForm.productDescription,
      });
      return apiPost("/settings/ai/extract", { productDescription: aiForm.productDescription });
    },
    onSuccess: (data: any) => {
      toast.success(`已提取：${data.keywords} / ${data.industry} / ${data.country}`);
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (e: any) => toast.error("提取失败：" + (e.message || "请先填写 API Key")),
  });

  const triggerPipeline = useMutation({
    mutationFn: () => apiPost("/settings/ai/trigger/run", {}),
    onSuccess: (data: any) => toast.success(data?.message || "AI 全流程已启动"),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDraft = useMutation({
    mutationFn: (id: string) => apiDelete("/settings/ai/drafts/" + id),
    onSuccess: () => { toast.success("已删除"); queryClient.invalidateQueries({ queryKey: ["ai-drafts"] }); },
  });

  const createCampaign = useMutation({
    mutationFn: (d: any) => {
      if (!d.templateId) return Promise.reject(new Error("请先创建邮件模板"));
      return apiPost("/campaigns", d);
    },
    onSuccess: () => {
      toast.success("活动已创建");
      setShowCreateCampaign(false);
      setWizardStep(0);
      setCampaignForm({ name: "", industryFilter: [""], countryFilter: [""], dailyLimit: 50 });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
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

  const statusColors: Record<string, string> = { draft: "secondary", running: "success", paused: "warning", completed: "default" };
  const statusLabel: Record<string, string> = { draft: "草稿", running: "运行中", paused: "已暂停", completed: "已完成" };

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    queryClient.invalidateQueries({ queryKey: ["ai-drafts"] });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)] flex items-center gap-2">
              <Sparkles size={22} className="text-[var(--color-accent)]" />
              AI 中心
            </h1>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">
              配置 AI，一键自动采集线索、写邮件、发送
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw size={14} className="mr-1" />刷新
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] w-fit">
          {[
            { key: "automation" as Tab, label: "自动化", icon: Bot },
            { key: "campaigns" as Tab, label: "邮件活动", icon: Send },
            { key: "drafts" as Tab, label: "发送记录", icon: FileText },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-[var(--color-surface)] text-[var(--color-fg)] shadow-sm border border-[var(--color-glass-border)]"
                  : "text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ---- TAB 1: Automation ---- */}
        {activeTab === "automation" && (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {[
                { label: "配置 AI", done: !!aiForm.apiKey },
                { label: "填写产品", done: !!aiForm.productDescription },
                { label: "提取关键词", done: !!aiConfigData?.extractedKeywords },
                { label: "一键运行", done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  {s.done ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Circle size={18} className="text-[var(--color-muted-fg)]" />
                  )}
                  <span className={s.done ? "text-emerald-500 font-medium" : "text-[var(--color-muted-fg)]"}>{s.label}</span>
                  {i < 3 && <ArrowRight size={14} className="text-[var(--color-muted-fg)] mx-1" />}
                </div>
              ))}
            </div>

            {/* Step 1: AI Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">1</span>
                  AI 模型配置
                  {aiForm.apiKey && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">API URL</label>
                    <Input value={aiForm.apiUrl} onChange={(e) => setAiForm({ ...aiForm, apiUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1/chat/completions" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">API Key <span className="text-[var(--color-danger)]">*</span></label>
                    <Input type="password" value={aiForm.apiKey} onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })} placeholder="sk-..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">模型</label>
                    <Input value={aiForm.model} onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })} placeholder="deepseek/deepseek-v4-flash:free" className="mt-1" />
                  </div>
                </div>
                <Button size="sm" onClick={() => saveAiConfig.mutate({ apiUrl: aiForm.apiUrl, apiKey: aiForm.apiKey, model: aiForm.model })} disabled={saveAiConfig.isPending || !aiForm.apiKey}>
                  {saveAiConfig.isPending ? "保存中..." : "保存配置"}
                </Button>
              </CardContent>
            </Card>

            {/* Step 2: Product Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">2</span>
                  产品描述
                  {aiConfigData?.extractedKeywords && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-[var(--color-muted-fg)]">
                  描述你的产品或服务，AI 会自动提取搜索关键词、目标行业和目标市场
                </p>
                <textarea
                  value={aiForm.productDescription}
                  onChange={(e) => setAiForm({ ...aiForm, productDescription: e.target.value })}
                  placeholder="例如：我们是一家生产工业自动化设备的公司，主要产品包括PLC控制器、伺服电机、变频器等，主要出口到东南亚和欧洲市场，目标客户是制造业工厂和系统集成商。"
                  className="w-full h-24 px-3 py-2 text-sm rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-surface)] text-[var(--color-fg)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
                {aiConfigData?.extractedKeywords && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <p className="text-xs font-medium text-emerald-600">AI 已提取：</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">关键词：{aiConfigData.extractedKeywords}</Badge>
                      <Badge variant="secondary">行业：{aiConfigData.extractedIndustry}</Badge>
                      <Badge variant="secondary">市场：{aiConfigData.extractedCountry}</Badge>
                    </div>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => extractProduct.mutate()}
                  disabled={extractProduct.isPending || !aiForm.productDescription || !aiForm.apiKey}
                >
                  <Zap size={14} className="mr-1" />
                  {extractProduct.isPending ? "保存并提取中..." : "保存并提取关键词"}
                </Button>
                {!aiForm.apiKey && (
                  <p className="text-xs text-[var(--color-danger)]">请先在步骤 1 填写并保存 API Key</p>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Run Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">3</span>
                  一键运行
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-[var(--color-muted-fg)]">
                  点击运行后，系统自动执行：搜索企业 → 采集邮箱 → AI 写邮件 → 自动发送
                </p>

                {/* Automation toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                  <div>
                    <p className="font-medium text-sm text-[var(--color-fg)]">定时自动运行</p>
                    <p className="text-xs text-[var(--color-muted-fg)]">每天 9:00 采集 / 10:00 写邮件 / 每2小时发送</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !aiForm.automationEnabled;
                      setAiForm({ ...aiForm, automationEnabled: next });
                      saveAiConfig.mutate({ apiUrl: aiForm.apiUrl, apiKey: aiForm.apiKey, model: aiForm.model, productDescription: aiForm.productDescription, automationEnabled: next });
                    }}
                  >
                    {aiForm.automationEnabled ? (
                      <Badge variant="success" className="cursor-pointer px-3 py-1">已开启</Badge>
                    ) : (
                      <Badge variant="secondary" className="cursor-pointer px-3 py-1">已关闭</Badge>
                    )}
                  </button>
                </div>

                {/* Last run times */}
                {aiConfigData && (aiConfigData.lastCollectAt || aiConfigData.lastWriteAt || aiConfigData.lastSendAt) && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                      <p className="text-[10px] text-[var(--color-muted-fg)] uppercase">上次采集</p>
                      <p className="text-xs font-medium text-[var(--color-fg)] mt-1">
                        {aiConfigData.lastCollectAt ? new Date(aiConfigData.lastCollectAt).toLocaleString("zh-CN") : "未执行"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                      <p className="text-[10px] text-[var(--color-muted-fg)] uppercase">上次写邮件</p>
                      <p className="text-xs font-medium text-[var(--color-fg)] mt-1">
                        {aiConfigData.lastWriteAt ? new Date(aiConfigData.lastWriteAt).toLocaleString("zh-CN") : "未执行"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                      <p className="text-[10px] text-[var(--color-muted-fg)] uppercase">上次发送</p>
                      <p className="text-xs font-medium text-[var(--color-fg)] mt-1">
                        {aiConfigData.lastSendAt ? new Date(aiConfigData.lastSendAt).toLocaleString("zh-CN") : "未执行"}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base"
                  onClick={() => triggerPipeline.mutate()}
                  disabled={triggerPipeline.isPending || !aiForm.apiKey || !aiForm.productDescription}
                >
                  <Play size={18} className="mr-2" />
                  {triggerPipeline.isPending ? "启动中..." : "立即运行全流程"}
                </Button>
                {(!aiForm.apiKey || !aiForm.productDescription) && (
                  <p className="text-xs text-[var(--color-danger)] text-center">
                    请先完成步骤 1 和步骤 2
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ---- TAB 2: Campaigns ---- */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setShowCreateCampaign(true); setWizardStep(0); }}>
                <Plus size={16} className="mr-1" />创建活动
              </Button>
            </div>

            {campaignsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                      <div className="h-4 w-28 bg-[var(--color-subtle)] rounded animate-pulse" />
                      <div className="h-3 w-20 bg-[var(--color-subtle)] rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-[var(--color-muted-fg)]">
                  <Send size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无邮件活动</p>
                  <p className="text-xs mt-1 opacity-60">创建邮件活动开始自动化营销</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((c: any) => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <Badge variant={(statusColors[c.status] as any) || "secondary"}>
                          {statusLabel[c.status] || c.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-fg)]">每日限额</span>
                          <span className="font-mono">{c.dailyLimit} 封</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-fg)]">已发送</span>
                          <span className="font-bold">{c.totalSent || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-fg)]">已回复</span>
                          <span className="font-bold text-emerald-500">{c.totalReplied || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        {(c.status === "draft" || c.status === "paused") && (
                          <Button size="sm" variant="outline" onClick={() => startCampaign.mutate(c.id)} disabled={startCampaign.isPending}>
                            <Play size={14} className="mr-1" />启动
                          </Button>
                        )}
                        {c.status === "running" && (
                          <Button size="sm" variant="outline" onClick={() => pauseCampaign.mutate(c.id)} disabled={pauseCampaign.isPending}>
                            <Pause size={14} className="mr-1" />暂停
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setShowStats(showStats === c.id ? null : c.id)}>
                          <BarChart3 size={14} className="mr-1" />统计
                        </Button>
                      </div>
                      {showStats === c.id && statsData && (
                        <div className="mt-3 p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] text-xs space-y-1">
                          <div>状态分布：{JSON.stringify(statsData.statusBreakdown)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- TAB 3: Drafts / Send Log ---- */}
        {activeTab === "drafts" && (
          <div className="space-y-4">
            {aiDrafts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-[var(--color-muted-fg)]">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无发送记录</p>
                  <p className="text-xs mt-1 opacity-60">运行 AI 全流程后自动生成</p>
                </CardContent>
              </Card>
            ) : (
              aiDrafts.map((draft: any) => (
                <Card key={draft.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={draft.status === "sent" ? "success" : draft.status === "approved" ? "default" : "secondary"}>
                          {draft.status === "sent" ? "已发送" : draft.status === "approved" ? "待发送" : draft.status === "draft" ? "草稿" : draft.status}
                        </Badge>
                        <span className="font-medium text-sm text-[var(--color-fg)]">{draft.subject}</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        {draft.sentAt && (
                          <span className="text-[11px] text-[var(--color-muted-fg)] mr-2">
                            <Clock size={11} className="inline mr-1" />
                            {new Date(draft.sentAt).toLocaleString("zh-CN")}
                          </span>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteDraft.mutate(draft.id)}>
                          <Trash2 size={14} className="text-[var(--color-muted-fg)]" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--color-muted-fg)] line-clamp-2" dangerouslySetInnerHTML={{ __html: draft.body }} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Create Campaign Dialog */}
        <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {wizardStep === 0 ? "创建活动 · 基本信息" : wizardStep === 1 ? "选择邮件模板" : "预览确认"}
              </DialogTitle>
              <DialogClose onClick={() => setShowCreateCampaign(false)} />
            </DialogHeader>
            {wizardStep === 0 && (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setWizardStep(1); }}>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">活动名称</label><Input value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="如：美国电子采购商 5月开发" required /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">目标行业</label><Input value={campaignForm.industryFilter.join(",")} onChange={(e) => setCampaignForm({ ...campaignForm, industryFilter: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="电子产品,汽车配件" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">目标国家</label><Input value={campaignForm.countryFilter.join(",")} onChange={(e) => setCampaignForm({ ...campaignForm, countryFilter: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="USA,Germany" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">每日发送上限</label><Input type="number" value={campaignForm.dailyLimit} onChange={(e) => setCampaignForm({ ...campaignForm, dailyLimit: Number(e.target.value) })} min={1} max={500} required /></div>
                <Button type="submit" className="w-full" disabled={!campaignForm.name}>下一步</Button>
              </form>
            )}
            {wizardStep === 1 && (
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-center text-[var(--color-muted-fg)] py-4">暂无模板，请先去设置创建</p>
                ) : (
                  templates.map((t: any) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        campaignForm.templateId === t.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                          : "border-[var(--color-glass-border)] hover:border-[var(--color-accent)]/50"
                      }`}
                      onClick={() => setCampaignForm({ ...campaignForm, templateId: t.id })}
                    >
                      <div className="font-medium text-sm text-[var(--color-fg)]">{t.name}</div>
                      <div className="text-xs text-[var(--color-muted-fg)] mt-1">主题：{t.subject}</div>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(0)}>上一步</Button>
                  <Button onClick={() => setWizardStep(2)} disabled={!campaignForm.templateId}>下一步</Button>
                </div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="text-sm space-y-2 text-[var(--color-fg)]">
                  <div><span className="font-medium">名称：</span>{campaignForm.name}</div>
                  <div><span className="font-medium">日限额：</span>{campaignForm.dailyLimit} 封</div>
                  <div><span className="font-medium">模板：</span>{templates.find((t: any) => t.id === campaignForm.templateId)?.name}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>上一步</Button>
                  <Button onClick={() => createCampaign.mutate(campaignForm)} disabled={createCampaign.isPending}>确认创建</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
