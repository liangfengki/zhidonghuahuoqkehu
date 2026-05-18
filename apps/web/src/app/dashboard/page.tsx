"use client";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Users, Send, Reply, Flame, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet("/reports/dashboard") as Promise<any>,
  });

  const dashboard = data?.data;
  const today = dashboard?.todayStats || {};

  const cards = [
    { label: "今日采集", value: today.collectedCount || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "今日发送", value: today.sentCount || 0, icon: Send, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "今日回复", value: today.repliedCount || 0, icon: Reply, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "热线索", value: today.hotLeadCount || 0, icon: Flame, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  ];

  const funnel = dashboard?.funnel || {};
  const funnelSteps = [
    { label: "采集", value: funnel.collected || 0 },
    { label: "已验证", value: funnel.verified || 0 },
    { label: "已发送", value: funnel.sent || 0 },
    { label: "已打开", value: funnel.opened || 0 },
    { label: "已回复", value: funnel.replied || 0 },
    { label: "热线索", value: funnel.hotLeads || 0 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">数据看板</h1>

        <div className="grid grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${c.bg}`}><c.icon className={c.color} size={24} /></div>
                <div>
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <p className="text-3xl font-bold">{isLoading ? "-" : c.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>销售漏斗</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const max = Math.max(...funnelSteps.map(s => s.value), 1);
                const pct = Math.round((step.value / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-500">{step.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-mono font-bold">{step.value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp size={18} />最近30天趋势</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.trends?.length ? (
              <div className="flex items-end gap-2 h-40">
                {(dashboard.trends as any[]).map((t: any, i: number) => {
                  const maxSent = Math.max(...(dashboard.trends as any[]).map((x: any) => x.sent || 0), 1);
                  const h = Math.round(((t.sent || 0) / maxSent) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col-reverse" style={{ height: "100px" }}>
                        <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${h}%` }} title={`${t.sent} 发送`} />
                      </div>
                      <span className="text-[10px] text-gray-400 rotate-45 origin-top-left whitespace-nowrap">{t.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-center text-gray-400 py-8">暂无趋势数据（发送邮件后将自动生成）</p>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
