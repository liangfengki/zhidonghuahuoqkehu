"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  Plus, Upload, Download, Search, RefreshCw, Trash2,
  User, Building2, Globe, Mail, Phone, MapPin, Briefcase,
  Filter, X, ChevronRight, MoreHorizontal
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showFab, setShowFab] = useState(false);
  const [collectForm, setCollectForm] = useState({ industry: "", country: "", keywords: "", companyDomains: "" });
  const [newLead, setNewLead] = useState({
    companyName: "", domain: "", firstName: "", lastName: "",
    email: "", position: "", industry: "", country: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leads", search, page],
    queryFn: () =>
      apiGet("/leads", {
        params: { search: search || undefined, page: String(page), pageSize: "24" },
      }) as Promise<any>,
  });

  const leads = data?.data || [];
  const total = data?.meta?.total || 0;

  const createM = useMutation({
    mutationFn: (d: any) => apiPost("/leads", d),
    onSuccess: () => {
      toast.success("线索已添加");
      setShowAdd(false);
      setNewLead({ companyName: "", domain: "", firstName: "", lastName: "", email: "", position: "", industry: "", country: "" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete(`/leads/${id}`),
    onSuccess: () => { toast.success("已删除"); queryClient.invalidateQueries({ queryKey: ["leads"] }); },
  });
  const importM = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiPost("/leads/import", fd, { headers: { "Content-Length": undefined } } as any);
    },
    onSuccess: (r: any) => {
      toast.success("导入完成：" + r.data.success + " 条成功");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const collectM = useMutation({
    mutationFn: () => {
      const domains = collectForm.companyDomains.split(",").map((s) => s.trim()).filter(Boolean);
      const kws = collectForm.keywords.split(",").map((s) => s.trim()).filter(Boolean);
      return apiPost("/leads/collect", {
        industry: collectForm.industry || undefined,
        country: collectForm.country || undefined,
        keywords: kws.length ? kws : undefined,
        sources: ["apollo", "hunter"],
        companyDomains: domains.length ? domains : undefined,
      });
    },
    onSuccess: () => { toast.success("采集任务已创建，队列处理中"); setShowCollect(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const scoreColor = (s: number) =>
    s >= 70 ? "text-emerald-500" : s >= 40 ? "text-amber-500" : "text-[var(--color-muted-fg)]";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">线索库</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importM.mutate(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => setShowCollect(true)}>
              <RefreshCw size={16} />
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={16} className="mr-1" />添加
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-fg)]" />
            <Input
              placeholder="搜索公司、姓名或邮箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              <X size={14} className="mr-1" />清除
            </Button>
          )}
        </div>

        {/* Leads grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}><CardContent className="p-5 space-y-3"><div className="h-4 w-32 bg-[var(--color-subtle)] rounded-lg animate-pulse" /><div className="h-3 w-20 bg-[var(--color-subtle)] rounded animate-pulse" /><div className="h-3 w-48 bg-[var(--color-subtle)] rounded animate-pulse" /></CardContent></Card>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-[var(--color-muted-fg)]">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无线索</p>
              <p className="text-xs mt-1 opacity-60">点击添加或采集线索开始</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.map((lead: any) => (
                <Card
                  key={lead.id}
                  className="group cursor-pointer hover:-translate-y-0.5"
                  onClick={() => setSelectedLead(lead)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[var(--color-fg)] truncate">{lead.companyName || "未命名"}</h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted-fg)]">
                          <Globe size={11} />
                          <span>{lead.domain || "-"}</span>
                        </div>
                      </div>
                      {/* Score ring */}
                      <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-subtle)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke={lead.score >= 70 ? "#10b981" : lead.score >= 40 ? "#f59e0b" : "var(--color-muted-fg)"} strokeWidth="3" strokeDasharray={`${(lead.score || 0) * 0.94} 94`} strokeLinecap="round" />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor(lead.score)}`}>{lead.score || 0}</span>
                      </div>
                    </div>
                    {lead.firstName && (
                      <p className="text-sm text-[var(--color-fg)] truncate">
                        {lead.firstName} {lead.lastName}{lead.position ? " · " + lead.position : ""}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-[var(--color-muted-fg)]">
                        <Mail size={11} />
                        <span className="truncate max-w-[120px]">{lead.email || "-"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); if (confirm("确定删除？")) deleteM.mutate(lead.id); }}
                      >
                        <Trash2 size={13} className="text-[var(--color-danger)]" />
                      </Button>
                    </div>
                    {lead.industry && (
                      <Badge variant="secondary" className="text-[10px]">{lead.industry}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-muted-fg)]">共 {total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={leads.length < 24} onClick={() => setPage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          </>
        )}

        {/* Lead detail drawer */}
        {selectedLead && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-heavy shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between p-5 border-b border-[var(--color-glass-border)]">
                <h3 className="font-semibold text-[var(--color-fg)]">线索详情</h3>
                <button onClick={() => setSelectedLead(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-subtle)] text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-auto" style={{ maxHeight: "calc(100vh - 60px)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
                    <Building2 size={24} className="text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedLead.companyName}</h2>
                    <p className="text-xs text-[var(--color-muted-fg)]">{selectedLead.domain}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                    <p className="text-[10px] text-[var(--color-muted-fg)] uppercase tracking-wider mb-1">评分</p>
                    <p className={`text-xl font-bold ${scoreColor(selectedLead.score)}`}>{selectedLead.score}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                    <p className="text-[10px] text-[var(--color-muted-fg)] uppercase tracking-wider mb-1">状态</p>
                    <Badge variant={selectedLead.status === "verified" ? "success" : "secondary"}>{selectedLead.status || "新建"}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {[{ icon: User, label: "联系人", value: selectedLead.firstName ? selectedLead.firstName + " " + (selectedLead.lastName || "") : "-" },
                    { icon: Mail, label: "邮箱", value: selectedLead.email || "-" },
                    { icon: Briefcase, label: "职位", value: selectedLead.position || "-" },
                    { icon: MapPin, label: "国家", value: selectedLead.country || "-" },
                    { icon: Building2, label: "行业", value: selectedLead.industry || "-" }].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <f.icon size={15} className="text-[var(--color-muted-fg)]" />
                      <span className="text-[var(--color-muted-fg)] w-14 text-xs">{f.label}</span>
                      <span className="text-[var(--color-fg)]">{f.value}</span>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full" onClick={() => { if (confirm("确定删除？")) { deleteM.mutate(selectedLead.id); setSelectedLead(null); } }}>
                  <Trash2 size={14} className="mr-1" />删除此线索
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Add Lead Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>添加线索</DialogTitle><DialogClose onClick={() => setShowAdd(false)} /></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createM.mutate(newLead); }}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-[var(--color-fg)]">公司名</label><Input value={newLead.companyName} onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })} required /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">域名</label><Input value={newLead.domain} onChange={(e) => setNewLead({ ...newLead, domain: e.target.value })} placeholder="example.com" required /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">姓</label><Input value={newLead.firstName} onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })} required /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">名</label><Input value={newLead.lastName} onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })} required /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-[var(--color-fg)]">邮箱</label><Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} required /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">职位</label><Input value={newLead.position} onChange={(e) => setNewLead({ ...newLead, position: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">行业</label><Input value={newLead.industry} onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">国家</label><Input value={newLead.country} onChange={(e) => setNewLead({ ...newLead, country: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createM.isPending}>添加</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Collect Dialog */}
        <Dialog open={showCollect} onOpenChange={setShowCollect}>
          <DialogContent>
            <DialogHeader><DialogTitle>采集线索</DialogTitle><DialogClose onClick={() => setShowCollect(false)} /></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); collectM.mutate(); }}>
              <div><label className="text-xs font-medium text-[var(--color-fg)]">关键词（逗号分隔）</label><Input value={collectForm.keywords} onChange={(e) => setCollectForm({ ...collectForm, keywords: e.target.value })} placeholder="importer, wholesale, buyer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-[var(--color-fg)]">行业</label><Input value={collectForm.industry} onChange={(e) => setCollectForm({ ...collectForm, industry: e.target.value })} placeholder="电子产品" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">国家</label><Input value={collectForm.country} onChange={(e) => setCollectForm({ ...collectForm, country: e.target.value })} placeholder="USA" /></div>
              </div>
              <div><label className="text-xs font-medium text-[var(--color-fg)]">指定公司域名（可选）</label><Input value={collectForm.companyDomains} onChange={(e) => setCollectForm({ ...collectForm, companyDomains: e.target.value })} placeholder="example.com, company.com" /></div>
              <p className="text-xs text-[var(--color-muted-fg)]">需在设置中配置 Apollo/Hunter API Key</p>
              <Button type="submit" className="w-full" disabled={collectM.isPending}>{collectM.isPending ? "采集中..." : "开始采集"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
