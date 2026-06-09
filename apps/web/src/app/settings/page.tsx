"use client";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor, DEFAULT_TEMPLATE_HTML } from "@/components/ui/rich-text-editor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import {
  Key, Mailbox, Users, ShieldBan, Trash2, Plus,
  Mail, User, LayoutDashboard, Settings, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  EMAIL_PROVIDER_OPTIONS,
  EMAIL_PROVIDER_PRESETS,
  EMAIL_DOMAIN_PRESET_MAP,
} from "@b2b-lead-gen/shared";

type SettingsTab = "collect" | "my-email" | "team" | "blacklist" | "advanced";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>("collect");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showAdvancedEmail, setShowAdvancedEmail] = useState(false);

  // Forms
  const [apiForm, setApiForm] = useState({ provider: "apollo", apiKey: "", dailyLimit: 300 });
  const [channelForm, setChannelForm] = useState({ provider: "resend", apiKey: "", dailyQuota: 100 });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "sales" });
  const [blacklistForm, setBlacklistForm] = useState({ type: "email", value: "", reason: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: DEFAULT_TEMPLATE_HTML });
  const [emailAccountForm, setEmailAccountForm] = useState({
    provider: "auto",
    email: "",
    password: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: true,
    imapHost: "",
    imapPort: 993,
    imapUser: "",
    imapPass: "",
    imapTls: true,
    dailyLimit: 500,
  });
  const [collectForm, setCollectForm] = useState({
    industry: "",
    country: "",
    keywords: "",
    sources: ["apollo", "hunter", "web-scraper"] as string[],
    note: "",
  });

  // Queries
  const { data: integrations } = useQuery<any[]>({ queryKey: ["integrations"], queryFn: () => apiGet("/settings/integrations") });
  const { data: channels } = useQuery<any[]>({ queryKey: ["send-channels"], queryFn: () => apiGet("/settings/send-channels") });
  const { data: users } = useQuery<any[]>({ queryKey: ["users"], queryFn: () => apiGet("/settings/users") });
  const { data: blacklist } = useQuery<any>({ queryKey: ["blacklist"], queryFn: () => apiGet("/settings/blacklist") });
  const { data: templates } = useQuery<any[]>({ queryKey: ["templates-settings"], queryFn: () => apiGet("/templates") });
  const { data: emailAccounts } = useQuery<any[]>({ queryKey: ["email-accounts"], queryFn: () => apiGet("/settings/email-accounts") });
  const { data: collectDefaults } = useQuery<Record<string, any>>({ queryKey: ["collect-defaults"], queryFn: () => apiGet("/settings/collect-defaults") });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["integrations"] });
    queryClient.invalidateQueries({ queryKey: ["send-channels"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["blacklist"] });
    queryClient.invalidateQueries({ queryKey: ["templates-settings"] });
    queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["collect-defaults"] });
  };

  // Mutations
  const addApiKey = useMutation({ mutationFn: (d: any) => apiPost("/settings/integrations", d), onSuccess: () => { toast.success("API Key 已保存"); setApiForm({ provider: "apollo", apiKey: "", dailyLimit: 300 }); refetchAll(); }, onError: (e: any) => toast.error(e.message) });
  const deleteChannel = useMutation({ mutationFn: (id: string) => apiDelete("/settings/send-channels/" + id), onSuccess: () => { toast.success("已删除"); refetchAll(); } });
  const addBlacklist = useMutation({ mutationFn: (d: any) => apiPost("/settings/blacklist", d), onSuccess: () => { toast.success("已添加"); setBlacklistForm({ type: "email", value: "", reason: "" }); refetchAll(); } });
  const removeBlacklist = useMutation({ mutationFn: (id: string) => apiDelete("/settings/blacklist/" + id), onSuccess: () => { toast.success("已移除"); refetchAll(); } });
  const addUser = useMutation({ mutationFn: (d: any) => apiPost("/settings/users", d), onSuccess: () => { toast.success("用户已创建"); setUserForm({ name: "", email: "", password: "", role: "sales" }); refetchAll(); }, onError: (e: any) => toast.error(e.message) });
  const deleteUser = useMutation({ mutationFn: (id: string) => apiDelete("/settings/users/" + id), onSuccess: () => { toast.success("已删除"); refetchAll(); } });
  const addTemplate = useMutation({ mutationFn: (d: any) => apiPost("/templates", d), onSuccess: () => { toast.success("模板已创建"); setTemplateForm({ name: "", subject: "", body: DEFAULT_TEMPLATE_HTML }); refetchAll(); }, onError: (e: any) => toast.error(e.message) });
  const deleteTemplate = useMutation({ mutationFn: (id: string) => apiDelete("/templates/" + id), onSuccess: () => { toast.success("已删除"); refetchAll(); } });

  const upsertCollectDefaults = useMutation({
    mutationFn: (d: Record<string, any>) => apiPut("/settings/collect-defaults", d),
    onSuccess: () => toast.success("已自动保存"),
    onError: (e: any) => toast.error(e.message),
  });

  const addEmailAccount = useMutation({
    mutationFn: () => {
      const presetDomain = emailAccountForm.email.split("@")[1]?.toLowerCase() || "";
      const presetKey = (emailAccountForm.provider !== "auto" && emailAccountForm.provider !== "custom"
        ? emailAccountForm.provider
        : EMAIL_DOMAIN_PRESET_MAP[presetDomain]) as keyof typeof EMAIL_PROVIDER_PRESETS | undefined;
      const preset = presetKey ? EMAIL_PROVIDER_PRESETS[presetKey] : undefined;
      const provider = emailAccountForm.provider !== "auto"
        ? emailAccountForm.provider
        : presetKey || "custom";

      const payload: Record<string, any> = {
        email: emailAccountForm.email,
        password: emailAccountForm.password,
        provider,
        dailyLimit: emailAccountForm.dailyLimit,
      };

      if (showAdvancedEmail || !preset) {
        payload.smtpConfig = {
          host: emailAccountForm.smtpHost || preset?.smtp.host || "",
          port: emailAccountForm.smtpPort || preset?.smtp.port || 587,
          user: emailAccountForm.smtpUser || emailAccountForm.email,
          password: emailAccountForm.smtpPass || emailAccountForm.password,
          secure: emailAccountForm.smtpSecure ?? preset?.smtp.secure ?? false,
        };
        payload.imapConfig = {
          host: emailAccountForm.imapHost || preset?.imap.host || "",
          port: emailAccountForm.imapPort || preset?.imap.port || 993,
          user: emailAccountForm.imapUser || emailAccountForm.email,
          password: emailAccountForm.imapPass || emailAccountForm.password,
          tls: emailAccountForm.imapTls ?? preset?.imap.tls ?? true,
        };
      }

      return apiPost("/settings/email-accounts", payload);
    },
    onSuccess: () => {
      toast.success("邮箱账号已添加");
      setEmailAccountForm({
        provider: "auto",
        email: "",
        password: "",
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
        smtpSecure: true,
        imapHost: "",
        imapPort: 993,
        imapUser: "",
        imapPass: "",
        imapTls: true,
        dailyLimit: 500,
      });
      setShowAdvancedEmail(false);
      refetchAll();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteEmailAccount = useMutation({
    mutationFn: (id: string) => apiDelete("/settings/email-accounts/" + id),
    onSuccess: () => { toast.success("已删除"); refetchAll(); },
  });

  useEffect(() => {
    if (collectDefaults && typeof collectDefaults === "object") {
      const d = collectDefaults as Record<string, any>;
      setCollectForm({
        industry: d.industry || "",
        country: d.country || "",
        keywords: d.keywords || "",
        sources: Array.isArray(d.sources) ? d.sources : ["apollo", "hunter", "web-scraper"],
        note: d.note || "",
      });
    }
  }, [collectDefaults]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectFormRef = useRef(collectForm);
  collectFormRef.current = collectForm;

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const hasContent = Object.values(collectFormRef.current).some((v) =>
        Array.isArray(v) ? v.length > 0 : Boolean(v),
      );
      if (hasContent) {
        upsertCollectDefaults.mutate(collectFormRef.current);
      }
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [collectForm.industry, collectForm.country, collectForm.keywords, collectForm.sources, collectForm.note]);

  const tabs: { key: SettingsTab; label: string; icon: typeof Key }[] = [
    { key: "collect", label: "采集配置", icon: LayoutDashboard },
    { key: "my-email", label: "我的邮箱", icon: Mail },
    { key: "team", label: "团队", icon: Users },
    { key: "blacklist", label: "黑名单", icon: ShieldBan },
    { key: "advanced", label: "高级设置", icon: Settings },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">系统设置</h1>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] w-fit flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-[var(--color-surface)] text-[var(--color-fg)] shadow-sm border border-[var(--color-glass-border)]"
                  : "text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
              }`}
            >
              <t.icon size={16} />{t.label}
            </button>
          ))}
        </div>

        {/* Tab: 采集配置 */}
        {activeTab === "collect" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">采集默认配置</CardTitle>
                <p className="text-xs text-[var(--color-muted-fg)]">设置一次即可，后续采集自动使用这些配置</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">目标行业</label>
                    <Input
                      value={collectForm.industry}
                      onChange={(e) => setCollectForm({ ...collectForm, industry: e.target.value })}
                      placeholder="如：SaaS、制造业、跨境电商"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">目标国家/地区</label>
                    <Input
                      value={collectForm.country}
                      onChange={(e) => setCollectForm({ ...collectForm, country: e.target.value })}
                      placeholder="如：美国、欧洲、东南亚"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">关键词</label>
                  <textarea
                    value={collectForm.keywords}
                    onChange={(e) => setCollectForm({ ...collectForm, keywords: e.target.value })}
                    placeholder="每行一个关键词，用于搜索潜在客户"
                    className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-4 py-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">数据来源</label>
                  <div className="flex gap-4 mt-2">
                    {[
                      { value: "apollo", label: "Apollo.io" },
                      { value: "hunter", label: "Hunter.io" },
                      { value: "web-scraper", label: "Web Scraper" },
                    ].map((src) => (
                      <label key={src.value} className="flex items-center gap-2 text-sm text-[var(--color-fg)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={collectForm.sources.includes(src.value)}
                          onChange={(e) => {
                            setCollectForm({
                              ...collectForm,
                              sources: e.target.checked
                                ? [...collectForm.sources, src.value]
                                : collectForm.sources.filter((s) => s !== src.value),
                            });
                          }}
                          className="rounded border-[var(--color-glass-border)]"
                        />
                        {src.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">备注</label>
                  <textarea
                    value={collectForm.note}
                    onChange={(e) => setCollectForm({ ...collectForm, note: e.target.value })}
                    placeholder="采集备注信息（可选）"
                    className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-4 py-3 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => upsertCollectDefaults.mutate(collectForm)} disabled={upsertCollectDefaults.isPending}>
                    保存配置
                  </Button>
                  <span className="text-xs text-[var(--color-muted-fg)]">修改后自动保存，也可手动点击保存</span>
                </div>
              </CardContent>
            </Card>

            {/* 邮件模板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">邮件模板</CardTitle>
                <p className="text-xs text-[var(--color-muted-fg)]">使用富文本编辑器编写邮件模板，支持插入变量</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">模板名称</label>
                    <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="开发信模板A" className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-[var(--color-fg)]">邮件主题</label>
                    <Input value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="Exploring partnership with {{companyName}}" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-fg)]">邮件正文</label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={templateForm.body}
                      onChange={(html) => setTemplateForm({ ...templateForm, body: html })}
                    />
                  </div>
                </div>
                <Button onClick={() => addTemplate.mutate({ name: templateForm.name, subject: templateForm.subject, body: templateForm.body })} disabled={addTemplate.isPending || !templateForm.name || !templateForm.subject}>
                  <Plus size={16} className="mr-1" />创建模板
                </Button>

                {templates && templates.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {templates.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-fg)]">{t.name}</p>
                          <p className="text-xs text-[var(--color-muted-fg)]">{t.subject}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 size={14} className="text-[var(--color-muted-fg)]" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: 高级设置 */}
        {activeTab === "advanced" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <button
                  type="button"
                  className="flex items-center justify-between w-full"
                  onClick={() => setShowApiKeys((v) => !v)}
                >
                  <CardTitle className="text-base">数据源 API Keys</CardTitle>
                  {showApiKeys ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </CardHeader>
              {showApiKeys && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div><label className="text-xs font-medium text-[var(--color-fg)]">平台</label>
                      <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40" value={apiForm.provider} onChange={(e) => setApiForm({ ...apiForm, provider: e.target.value })}>
                        <option value="apollo">Apollo.io</option>
                        <option value="hunter">Hunter.io</option>
                      </select>
                    </div>
                    <div className="md:col-span-2"><label className="text-xs font-medium text-[var(--color-fg)]">API Key</label><Input type="password" value={apiForm.apiKey} onChange={(e) => setApiForm({ ...apiForm, apiKey: e.target.value })} placeholder="sk-..." className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-[var(--color-fg)]">日限额</label><Input type="number" value={apiForm.dailyLimit} onChange={(e) => setApiForm({ ...apiForm, dailyLimit: Number(e.target.value) })} className="mt-1" /></div>
                  </div>
                  <Button onClick={() => addApiKey.mutate(apiForm)} disabled={addApiKey.isPending || !apiForm.apiKey}>
                    <Plus size={16} className="mr-1" />添加 Key
                  </Button>

                  {integrations && integrations.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {integrations.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{item.provider}</Badge>
                            <span className="text-xs text-[var(--color-muted-fg)]">{item.apiKey ? "****" + item.apiKey.slice(-4) : ""}</span>
                          </div>
                          <Badge variant="outline">{item.dailyLimit || "-"} 次/日</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <button
                  type="button"
                  className="flex items-center justify-between w-full"
                  onClick={() => setShowChannels((v) => !v)}
                >
                  <CardTitle className="text-base">发送渠道配置</CardTitle>
                  {showChannels ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </CardHeader>
              {showChannels && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div><label className="text-xs font-medium text-[var(--color-fg)]">平台</label>
                      <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40" value={channelForm.provider} onChange={(e) => setChannelForm({ ...channelForm, provider: e.target.value })}>
                        <option value="resend">Resend</option>
                        <option value="brevo">Brevo</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="mailjet">Mailjet</option>
                        <option value="smtp">SMTP</option>
                      </select>
                    </div>
                    <div className="md:col-span-2"><label className="text-xs font-medium text-[var(--color-fg)]">API Key</label><Input type="password" value={channelForm.apiKey} onChange={(e) => setChannelForm({ ...channelForm, apiKey: e.target.value })} className="mt-1" /></div>
                    <div><label className="text-xs font-medium text-[var(--color-fg)]">日配额</label><Input type="number" value={channelForm.dailyQuota} onChange={(e) => setChannelForm({ ...channelForm, dailyQuota: Number(e.target.value) })} className="mt-1" /></div>
                  </div>
                  <Button onClick={() => toast.success("渠道已添加（开发中）")}><Plus size={16} className="mr-1" />添加渠道</Button>

                  {channels && channels.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {channels.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{c.provider}</Badge>
                            <span className="text-xs text-[var(--color-muted-fg)]">配额 {c.dailyQuota || 0}/日</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteChannel.mutate(c.id)}><Trash2 size={14} className="text-[var(--color-muted-fg)]" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Tab: My Email */}
        {activeTab === "my-email" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">添加邮箱账号</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">邮箱类型</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
                      value={emailAccountForm.provider}
                      onChange={(e) => setEmailAccountForm({ ...emailAccountForm, provider: e.target.value })}
                    >
                      {EMAIL_PROVIDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">邮箱地址</label>
                    <Input type="email" value={emailAccountForm.email} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, email: e.target.value })} placeholder="you@company.com" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-fg)]">密码 / 授权码</label>
                    <Input type="password" value={emailAccountForm.password} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, password: e.target.value })} placeholder="Gmail 需要应用专用密码" className="mt-1" />
                  </div>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
                  onClick={() => setShowAdvancedEmail((v) => !v)}
                >
                  {showAdvancedEmail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  高级配置（SMTP / IMAP）
                </button>

                {showAdvancedEmail && (
                  <div className="space-y-4 rounded-xl border border-dashed border-[var(--color-glass-border)] p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-[var(--color-fg)]">每日发送上限</label>
                        <Input type="number" value={emailAccountForm.dailyLimit} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, dailyLimit: Number(e.target.value) })} className="mt-1" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] space-y-3">
                      <p className="text-xs font-medium text-[var(--color-fg)]">SMTP 发送配置</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2"><label className="text-xs text-[var(--color-muted-fg)]">服务器</label><Input value={emailAccountForm.smtpHost} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtpHost: e.target.value })} placeholder="smtp.gmail.com" className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">端口</label><Input type="number" value={emailAccountForm.smtpPort} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtpPort: Number(e.target.value) })} className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">SSL</label>
                          <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm" value={emailAccountForm.smtpSecure ? "true" : "false"} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtpSecure: e.target.value === "true" })}>
                            <option value="true">是</option><option value="false">否</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="text-xs text-[var(--color-muted-fg)]">用户名</label><Input value={emailAccountForm.smtpUser} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtpUser: e.target.value })} placeholder="通常为邮箱地址" className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">密码</label><Input type="password" value={emailAccountForm.smtpPass} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, smtpPass: e.target.value })} className="mt-1" /></div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)] space-y-3">
                      <p className="text-xs font-medium text-[var(--color-fg)]">IMAP 收信配置（用于接收回复）</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2"><label className="text-xs text-[var(--color-muted-fg)]">服务器</label><Input value={emailAccountForm.imapHost} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, imapHost: e.target.value })} placeholder="imap.gmail.com" className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">端口</label><Input type="number" value={emailAccountForm.imapPort} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, imapPort: Number(e.target.value) })} className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">TLS</label>
                          <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm" value={emailAccountForm.imapTls ? "true" : "false"} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, imapTls: e.target.value === "true" })}>
                            <option value="true">是</option><option value="false">否</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="text-xs text-[var(--color-muted-fg)]">用户名</label><Input value={emailAccountForm.imapUser} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, imapUser: e.target.value })} placeholder="通常为邮箱地址" className="mt-1" /></div>
                        <div><label className="text-xs text-[var(--color-muted-fg)]">密码</label><Input type="password" value={emailAccountForm.imapPass} onChange={(e) => setEmailAccountForm({ ...emailAccountForm, imapPass: e.target.value })} className="mt-1" /></div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => addEmailAccount.mutate()}
                  disabled={addEmailAccount.isPending || !emailAccountForm.email || !emailAccountForm.password}
                >
                  <Plus size={16} className="mr-1" />添加邮箱
                </Button>
              </CardContent>
            </Card>

            {emailAccounts && emailAccounts.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">已配置邮箱</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {emailAccounts.map((acc: any) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center">
                            <Mail size={14} className="text-[var(--color-accent)]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-fg)]">{acc.email}</p>
                            <p className="text-xs text-[var(--color-muted-fg)]">
                              今日已发 {acc.dailySent || 0} / {acc.dailyLimit || 500}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={acc.status === "active" ? "success" : "secondary"}>
                            {acc.status === "active" ? "活跃" : acc.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => deleteEmailAccount.mutate(acc.id)}>
                            <Trash2 size={14} className="text-[var(--color-muted-fg)]" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Team */}
        {activeTab === "team" && (
          <Card>
            <CardHeader><CardTitle className="text-base">团队成员</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div><label className="text-xs font-medium text-[var(--color-fg)]">姓名</label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">邮箱</label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">密码</label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">角色</label>
                  <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="sales">销售</option><option value="admin">管理员</option>
                  </select>
                </div>
                <Button onClick={() => addUser.mutate(userForm)} disabled={addUser.isPending || !userForm.name || !userForm.email || !userForm.password} className="self-end"><Plus size={16} className="mr-1" />添加</Button>
              </div>

              {users && users.length > 0 && (
                <div className="space-y-2 mt-4">
                  {users.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center"><User size={14} className="text-[var(--color-accent)]" /></div>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-fg)]">{u.name}</p>
                          <p className="text-xs text-[var(--color-muted-fg)]">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{u.role}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => deleteUser.mutate(u.id)}><Trash2 size={14} className="text-[var(--color-muted-fg)]" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Blacklist */}
        {activeTab === "blacklist" && (
          <Card>
            <CardHeader><CardTitle className="text-base">黑名单</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div><label className="text-xs font-medium text-[var(--color-fg)]">类型</label>
                  <select className="mt-1 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-[var(--color-fg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40" value={blacklistForm.type} onChange={(e) => setBlacklistForm({ ...blacklistForm, type: e.target.value })}>
                    <option value="email">邮箱</option><option value="domain">域名</option>
                  </select>
                </div>
                <div className="md:col-span-2"><label className="text-xs font-medium text-[var(--color-fg)]">值</label><Input value={blacklistForm.value} onChange={(e) => setBlacklistForm({ ...blacklistForm, value: e.target.value })} placeholder="spam@example.com" className="mt-1" /></div>
                <div><label className="text-xs font-medium text-[var(--color-fg)]">原因（可选）</label><Input value={blacklistForm.reason} onChange={(e) => setBlacklistForm({ ...blacklistForm, reason: e.target.value })} className="mt-1" /></div>
                <Button onClick={() => addBlacklist.mutate(blacklistForm)} disabled={!blacklistForm.value} className="self-end"><Plus size={16} className="mr-1" />添加</Button>
              </div>

              {blacklist && (blacklist as any).data?.length > 0 && (
                <div className="space-y-2 mt-4">
                  {(blacklist as any).data.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-subtle)] border border-[var(--color-glass-border)]">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">{item.type}</Badge>
                        <span className="text-sm font-mono text-[var(--color-fg)]">{item.value}</span>
                        {item.reason && <span className="text-xs text-[var(--color-muted-fg)]">- {item.reason}</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeBlacklist.mutate(item.id)}><Trash2 size={14} className="text-[var(--color-muted-fg)]" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
