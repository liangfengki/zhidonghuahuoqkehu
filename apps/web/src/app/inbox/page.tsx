"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { toast } from "sonner";
import {
  Mail, Inbox as InboxIcon, Flame, UserCheck, Send, Archive,
  Sparkles, ChevronLeft, Clock, MoreHorizontal, Filter
} from "lucide-react";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inbox-threads", activeTab],
    queryFn: () =>
      apiGet("/inbox/threads", {
        params: {
          status: activeTab === "new" ? "new" : activeTab === "assigned" ? "follow_up" : undefined,
          isHotLead: activeTab === "hot" ? "true" : undefined,
        },
      }) as Promise<any>,
  });

  const { data: threadDetail } = useQuery({
    queryKey: ["inbox-thread", selectedThread?.id],
    queryFn: () =>
      selectedThread ? (apiGet("/inbox/threads/" + selectedThread.id) as Promise<any>) : null,
    enabled: !!selectedThread?.id,
  });

  const replyMutation = useMutation({
    mutationFn: (data: { id: string; body: string }) =>
      apiPost("/inbox/threads/" + data.id + "/reply", { body: data.body }),
    onSuccess: () => {
      toast.success("回复已发送");
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["inbox-thread"] });
    },
  });
  const assignMutation = useMutation({
    mutationFn: (data: { id: string; userId: string }) =>
      apiPut("/inbox/threads/" + data.id + "/assign", { userId: data.userId }),
    onSuccess: () => { toast.success("已分配"); queryClient.invalidateQueries({ queryKey: ["inbox-threads"] }); },
  });
  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      apiPut("/inbox/threads/" + data.id + "/status", { status: data.status }),
    onSuccess: () => { toast.success("状态已更新"); queryClient.invalidateQueries({ queryKey: ["inbox-threads"] }); },
  });

  const tabs = [
    { key: "all", label: "全部", icon: InboxIcon },
    { key: "new", label: "未读", icon: Mail },
    { key: "hot", label: "热线索", icon: Flame },
    { key: "assigned", label: "已分配", icon: UserCheck },
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-0">
        {/* Thread list */}
        <div
          className={`${
            selectedThread ? "hidden md:block md:w-[360px]" : "w-full md:w-[420px]"
          } border-r border-[var(--color-glass-border)] overflow-auto`}
        >
          <div className="p-4">
            <h1 className="text-xl font-bold text-[var(--color-fg)] mb-3">收件箱</h1>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-[var(--color-accent)] text-white shadow shadow-[var(--color-accent)]/20"
                      : "bg-[var(--color-subtle)] text-[var(--color-muted-fg)] hover:text-[var(--color-fg)] border border-[var(--color-glass-border)]"
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 space-y-2">
                  <div className="h-3 w-24 bg-[var(--color-subtle)] rounded animate-pulse" />
                  <div className="h-2 w-40 bg-[var(--color-subtle)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : !(data as any)?.data?.length ? (
            <Card className="mx-4">
              <CardContent className="p-8 text-center">
                <InboxIcon size={36} className="mx-auto mb-2 text-[var(--color-muted-fg)]/30" />
                <p className="text-sm text-[var(--color-muted-fg)]">暂无邮件</p>
                <p className="text-xs text-[var(--color-muted-fg)]/60 mt-1">客户回复时将自动显示</p>
              </CardContent>
            </Card>
          ) : (
            ((data as any).data as any[]).map((thread: any) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`p-4 border-b border-[var(--color-glass-border)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-subtle)] ${
                  selectedThread?.id === thread.id
                    ? "bg-[var(--color-accent)]/5 border-l-2 border-l-[var(--color-accent)]"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[var(--color-fg)] truncate">
                        {thread.contact?.firstName} {thread.contact?.lastName || thread.subject}
                      </span>
                      {thread.isHotLead && (
                        <Badge variant="destructive" className="shrink-0 text-[10px] gap-0.5">
                          <Flame size={10} />热
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-muted-fg)] mt-0.5 truncate">{thread.subject}</div>
                  </div>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-[var(--color-muted-fg)]/70 truncate max-w-[180px]">{thread.contact?.email}</span>
                  <span className="text-[11px] text-[var(--color-muted-fg)]/50">
                    {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString("zh-CN") : "-"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Thread detail */}
        {selectedThread ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Detail header */}
            <div className="p-4 border-b border-[var(--color-glass-border)] flex items-center justify-between flex-wrap gap-2">
              <button className="md:hidden p-1.5 rounded-lg hover:bg-[var(--color-subtle)] -ml-1" onClick={() => setSelectedThread(null)}>
                <ChevronLeft size={18} className="text-[var(--color-muted-fg)]" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[var(--color-fg)] truncate">{selectedThread.subject}</h3>
                <p className="text-xs text-[var(--color-muted-fg)]">{selectedThread.contact?.email} · {selectedThread.contact?.position || ""}</p>
              </div>
              <div className="flex gap-2">
                <select
                  className="text-xs rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-subtle)] text-[var(--color-fg)] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  onChange={(e) => { statusMutation.mutate({ id: selectedThread.id, status: e.target.value }); }}
                >
                  <option value="">状态</option>
                  <option value="new">新</option>
                  <option value="follow_up">跟进中</option>
                  <option value="closed_won">已成交</option>
                  <option value="closed_lost">无效</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => assignMutation.mutate({ id: selectedThread.id, userId: "self" })}>
                  <UserCheck size={13} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: selectedThread.id, status: "archived" })}>
                  <Archive size={13} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* AI suggestion */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10">
                <Sparkles size={15} className="text-[var(--color-accent)] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[var(--color-accent)]">AI 提示</p>
                  <p className="text-xs text-[var(--color-muted-fg)]">该客户有采购意向，建议在24小时内跟进回复</p>
                </div>
              </div>
              {(threadDetail as any)?.messages?.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={32} className="mx-auto mb-2 text-[var(--color-muted-fg)]/30" />
                  <p className="text-sm text-[var(--color-muted-fg)]">暂无消息</p>
                </div>
              ) : (
                (threadDetail as any)?.messages?.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl p-3.5 ${
                        msg.direction === "outbound"
                          ? "bg-[var(--color-accent)] text-white rounded-br-md"
                          : "bg-[var(--color-subtle)] text-[var(--color-fg)] rounded-bl-md border border-[var(--color-glass-border)]"
                      }`}
                    >
                      <div className="text-[11px] mb-1 opacity-70">
                        {msg.direction === "outbound" ? "已发送" : "客户"} ·{" "}
                        {new Date(msg.receivedAt || msg.createdAt).toLocaleString("zh-CN")}
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.bodyText || msg.body?.slice(0, 500) || "(HTML邮件)"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-[var(--color-glass-border)]">
              <div className="flex gap-2">
                <Input
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="输入回复内容..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && replyBody) {
                      e.preventDefault();
                      replyMutation.mutate({ id: selectedThread.id, body: replyBody });
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => replyMutation.mutate({ id: selectedThread.id, body: replyBody })}
                  disabled={!replyBody || replyMutation.isPending}
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state for detail panel */
          <div className="hidden md:flex flex-1 items-center justify-center text-center p-8">
            <div>
              <InboxIcon size={48} className="mx-auto mb-3 text-[var(--color-muted-fg)]/20" />
              <p className="text-sm text-[var(--color-muted-fg)]">选择一封邮件查看详情</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
