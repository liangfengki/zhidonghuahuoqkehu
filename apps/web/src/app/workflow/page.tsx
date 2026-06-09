"use client";
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { toast } from "sonner";
import {
  Search, Mail, Send, MessageSquare, ArrowRight, ArrowLeft,
  CheckCircle2, Circle, Loader2, Trash2, Play, RefreshCw,
  Users, FileText, Globe, Zap, ChevronDown, Edit3, Save, X,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

export default function WorkflowPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Step 1 - Collect
  const [collectForm, setCollectForm] = useState({
    industry: "",
    country: "",
    keywords: "",
    companyDomains: "",
    urls: "",
    sources: ["apollo", "hunter", "web-scraper"] as string[],
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [collectResult, setCollectResult] = useState<any>(null);

  // Step 2 - Selected contacts
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 3 - Drafts
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  // Step 4 - Send
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Poll collect job status
  const { data: jobStatus } = useQuery({
    queryKey: ["collect-status", jobId],
    queryFn: () => apiGet(`/workflow/collect/${jobId}/status`) as Promise<any>,
    enabled: !!jobId,
    refetchInterval: (query: any) => {
      const state = query.state?.data?.state;
      if (state === "completed" || state === "failed" || state === "not_found") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (jobStatus?.state === "completed") {
      toast.success("采集完成");
      setCollectResult(jobStatus.result);
      setJobId(null);
      queryClient.invalidateQueries({ queryKey: ["workflow-contacts"] });
    } else if (jobStatus?.state === "failed") {
      toast.error("采集失败：" + (jobStatus.failedReason || "未知错误"));
      setJobId(null);
    }
  }, [jobStatus?.state]);

  // Contacts query
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["workflow-contacts"],
    queryFn: () => apiGet("/workflow/contacts") as Promise<any>,
    enabled: step === 2,
  });
  const contacts = contactsData?.data || [];
  const contactsMeta = contactsData?.meta || {};

  // Drafts query
  const { data: draftsData, isLoading: draftsLoading } = useQuery({
    queryKey: ["workflow-drafts"],
    queryFn: () => apiGet("/workflow/drafts") as Promise<any>,
    enabled: step === 3 || step === 4,
  });
  const drafts = draftsData?.data || [];

  // Email accounts query
  const { data: accounts } = useQuery({
    queryKey: ["email-accounts"],
    queryFn: () => apiGet("/settings/email-accounts") as Promise<any>,
    enabled: step === 4,
  });

  // Feedback query
  const { data: feedbackData } = useQuery({
    queryKey: ["workflow-feedback"],
    queryFn: () => apiGet("/workflow/feedback") as Promise<any>,
    enabled: step === 4,
  });
  const feedback = feedbackData?.data || [];

  // Mutations
  const collectMutation = useMutation({
    mutationFn: (data: any) => apiPost("/workflow/collect", data),
    onSuccess: (data: any) => {
      if (data.method === "direct" && data.contacts) {
        setCollectResult(data);
        toast.success(`直接采集到 ${data.count} 个邮箱`);
        queryClient.invalidateQueries({ queryKey: ["workflow-contacts"] });
      } else if (data.jobId) {
        setJobId(data.jobId);
        toast.success("采集任务已启动，正在处理...");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiPost("/workflow/generate-emails", data),
    onSuccess: (data: any) => {
      toast.success(`已生成 ${data.length} 封邮件草稿`);
      queryClient.invalidateQueries({ queryKey: ["workflow-drafts"] });
      setStep(3);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiPut(`/workflow/drafts/${id}`, data),
    onSuccess: () => {
      toast.success("草稿已更新");
      setEditingDraft(null);
      queryClient.invalidateQueries({ queryKey: ["workflow-drafts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiPost("/workflow/send", data),
    onSuccess: (data: any) => {
      const sent = data.filter((r: any) => r.success).length;
      const failed = data.filter((r: any) => !r.success).length;
      toast.success(`发送完成：${sent} 成功，${failed} 失败`);
      queryClient.invalidateQueries({ queryKey: ["workflow-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-feedback"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCollect = () => {
    const data: any = {
      sources: collectForm.sources,
    };
    if (collectForm.industry) data.industry = collectForm.industry;
    if (collectForm.country) data.country = collectForm.country;
    if (collectForm.keywords) data.keywords = collectForm.keywords.split(",").map((s) => s.trim()).filter(Boolean);
    if (collectForm.companyDomains) data.companyDomains = collectForm.companyDomains.split(",").map((s) => s.trim()).filter(Boolean);
    if (collectForm.urls) data.urls = collectForm.urls.split("\n").map((s) => s.trim()).filter(Boolean);
    collectMutation.mutate(data);
  };

  const toggleSource = (source: string) => {
    setCollectForm((prev) => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter((s) => s !== source)
        : [...prev.sources, source],
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c: any) => c.id)));
    }
  };

  const removeSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleGenerate = () => {
    generateMutation.mutate({ contactIds: Array.from(selectedIds) });
  };

  const handleSend = () => {
    if (!selectedAccountId) {
      toast.error("请选择发送邮箱");
      return;
    }
    const approvedDrafts = drafts.filter((d: any) => d.status === "draft" || d.status === "approved");
    if (approvedDrafts.length === 0) {
      toast.error("没有可发送的草稿");
      return;
    }
    sendMutation.mutate({
      draftIds: approvedDrafts.map((d: any) => d.id),
      emailAccountId: selectedAccountId,
    });
  };

  const startEditDraft = (draft: any) => {
    setEditingDraft(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const saveDraft = () => {
    if (!editingDraft) return;
    updateDraftMutation.mutate({ id: editingDraft, subject: editSubject, body: editBody });
  };

  const steps = [
    { num: 1 as Step, label: "采集邮箱", icon: Search },
    { num: 2 as Step, label: "确认列表", icon: Users },
    { num: 3 as Step, label: "生成邮件", icon: FileText },
    { num: 4 as Step, label: "发送邮件", icon: Send },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)] flex items-center gap-2">
            <Zap size={22} className="text-[var(--color-accent)]" />
            获客工作流
          </h1>
          <p className="text-sm text-[var(--color-muted-fg)] mt-1">
            分步执行：采集邮箱 → 确认 → 生成邮件 → 发送
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <button
                  onClick={() => { if (isDone || isActive) setStep(s.num); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-[var(--color-accent)] text-white shadow-md"
                      : isDone
                        ? "bg-emerald-500/10 text-emerald-600 cursor-pointer"
                        : "text-[var(--color-muted-fg)]"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} />
                  ) : isActive ? (
                    <Icon size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                  <span className="font-medium">{s.label}</span>
                </button>
                {i < 3 && <ArrowRight size={14} className="text-[var(--color-muted-fg)]" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Collect */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">1</span>
                采集邮箱
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">行业</label>
                  <Input
                    value={collectForm.industry}
                    onChange={(e) => setCollectForm({ ...collectForm, industry: e.target.value })}
                    placeholder="如：electronics, manufacturing"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">国家/地区</label>
                  <Input
                    value={collectForm.country}
                    onChange={(e) => setCollectForm({ ...collectForm, country: e.target.value })}
                    placeholder="如：USA, Germany, Japan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">搜索关键词</label>
                  <Input
                    value={collectForm.keywords}
                    onChange={(e) => setCollectForm({ ...collectForm, keywords: e.target.value })}
                    placeholder="逗号分隔，如：PLC, servo motor"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">指定公司域名</label>
                  <Input
                    value={collectForm.companyDomains}
                    onChange={(e) => setCollectForm({ ...collectForm, companyDomains: e.target.value })}
                    placeholder="逗号分隔，如：siemens.com, abb.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">目标网址（每行一个，用于网页爬取）</label>
                <textarea
                  value={collectForm.urls}
                  onChange={(e) => setCollectForm({ ...collectForm, urls: e.target.value })}
                  placeholder={"https://example.com/contact\nhttps://example.com/about"}
                  className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-4 py-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-fg)] mb-2 block">采集来源</label>
                <div className="flex gap-2">
                  {[
                    { key: "apollo", label: "Apollo API" },
                    { key: "hunter", label: "Hunter API" },
                    { key: "web-scraper", label: "网页爬取" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => toggleSource(s.key)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        collectForm.sources.includes(s.key)
                          ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                          : "border-[var(--color-glass-border)] text-[var(--color-muted-fg)] hover:border-[var(--color-accent)]/30"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCollect}
                  disabled={collectMutation.isPending || !!jobId}
                  className="min-w-[140px]"
                >
                  {collectMutation.isPending || jobId ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />采集...</>
                  ) : (
                    <><Play size={16} className="mr-2" />开始采集</>
                  )}
                </Button>
                {jobId && jobStatus && (
                  <span className="text-sm text-[var(--color-muted-fg)]">
                    状态：{jobStatus.state === "waiting" ? "等待中" : jobStatus.state === "active" ? "采集中..." : jobStatus.state}
                  </span>
                )}
              </div>

              {collectResult && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-sm font-medium text-emerald-600">
                    采集完成，共获得 {collectResult.count || 0} 个邮箱
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setStep(2)}>
                    查看结果 <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirm contacts */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">2</span>
                确认邮箱列表
                <Badge variant="secondary" className="ml-auto">{selectedIds.size} 已选</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-muted-fg)]" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-muted-fg)]">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无联系人</p>
                  <p className="text-xs mt-1 opacity-60">请先在步骤 1 采集邮箱</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                      {selectedIds.size === contacts.length ? "取消全选" : "全选"}
                    </Button>
                    {selectedIds.size > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                        清除选择
                      </Button>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>公司</TableHead>
                        <TableHead>联系人</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>职位</TableHead>
                        <TableHead>验证状态</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((c: any) => (
                        <TableRow key={c.id} className={selectedIds.has(c.id) ? "bg-[var(--color-accent)]/5" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="w-4 h-4 rounded accent-[var(--color-accent)]"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{c.company?.name || "-"}</TableCell>
                          <TableCell className="text-sm font-medium">{c.firstName} {c.lastName}</TableCell>
                          <TableCell className="text-sm font-mono">{c.email}</TableCell>
                          <TableCell className="text-sm text-[var(--color-muted-fg)]">{c.position || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={c.verificationStatus === "valid" ? "success" : c.verificationStatus === "invalid" ? "destructive" : "secondary"}>
                              {c.verificationStatus === "valid" ? "有效" : c.verificationStatus === "invalid" ? "无效" : "待验证"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => removeSelected(c.id)} className="text-[var(--color-muted-fg)] hover:text-[var(--color-danger)]">
                              <Trash2 size={14} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft size={14} className="mr-1" />上一步
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={selectedIds.size === 0 || generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />生成中...</>
                  ) : (
                    <>下一步：生成邮件 ({selectedIds.size}) <ArrowRight size={14} className="ml-1" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generated drafts */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">3</span>
                生成的邮件草稿
                <Badge variant="secondary" className="ml-auto">{drafts.length} 封</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {draftsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-muted-fg)]" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-muted-fg)]">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无邮件草稿</p>
                  <p className="text-xs mt-1 opacity-60">请先在步骤 2 选择联系人并生成邮件</p>
                </div>
              ) : (
                drafts.map((draft: any) => (
                  <div key={draft.id} className="p-4 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-surface)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={draft.status === "sent" ? "success" : draft.status === "approved" ? "default" : "secondary"}>
                          {draft.status === "sent" ? "已发送" : draft.status === "approved" ? "待发送" : "草稿"}
                        </Badge>
                        {editingDraft === draft.id ? (
                          <Input
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="flex-1"
                          />
                        ) : (
                          <span className="font-medium text-sm text-[var(--color-fg)]">{draft.subject}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {editingDraft === draft.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={saveDraft} disabled={updateDraftMutation.isPending}>
                              <Save size={14} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingDraft(null)}>
                              <X size={14} />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEditDraft(draft)}>
                            <Edit3 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                    {editingDraft === draft.id ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-4 py-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                      />
                    ) : (
                      <div className="text-xs text-[var(--color-muted-fg)] line-clamp-3" dangerouslySetInnerHTML={{ __html: draft.body }} />
                    )}
                  </div>
                ))
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft size={14} className="mr-1" />上一步
                </Button>
                <Button onClick={() => setStep(4)} disabled={drafts.length === 0}>
                  下一步：发送邮件 <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Send + Feedback */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">4</span>
                  发送邮件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">选择发送邮箱</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    <option value="">-- 选择邮箱 --</option>
                    {Array.isArray(accounts) && accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.email} ({acc.status === "active" ? "活跃" : acc.status})
                      </option>
                    ))}
                  </select>
                  {(!accounts || (Array.isArray(accounts) && accounts.length === 0)) && (
                    <p className="text-xs text-[var(--color-muted-fg)] mt-1">
                      请先在 设置 → 我的邮箱 中配置发送邮箱
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                  <p className="text-sm text-[var(--color-fg)]">
                    待发送：{drafts.filter((d: any) => d.status === "draft" || d.status === "approved").length} 封
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft size={14} className="mr-1" />上一步
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !selectedAccountId}
                    className="min-w-[120px]"
                  >
                    {sendMutation.isPending ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />发送中...</>
                    ) : (
                      <><Send size={16} className="mr-2" />发送邮件</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare size={18} />
                    反馈与回复
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["workflow-feedback"] })}
                  >
                    <RefreshCw size={14} className="mr-1" />刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {feedback.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-muted-fg)]">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无回复</p>
                    <p className="text-xs mt-1 opacity-60">邮件发送后，回复会在这里显示</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((thread: any) => (
                      <div key={thread.id} className="p-3 rounded-xl border border-[var(--color-glass-border)] hover:border-[var(--color-accent)]/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={thread.isHotLead ? "success" : thread.status === "replied" ? "default" : "secondary"}>
                              {thread.isHotLead ? "热门" : thread.status === "replied" ? "已回复" : thread.status}
                            </Badge>
                            <span className="text-sm font-medium text-[var(--color-fg)]">{thread.subject}</span>
                          </div>
                          <span className="text-xs text-[var(--color-muted-fg)]">
                            {new Date(thread.lastMessageAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        {thread.contact && (
                          <p className="text-xs text-[var(--color-muted-fg)] mt-1">
                            {thread.contact.firstName} {thread.contact.lastName} - {thread.contact.email}
                          </p>
                        )}
                        {thread.messages?.[0] && (
                          <p className="text-xs text-[var(--color-muted-fg)] mt-2 line-clamp-2">
                            {thread.messages[0].bodyText || thread.messages[0].body?.replace(/<[^>]*>/g, "").slice(0, 150)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
