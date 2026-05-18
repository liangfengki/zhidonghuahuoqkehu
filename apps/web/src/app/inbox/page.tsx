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
import { Mail, UserCheck, Flame, Send } from "lucide-react";

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inbox-threads", activeTab],
    queryFn: () => apiGet("/inbox/threads", { params: {
      status: activeTab === "new" ? "new" : activeTab === "assigned" ? "follow_up" : undefined,
      isHotLead: activeTab === "hot" ? "true" : undefined,
    }}) as Promise<any>,
  });

  const { data: threadDetail } = useQuery({
    queryKey: ["inbox-thread", selectedThread?.id],
    queryFn: () => selectedThread ? apiGet(`/inbox/threads/${selectedThread.id}`) as Promise<any> : null,
    enabled: !!selectedThread?.id,
  });

  const replyMutation = useMutation({ mutationFn: (data: { id: string; body: string }) => apiPost(`/inbox/threads/${data.id}/reply`, { body: data.body }), onSuccess: () => { toast.success("回复已发送"); setReplyBody(""); queryClient.invalidateQueries({ queryKey: ["inbox-thread"] }); } });
  const assignMutation = useMutation({ mutationFn: (data: { id: string; userId: string }) => apiPut(`/inbox/threads/${data.id}/assign`, { userId: data.userId }), onSuccess: () => { toast.success("已分配"); queryClient.invalidateQueries({ queryKey: ["inbox-threads"] }); } });
  const statusMutation = useMutation({ mutationFn: (data: { id: string; status: string }) => apiPut(`/inbox/threads/${data.id}/status`, { status: data.status }), onSuccess: () => { toast.success("状态已更新"); queryClient.invalidateQueries({ queryKey: ["inbox-threads"] }); } });

  const tabs = [
    { key: "all", label: "全部", icon: Mail },
    { key: "new", label: "未读", icon: Mail },
    { key: "hot", label: "热线索🔥", icon: Flame },
    { key: "assigned", label: "已分配", icon: UserCheck },
  ];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-0">
        {/* Thread list */}
        <div className={`${selectedThread ? "w-1/3" : "w-full"} border-r border-gray-200 dark:border-gray-700 overflow-auto`}>
          <div className="p-4 border-b"><h1 className="text-xl font-bold mb-3">收件箱</h1>
            <div className="flex gap-1 flex-wrap">
              {tabs.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"}`}><tab.icon size={12} className="inline mr-1" />{tab.label}</button>)}
            </div>
          </div>
          {isLoading ? <p className="text-center py-12 text-gray-500">加载中...</p> : !data?.data?.length ? <Card className="m-4"><CardContent className="p-12 text-center text-gray-500">暂无邮件，当客户回复时将自动显示</CardContent></Card> : (
            (data.data as any[]).map((thread: any) => (
              <div key={thread.id} onClick={() => setSelectedThread(thread)} className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedThread?.id === thread.id ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-600" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{thread.contact?.firstName} {thread.contact?.lastName || thread.subject}</span>
                  {thread.isHotLead && <Badge variant="destructive" className="text-xs">🔥 热线索</Badge>}
                  {!thread.isHotLead && thread.status === "new" && <Badge variant="success" className="text-xs">新</Badge>}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">{thread.subject}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{thread.contact?.email}</span>
                  <span className="text-xs text-gray-400">{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString("zh-CN") : "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Thread detail */}
        {selectedThread && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selectedThread.subject}</h3>
                <p className="text-xs text-gray-500">{selectedThread.contact?.email} · {selectedThread.contact?.position}</p>
              </div>
              <div className="flex gap-2">
                <select className="text-xs border rounded px-2 py-1" onChange={e => { statusMutation.mutate({ id: selectedThread.id, status: e.target.value }); }}>
                  <option value="">状态</option>
                  <option value="new">新</option><option value="follow_up">跟进中</option><option value="closed_won">已成交</option><option value="closed_lost">无效</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => assignMutation.mutate({ id: selectedThread.id, userId: "self" })}><UserCheck size={14} className="mr-1" />分配给我</Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {threadDetail?.data?.messages?.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.direction === "outbound" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <div className="text-xs mb-1 opacity-70">{msg.direction === "outbound" ? "我" : "客户"} · {new Date(msg.receivedAt || msg.createdAt).toLocaleString("zh-CN")}</div>
                    <div className="text-sm whitespace-pre-wrap">{msg.bodyText || msg.body?.slice(0, 500) || "(HTML邮件)"}</div>
                  </div>
                </div>
              ))}
              {threadDetail?.data?.messages?.length === 0 && <p className="text-center text-gray-500 py-8">暂无消息</p>}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="输入回复内容..." className="flex-1" />
                <Button size="sm" onClick={() => replyMutation.mutate({ id: selectedThread.id, body: replyBody })} disabled={!replyBody || replyMutation.isPending}><Send size={14} className="mr-1" />发送</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
