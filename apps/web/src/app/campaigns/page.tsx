"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Plus, Play, Pause, BarChart3, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { toast } from "sonner";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState({ name: "", industryFilter: [""], countryFilter: [""], dailyLimit: 50 });
  const [showStats, setShowStats] = useState<string | null>(null);

  const { data: templatesData } = useQuery({ queryKey: ["templates"], queryFn: () => apiGet("/templates") as Promise<any> });
  const templates = (templatesData as any)?.data || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiGet("/campaigns") as Promise<any>,
  });
  const campaigns = (data as any)?.data || [];

  const { data: statsData } = useQuery({
    queryKey: ["campaign-stats", showStats],
    queryFn: () => showStats ? apiGet(`/campaigns/${showStats}/stats`) as Promise<any> : null,
    enabled: !!showStats,
  });

  const createMutation = useMutation({ mutationFn: (d: any) => {
    if (!d.templateId) return Promise.reject(new Error("请先创建邮件模板"));
    return apiPost("/campaigns", d);
  }, onSuccess: () => { toast.success("活动已创建"); setShowCreate(false); setWizardStep(0); setForm({ name:"", industryFilter:[""], countryFilter:[""], dailyLimit:50 }); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); }, onError: (e: any) => toast.error(e.message) });

  const startMutation = useMutation({ mutationFn: (id: string) => apiPost(`/campaigns/${id}/start`), onSuccess: (r: any) => { toast.success(`活动已启动，${r?.data?.targetsQueued ?? "N/A"} 封邮件加入队列`); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); }, onError: (e: any) => toast.error(e.message) });
  const pauseMutation = useMutation({ mutationFn: (id: string) => apiPost(`/campaigns/${id}/pause`), onSuccess: () => { toast.success("活动已暂停"); queryClient.invalidateQueries({ queryKey: ["campaigns"] }); } });

  const statusColors: Record<string, string> = { draft: "secondary", running: "success", paused: "warning", completed: "outline" };
  const statusLabel: Record<string, string> = { draft: "草稿", running: "运行中", paused: "已暂停", completed: "已完成" };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">活动管理</h1>
          <Button size="sm" onClick={() => { setShowCreate(true); setWizardStep(0); }}><Plus size={16} className="mr-1" />创建活动</Button>
        </div>

        {isLoading ? <p className="text-center py-12 text-gray-500">加载中...</p> : campaigns.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-gray-500">暂无活动，点击"创建活动"开始邮件营销</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between"><CardTitle className="text-base">{c.name}</CardTitle><Badge variant={(statusColors[c.status] as any) || "secondary"}>{statusLabel[c.status] || c.status}</Badge></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">目标行业</span><span>{c.industryFilter?.length ? (typeof c.industryFilter === 'string' ? JSON.parse(c.industryFilter) : c.industryFilter).join(", ") : "不限"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">每日限额</span><span className="font-mono">{c.dailyLimit} 封</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">已发送</span><span className="font-bold">{c.totalSent || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">已回复</span><span className="font-bold text-green-600">{c.totalReplied || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">模板</span><span className="text-blue-600 text-xs">{c.template?.name || "未关联"}</span></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {c.status === "draft" || c.status === "paused" ? <Button size="sm" variant="outline" onClick={() => startMutation.mutate(c.id)} disabled={startMutation.isPending}><Play size={14} className="mr-1" />启动</Button> : null}
                    {c.status === "running" ? <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(c.id)} disabled={pauseMutation.isPending}><Pause size={14} className="mr-1" />暂停</Button> : null}
                    <Button size="sm" variant="ghost" onClick={() => setShowStats(showStats === c.id ? null : c.id)}><BarChart3 size={14} className="mr-1" />统计</Button>
                  </div>
                  {showStats === c.id && statsData?.data && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-1">
                      <div>目标数：{statsData.data.campaign?._count?.campaignContacts ?? statsData.data.targets ?? "-"}</div>
                      <div>状态分布：{JSON.stringify(statsData.data.statusBreakdown)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>{wizardStep === 0 ? "创建活动 - 基本信息" : wizardStep === 1 ? "选择邮件模板" : "预览确认"}</DialogTitle><DialogClose onClick={() => setShowCreate(false)} /></DialogHeader>
            {wizardStep === 0 && (
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); setWizardStep(1); }}>
                <div><label className="text-xs font-medium">活动名称</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="如：美国电子采购商 5月开发" required /></div>
                <div><label className="text-xs font-medium">目标行业（逗号分隔）</label><Input value={form.industryFilter.join(",")} onChange={e => setForm({...form, industryFilter: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} placeholder="电子产品,汽车配件" /></div>
                <div><label className="text-xs font-medium">目标国家（逗号分隔）</label><Input value={form.countryFilter.join(",")} onChange={e => setForm({...form, countryFilter: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} placeholder="USA,Germany" /></div>
                <div><label className="text-xs font-medium">每日发送上限</label><Input type="number" value={form.dailyLimit} onChange={e => setForm({...form, dailyLimit: Number(e.target.value)})} min={1} max={500} required /></div>
                <Button type="submit" className="w-full" disabled={!form.name}>下一步：选择模板</Button>
              </form>
            )}
            {wizardStep === 1 && (
              <div className="space-y-3">
                {templates.length === 0 ? <p className="text-center text-gray-500 py-4">暂无模板，请先去系统设置创建</p> : templates.map((t: any) => (
                  <div key={t.id} className={`p-3 border rounded cursor-pointer hover:border-blue-500 ${(form as any).templateId === t.id ? "border-blue-500 bg-blue-50" : ""}`} onClick={() => setForm({...form, templateId: t.id} as any)}>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-1">主题：{t.subject}</div>
                    <div className="text-xs text-gray-400 mt-1">变量：{Array.isArray(t.variables) ? t.variables.join(", ") : "-"}</div>
                  </div>
                ))}
                <div className="flex gap-2"><Button variant="outline" onClick={() => setWizardStep(0)}>上一步</Button><Button onClick={() => setWizardStep(2)} disabled={!(form as any).templateId}>下一步</Button></div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="text-sm space-y-2">
                  <div><span className="font-medium">名称：</span>{form.name}</div>
                  <div><span className="font-medium">行业：</span>{form.industryFilter.join(", ") || "不限"}</div>
                  <div><span className="font-medium">国家：</span>{form.countryFilter.join(", ") || "不限"}</div>
                  <div><span className="font-medium">日限额：</span>{form.dailyLimit} 封</div>
                  <div><span className="font-medium">模板：</span>{templates.find((t: any) => t.id === (form as any).templateId)?.name}</div>
                </div>
                <div className="flex gap-2"><Button variant="outline" onClick={() => setWizardStep(1)}>上一步</Button><Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>确认创建</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
