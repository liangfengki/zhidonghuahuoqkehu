"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  ArrowLeft, Edit, Trash2, RefreshCw, Mail, Building2, User,
  Briefcase, MapPin, Globe, Phone, Clock, CheckCircle, AlertCircle, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";

interface Lead {
  id: string;
  companyName: string;
  domain: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  industry: string;
  country: string;
  phone: string;
  score: number;
  verificationStatus: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", params.id],
    queryFn: () => apiGet(`/leads/${params.id}`) as Promise<any>,
  });

  const updateM = useMutation({
    mutationFn: (data: Partial<Lead>) => apiPut(`/leads/${params.id}`, data),
    onSuccess: () => {
      toast.success("线索已更新");
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ["lead", params.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: () => apiDelete(`/leads/${params.id}`),
    onSuccess: () => {
      toast.success("线索已删除");
      router.push("/leads");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const enrichM = useMutation({
    mutationFn: () => apiPost(`/leads/enrich/${params.id}`),
    onSuccess: () => {
      toast.success("数据补全任务已创建");
      queryClient.invalidateQueries({ queryKey: ["lead", params.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = () => {
    if (lead?.data) {
      setEditForm({
        companyName: lead.data.companyName,
        domain: lead.data.domain,
        firstName: lead.data.firstName,
        lastName: lead.data.lastName,
        email: lead.data.email,
        position: lead.data.position,
        industry: lead.data.industry,
        country: lead.data.country,
        phone: lead.data.phone,
      });
      setShowEdit(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateM.mutate(editForm);
  };

  const scoreColor = (s: number) =>
    s >= 70 ? "text-emerald-500" : s >= 40 ? "text-amber-500" : "text-[var(--color-muted-fg)]";

  const statusColor = (status: string) => {
    switch (status) {
      case "verified": return "success";
      case "invalid": return "destructive";
      case "pending": return "warning";
      default: return "secondary";
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "verified": return "已验证";
      case "invalid": return "无效";
      case "pending": return "待验证";
      default: return status || "未知";
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 w-32 bg-[var(--color-subtle)] rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-48 bg-[var(--color-subtle)] rounded animate-pulse" />
                <div className="h-4 w-32 bg-[var(--color-subtle)] rounded animate-pulse" />
                <div className="h-4 w-64 bg-[var(--color-subtle)] rounded animate-pulse" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-32 bg-[var(--color-subtle)] rounded animate-pulse" />
                <div className="h-4 w-48 bg-[var(--color-subtle)] rounded animate-pulse" />
                <div className="h-4 w-40 bg-[var(--color-subtle)] rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !lead?.data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[var(--color-muted-fg)]" />
          <h2 className="text-xl font-semibold mb-2">线索未找到</h2>
          <p className="text-[var(--color-muted-fg)] mb-4">该线索可能已被删除或不存在</p>
          <Button onClick={() => router.push("/leads")}>
            <ArrowLeft size={16} className="mr-1" />返回线索列表
          </Button>
        </div>
      </AppLayout>
    );
  }

  const leadData = lead.data;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/leads")}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-fg)]">{leadData.companyName || "未命名公司"}</h1>
              <p className="text-sm text-[var(--color-muted-fg)]">{leadData.domain}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit size={16} className="mr-1" />编辑
            </Button>
            <Button variant="outline" size="sm" onClick={() => enrichM.mutate()} disabled={enrichM.isPending}>
              <RefreshCw size={16} className="mr-1" />{enrichM.isPending ? "补全中..." : "数据补全"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => {
              if (confirm("确定删除此线索？")) {
                deleteM.mutate();
              }
            }}>
              <Trash2 size={16} className="mr-1" />删除
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={20} />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
                  <Building2 size={24} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{leadData.companyName}</h2>
                  <p className="text-xs text-[var(--color-muted-fg)]">{leadData.domain}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                  <p className="text-[10px] text-[var(--color-muted-fg)] uppercase tracking-wider mb-1">评分</p>
                  <p className={`text-xl font-bold ${scoreColor(leadData.score)}`}>{leadData.score || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-subtle)]">
                  <p className="text-[10px] text-[var(--color-muted-fg)] uppercase tracking-wider mb-1">验证状态</p>
                  <Badge variant={statusColor(leadData.verificationStatus) as any}>
                    {statusText(leadData.verificationStatus)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Globe, label: "域名", value: leadData.domain || "-" },
                  { icon: Mail, label: "邮箱", value: leadData.email || "-" },
                  { icon: Phone, label: "电话", value: leadData.phone || "-" },
                  { icon: MapPin, label: "国家", value: leadData.country || "-" },
                  { icon: Briefcase, label: "行业", value: leadData.industry || "-" },
                ].map((field, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <field.icon size={15} className="text-[var(--color-muted-fg)]" />
                    <span className="text-[var(--color-muted-fg)] w-14 text-xs">{field.label}</span>
                    <span className="text-[var(--color-fg)]">{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                联系人信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
                  <User size={24} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {leadData.firstName} {leadData.lastName}
                  </h2>
                  <p className="text-xs text-[var(--color-muted-fg)]">{leadData.position || "未设置职位"}</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: User, label: "姓名", value: `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim() || "-" },
                  { icon: Mail, label: "邮箱", value: leadData.email || "-" },
                  { icon: Briefcase, label: "职位", value: leadData.position || "-" },
                  { icon: Phone, label: "电话", value: leadData.phone || "-" },
                ].map((field, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <field.icon size={15} className="text-[var(--color-muted-fg)]" />
                    <span className="text-[var(--color-muted-fg)] w-14 text-xs">{field.label}</span>
                    <span className="text-[var(--color-fg)]">{field.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--color-glass-border)]">
                <h3 className="text-sm font-medium mb-3">来源信息</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                    <span className="font-medium">来源:</span>
                    <span>{leadData.source || "未知"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                    <Clock size={12} />
                    <span>创建时间: {new Date(leadData.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                    <Clock size={12} />
                    <span>更新时间: {new Date(leadData.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑线索</DialogTitle>
            <DialogClose onClick={() => setShowEdit(false)} />
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">公司名</label>
                <Input
                  value={editForm.companyName || ""}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">域名</label>
                <Input
                  value={editForm.domain || ""}
                  onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">姓</label>
                <Input
                  value={editForm.firstName || ""}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">名</label>
                <Input
                  value={editForm.lastName || ""}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-[var(--color-fg)]">邮箱</label>
                <Input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">职位</label>
                <Input
                  value={editForm.position || ""}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">行业</label>
                <Input
                  value={editForm.industry || ""}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">国家</label>
                <Input
                  value={editForm.country || ""}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-fg)]">电话</label>
                <Input
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateM.isPending}>
              {updateM.isPending ? "保存中..." : "保存更改"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}