"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Plus, Upload, Download, Search, RefreshCw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ companyName:"", domain:"", firstName:"", lastName:"", email:"", position:"", industry:"", country:"" });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leads", search, page],
    queryFn: () => apiGet("/leads", { params: { search: search || undefined, page: String(page), pageSize: "20" } }) as Promise<any>,
  });

  const createMutation = useMutation({ mutationFn: (d: any) => apiPost("/leads", d), onSuccess: () => { toast.success("线索已添加"); setShowAdd(false); setNewLead({ companyName:"", domain:"", firstName:"", lastName:"", email:"", position:"", industry:"", country:"" }); queryClient.invalidateQueries({ queryKey: ["leads"] }); }, onError: (e: any) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiDelete(`/leads/${id}`), onSuccess: () => { toast.success("已删除"); queryClient.invalidateQueries({ queryKey: ["leads"] }); } });
  const importMutation = useMutation({ mutationFn: async (file: File) => { const fd = new FormData(); fd.append("file", file); return apiPost("/leads/import", fd, { headers: { "Content-Length": undefined } } as any); }, onSuccess: (r: any) => { toast.success(`导入完成：${r.data.success} 条成功`); queryClient.invalidateQueries({ queryKey: ["leads"] }); }, onError: (e: any) => toast.error(e.message) });
  const collectMutation = useMutation({ mutationFn: () => apiPost("/leads/collect", { industry:"电子产品", country:"USA", keywords:["importer","wholesale"], sources:["apollo","hunter"], companyDomains:["techimport1.com"] }), onSuccess: () => { toast.success("采集任务已创建，队列处理中"); refetch(); }, onError: (e: any) => toast.error(e.message) });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">线索库</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload size={16} className="mr-1" />导入CSV</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && importMutation.mutate(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending}><RefreshCw size={16} className={`mr-1 ${collectMutation.isPending ? "animate-spin" : ""}`} />采集线索</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} className="mr-1" />添加线索</Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input placeholder="搜索公司/姓名/邮箱..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw size={14} className="mr-1" />刷新</Button>
        </div>

        {isLoading ? <p className="text-center py-12 text-gray-500">加载中...</p> : !data?.data?.length ? <Card><CardContent className="p-12 text-center text-gray-500">暂无线索，点击"添加线索"或"采集线索"开始</CardContent></Card> : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="text-left px-4 py-3 font-medium">公司</th><th className="text-left px-4 py-3 font-medium">联系人</th><th className="text-left px-4 py-3 font-medium">邮箱</th><th className="text-left px-4 py-3 font-medium">职位</th><th className="text-left px-4 py-3 font-medium">来源</th><th className="text-left px-4 py-3 font-medium">验证</th><th className="text-left px-4 py-3 font-medium">评分</th><th className="text-left px-4 py-3 font-medium">操作</th></tr></thead>
                <tbody>
                  {(data.data as any[]).map((lead: any) => (
                    <tr key={lead.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3"><div className="font-medium">{lead.company?.name || "-"}</div><div className="text-xs text-gray-500">{lead.company?.industry} · {lead.company?.country}</div></td>
                      <td className="px-4 py-3">{lead.firstName} {lead.lastName}</td>
                      <td className="px-4 py-3 text-blue-600">{lead.email}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{lead.position || "-"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{lead.source}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={lead.verificationStatus === "valid" ? "success" : lead.verificationStatus === "invalid" ? "destructive" : "secondary"} className="text-xs">{lead.verificationStatus}</Badge></td>
                      <td className="px-4 py-3"><span className={`font-bold ${lead.score >= 70 ? "text-green-600" : lead.score >= 40 ? "text-yellow-600" : "text-gray-400"}`}>{lead.score}</span></td>
                      <td className="px-4 py-3"><Button variant="ghost" size="icon" onClick={() => { if (confirm("确定删除？")) deleteMutation.mutate(lead.id); }}><Trash2 size={14} className="text-red-500" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">共 {data?.meta?.total || 0} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={(data?.data?.length || 0) < 20} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          </>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>添加线索</DialogTitle><DialogClose onClick={() => setShowAdd(false)} /></DialogHeader>
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); createMutation.mutate(newLead); }}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium">公司名</label><Input value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName:e.target.value})} required /></div>
                <div><label className="text-xs font-medium">域名</label><Input value={newLead.domain} onChange={e => setNewLead({...newLead, domain:e.target.value})} placeholder="example.com" required /></div>
                <div><label className="text-xs font-medium">姓</label><Input value={newLead.firstName} onChange={e => setNewLead({...newLead, firstName:e.target.value})} required /></div>
                <div><label className="text-xs font-medium">名</label><Input value={newLead.lastName} onChange={e => setNewLead({...newLead, lastName:e.target.value})} required /></div>
                <div className="col-span-2"><label className="text-xs font-medium">邮箱</label><Input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email:e.target.value})} required /></div>
                <div><label className="text-xs font-medium">职位</label><Input value={newLead.position} onChange={e => setNewLead({...newLead, position:e.target.value})} /></div>
                <div><label className="text-xs font-medium">行业</label><Input value={newLead.industry} onChange={e => setNewLead({...newLead, industry:e.target.value})} /></div>
                <div><label className="text-xs font-medium">国家</label><Input value={newLead.country} onChange={e => setNewLead({...newLead, country:e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>添加</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
