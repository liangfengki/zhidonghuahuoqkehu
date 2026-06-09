"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  Plus, Play, Pause, BarChart3, Settings, Trash2,
  Mail, Users, Clock, CheckCircle, AlertCircle, X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  status: string;
  industryFilter: string[];
  countryFilter: string[];
  dailyLimit: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    campaignContacts: number;
  };
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    industryFilter: "",
    countryFilter: "",
    dailyLimit: 50,
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiGet("/campaigns") as Promise<any>,
  });

  const { data: stats } = useQuery({
    queryKey: ["campaign-stats", selectedCampaign?.id],
    queryFn: () => apiGet(`/campaigns/${selectedCampaign?.id}/stats`) as Promise<any>,
    enabled: !!selectedCampaign?.id && showStats,
  });

  const createM = useMutation({
    mutationFn: (d: any) => apiPost("/campaigns", d),
    onSuccess: () => {
      toast.success("营销活动已创建");
      setShowCreate(false);
      setNewCampaign({ name: "", industryFilter: "", countryFilter: "", dailyLimit: 50 });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/campaigns/${id}`, data),
    onSuccess: () => {
      toast.success("活动已更新");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startM = useMutation({
    mutationFn: (id: string) => apiPost(`/campaigns/${id}/start`),
    onSuccess: () => {
      toast.success("活动已启动");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pauseM = useMutation({
    mutationFn: (id: string) => apiPost(`/campaigns/${id}/pause`),
    onSuccess: () => {
      toast.success("活动已暂停");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success("活动已删除");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "paused": return "warning";
      case "draft": return "secondary";
      case "completed": return "default";
      default: return "secondary";
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "active": return "进行中";
      case "paused": return "已暂停";
      case "draft": return "草稿";
      case "completed": return "已完成";
      default: return status;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const industries = newCampaign.industryFilter.split(",").map(s => s.trim()).filter(Boolean);
    const countries = newCampaign.countryFilter.split(",").map(s => s.trim()).filter(Boolean);
    createM.mutate({
      name: newCampaign.name,
      industryFilter: industries,
      countryFilter: countries,
      dailyLimit: newCampaign.dailyLimit,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">营销活动</h1>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">管理和监控您的邮件营销活动</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1" />创建活动
          </Button>
        </div>

        {/* Campaigns grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 w-32 bg-[var(--color-subtle)] rounded-lg animate-pulse" />
                  <div className="h-3 w-20 bg-[var(--color-subtle)] rounded animate-pulse" />
                  <div className="h-3 w-48 bg-[var(--color-subtle)] rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !campaigns?.data?.length ? (
          <Card>
            <CardContent className="p-12 text-center text-[var(--color-muted-fg)]">
              <Mail size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无营销活动</p>
              <p className="text-xs mt-1 opacity-60">点击"创建活动"开始您的第一个邮件营销</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.data.map((campaign: Campaign) => (
              <Card key={campaign.id} className="group hover:-translate-y-0.5 transition-transform">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--color-fg)] truncate">{campaign.name}</h3>
                      <p className="text-xs text-[var(--color-muted-fg)] mt-0.5">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusColor(campaign.status) as any}>
                      {statusText(campaign.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {campaign.industryFilter?.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                        <span className="font-medium">行业:</span>
                        <span>{campaign.industryFilter.join(", ")}</span>
                      </div>
                    )}
                    {campaign.countryFilter?.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                        <span className="font-medium">国家:</span>
                        <span>{campaign.countryFilter.join(", ")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-[var(--color-muted-fg)]">
                      <span className="font-medium">每日限额:</span>
                      <span>{campaign.dailyLimit} 封</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-glass-border)]">
                    {campaign.status === "draft" || campaign.status === "paused" ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => startM.mutate(campaign.id)}
                        disabled={startM.isPending}
                      >
                        <Play size={14} className="mr-1" />启动
                      </Button>
                    ) : campaign.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => pauseM.mutate(campaign.id)}
                        disabled={pauseM.isPending}
                      >
                        <Pause size={14} className="mr-1" />暂停
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowStats(true);
                      }}
                    >
                      <BarChart3 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--color-danger)]"
                      onClick={() => {
                        if (confirm("确定删除此活动？")) {
                          deleteM.mutate(campaign.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建营销活动</DialogTitle>
            <DialogClose onClick={() => setShowCreate(false)} />
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="text-xs font-medium text-[var(--color-fg)]">活动名称</label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="例如：Q3 电子产品推广"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-fg)]">目标行业（逗号分隔）</label>
              <Input
                value={newCampaign.industryFilter}
                onChange={(e) => setNewCampaign({ ...newCampaign, industryFilter: e.target.value })}
                placeholder="电子产品, 机械设备"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-fg)]">目标国家（逗号分隔）</label>
              <Input
                value={newCampaign.countryFilter}
                onChange={(e) => setNewCampaign({ ...newCampaign, countryFilter: e.target.value })}
                placeholder="USA, UK, Germany"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-fg)]">每日发送限额</label>
              <Input
                type="number"
                value={newCampaign.dailyLimit}
                onChange={(e) => setNewCampaign({ ...newCampaign, dailyLimit: parseInt(e.target.value) || 50 })}
                min={1}
                max={500}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createM.isPending}>
              {createM.isPending ? "创建中..." : "创建活动"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>活动统计 - {selectedCampaign?.name}</DialogTitle>
            <DialogClose onClick={() => setShowStats(false)} />
          </DialogHeader>
          {stats?.data ? (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users size={24} className="mx-auto mb-2 text-[var(--color-accent)]" />
                  <p className="text-2xl font-bold">{stats.data.totalContacts || 0}</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">总联系人</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Mail size={24} className="mx-auto mb-2 text-[var(--color-accent)]" />
                  <p className="text-2xl font-bold">{stats.data.sentCount || 0}</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">已发送</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold">{stats.data.openedCount || 0}</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">已打开</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle size={24} className="mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{stats.data.repliedCount || 0}</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">已回复</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--color-muted-fg)]">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无统计数据</p>
              <p className="text-xs mt-1 opacity-60">启动活动后将开始收集数据</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}