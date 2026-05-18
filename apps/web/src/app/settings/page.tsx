"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import { Key, Mailbox, Shield, Gauge, Users } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("integrations");
  const [apiForm, setApiForm] = useState({ provider: "apollo", apiKey: "", dailyLimit: 300 });
  const [blacklistForm, setBlacklistForm] = useState({ type: "email", value: "", reason: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "sales" });

  const { data: integrationsData } = useQuery({ queryKey: ["integrations"], queryFn: () => apiGet("/settings/integrations") as Promise<any> });
  const { data: emailAccountsData } = useQuery({ queryKey: ["email-accounts"], queryFn: () => apiGet("/settings/email-accounts") as Promise<any> });
  const { data: blacklistData } = useQuery({ queryKey: ["blacklist"], queryFn: () => apiGet("/settings/blacklist") as Promise<any> });
  const { data: usersData } = useQuery({ queryKey: ["users"], queryFn: () => apiGet("/settings/users") as Promise<any> });
  const { data: sendChannelsData } = useQuery({ queryKey: ["send-channels"], queryFn: () => apiGet("/settings/send-channels") as Promise<any> });

  const { data: templatesData2 } = useQuery({ queryKey: ["templates-settings"], queryFn: () => apiGet("/templates") as Promise<any> });
  const templatesList = (templatesData2 as any)?.data || [];

  const refetchAll = () => { queryClient.invalidateQueries({ queryKey: ["integrations"] }); queryClient.invalidateQueries({ queryKey: ["send-channels"] }); queryClient.invalidateQueries({ queryKey: ["blacklist"] }); queryClient.invalidateQueries({ queryKey: ["email-accounts"] }); queryClient.invalidateQueries({ queryKey: ["users"] }); queryClient.invalidateQueries({ queryKey: ["templates-settings"] }); };

  const addApiKey = useMutation({ mutationFn: (d: any) => apiPost("/settings/integrations", d), onSuccess: () => { toast.success("API Key 已保存"); setApiForm({ provider:"apollo", apiKey:"", dailyLimit:300 }); refetchAll(); } });
  const deleteChannel = useMutation({ mutationFn: (id: string) => apiDelete(`/settings/send-channels/${id}`), onSuccess: () => { toast.success("已删除"); refetchAll(); } });
  const addBlacklist = useMutation({ mutationFn: (d: any) => apiPost("/settings/blacklist", d), onSuccess: () => { toast.success("已添加黑名单"); setBlacklistForm({ type:"email", value:"", reason:"" }); refetchAll(); } });
  const removeBlacklist = useMutation({ mutationFn: (id: string) => apiDelete(`/settings/blacklist/${id}`), onSuccess: () => { toast.success("已移除"); refetchAll(); } });
  const addTemplate = useMutation({ mutationFn: (d: any) => apiPost("/templates", d), onSuccess: () => { toast.success("模板已创建"); setTemplateForm({ name:"", subject:"", body:"" }); refetchAll(); } });
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "" });

  const tabs = [
    { key: "integrations", label: "API集成", icon: Key },
    { key: "email-accounts", label: "发件账户", icon: Mailbox },
    { key: "send-channels", label: "发送通道", icon: Gauge },
    { key: "blacklist", label: "黑名单", icon: Shield },
    { key: "users", label: "团队", icon: Users },
    { key: "templates", label: "邮件模板", icon: Mailbox },
  ];

  const providers = ["apollo", "hunter", "brevo", "resend", "mailgun", "mailjet"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">系统设置</h1>
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"}`}><tab.icon size={14} />{tab.label}</button>)}
        </div>

        {activeTab === "integrations" && (
          <Card>
            <CardHeader><CardTitle>第三方 API 集成</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-3 items-end" onSubmit={e => { e.preventDefault(); addApiKey.mutate(apiForm); }}>
                <div><label className="text-xs font-medium">平台</label>
                  <select value={apiForm.provider} onChange={e => setApiForm({...apiForm, provider: e.target.value})} className="h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 text-sm">
                    {providers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1"><label className="text-xs font-medium">API Key</label><Input type="password" value={apiForm.apiKey} onChange={e => setApiForm({...apiForm, apiKey: e.target.value})} placeholder="输入API Key..." required /></div>
                <div><label className="text-xs font-medium">日限额</label><Input type="number" value={apiForm.dailyLimit} onChange={e => setApiForm({...apiForm, dailyLimit: Number(e.target.value)})} className="w-24" /></div>
                <Button type="submit" disabled={addApiKey.isPending}>保存</Button>
              </form>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="text-left px-4 py-2">平台</th><th className="text-left px-4 py-2">日限额</th><th className="text-left px-4 py-2">今日已用</th><th className="text-left px-4 py-2">状态</th></tr></thead>
                  <tbody>
                    {(integrationsData?.data || []).map((ch: any) => (
                      <tr key={ch.id} className="border-t"><td className="px-4 py-2 font-medium">{ch.provider}</td><td className="px-4 py-2 font-mono">{ch.dailyLimit}</td><td className="px-4 py-2 font-mono">{ch.dailySent || 0}</td><td className="px-4 py-2"><Badge variant={ch.status === "active" ? "success" : "secondary"}>{ch.status}</Badge></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "email-accounts" && (
          <Card>
            <CardHeader><CardTitle>发件邮箱账户</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">配置用于发送和接收邮件的邮箱。需提供 SMTP/IMAP 凭证。</p>
              <div className="space-y-3">
                {(emailAccountsData?.data || []).map((acc: any) => (
                  <div key={acc.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div><div className="font-medium">{acc.email}</div><div className="text-xs text-gray-500">日限额：{acc.dailyLimit} 封 · 今日已发：{acc.dailySent || 0}</div></div>
                    <Badge variant={acc.status === "active" ? "success" : "secondary"}>{acc.status}</Badge>
                  </div>
                ))}
                {(!emailAccountsData?.data || emailAccountsData.data.length === 0) && <p className="text-center text-gray-400 py-4">暂无发件账户，请通过 API 添加</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "send-channels" && (
          <Card>
            <CardHeader><CardTitle>发送通道配额</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="text-left px-4 py-2">通道</th><th className="text-left px-4 py-2">日限额</th><th className="text-left px-4 py-2">今日已用</th><th className="text-left px-4 py-2">剩余</th><th className="text-left px-4 py-2">操作</th></tr></thead>
                  <tbody>
                    {(sendChannelsData?.data || []).map((ch: any) => (
                      <tr key={ch.id} className="border-t"><td className="px-4 py-2 font-medium">{ch.provider}</td><td className="px-4 py-2 font-mono">{ch.dailyLimit}</td><td className="px-4 py-2 font-mono">{ch.dailySent || 0}</td><td className="px-4 py-2"><div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-24"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, ((ch.dailySent || 0) / ch.dailyLimit) * 100)}%` }} /></div></td><td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => deleteChannel.mutate(ch.id)}>删除</Button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "blacklist" && (
          <Card>
            <CardHeader><CardTitle>黑名单管理</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-3 items-end" onSubmit={e => { e.preventDefault(); addBlacklist.mutate(blacklistForm); }}>
                <div><label className="text-xs font-medium">类型</label><select value={blacklistForm.type} onChange={e => setBlacklistForm({...blacklistForm, type: e.target.value})} className="h-10 rounded-md border px-3 text-sm"><option value="email">邮箱</option><option value="domain">域名</option></select></div>
                <div className="flex-1"><label className="text-xs font-medium">{blacklistForm.type === "email" ? "邮箱" : "域名"}</label><Input value={blacklistForm.value} onChange={e => setBlacklistForm({...blacklistForm, value: e.target.value})} required /></div>
                <div className="flex-1"><label className="text-xs font-medium">原因</label><Input value={blacklistForm.reason} onChange={e => setBlacklistForm({...blacklistForm, reason: e.target.value})} placeholder="退信/投诉等" /></div>
                <Button type="submit">添加</Button>
              </form>
              <div className="space-y-2">
                {(blacklistData?.data || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div><Badge variant={item.type === "domain" ? "warning" : "secondary"} className="mr-2">{item.type === "domain" ? "域名" : "邮箱"}</Badge><span className="font-mono text-sm">{item.value}</span>{item.reason && <span className="text-xs text-gray-400 ml-2">({item.reason})</span>}</div>
                    <Button variant="ghost" size="sm" onClick={() => removeBlacklist.mutate(item.id)}>移除</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader><CardTitle>团队成员</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(usersData?.data || []).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div><div className="font-medium text-sm">{u.name} ({u.email})</div><div className="text-xs text-gray-500">角色：{u.role}</div></div>
                    <Badge variant={u.role === "admin" ? "destructive" : u.role === "manager" ? "warning" : "secondary"}>{u.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "templates" && (
          <Card>
            <CardHeader><CardTitle>邮件模板</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); addTemplate.mutate(templateForm); }}>
                <div><label className="text-xs font-medium">模板名称</label><Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="如：开发信 - 电子产品" required /></div>
                <div><label className="text-xs font-medium">邮件主题 (支持 {'{{变量}}'})</label><Input value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} placeholder="Cooperation Inquiry - {'{{companyName}}'}" required /></div>
                <div><label className="text-xs font-medium">正文 (HTML, 支持 {'{{变量}}'})</label><textarea value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} placeholder="<p>Dear {'{{firstName}}'}, ...</p>" required className="w-full h-32 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" /></div>
                <Button type="submit" disabled={addTemplate.isPending}>创建模板</Button>
              </form>
              <div className="space-y-2">
                {templatesList.map((t: any) => (
                  <div key={t.id} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-1">主题：{t.subject}</div>
                    <div className="text-xs text-gray-400 mt-1">变量：{Array.isArray(t.variables) ? t.variables.join(", ") : "-"} · 语言：{t.language}</div>
                  </div>
                ))}
                {templatesList.length === 0 && <p className="text-center text-gray-400 py-4">暂无模板，使用上方表单创建</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

// Append template management after blacklist tab
// Actually, let me add a "templates" tab to settings
