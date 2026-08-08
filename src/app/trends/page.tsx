"use client";

import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from "recharts";

interface Candidate {
  id: string;
  name: string;
  position: string;
  currentStage: string;
  statusNote: string | null;
  recommendedDate: string | null;
  inviteDate: string | null;
  interviewDate: string | null;
  offerDate: string | null;
  acceptDate: string | null;
  onboardDate: string | null;
}

const COLORS = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#06b6d4", "#22c55e", "#8b5cf6"];

export default function TrendsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/candidates")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setCandidates(d.candidates);
      })
      .catch(e => toast.error("获取数据失败: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // ── Weekly conversion rate trend ──
  const weeks: Record<string, {
    recommended: number; invited: number; interviewed: number;
    offersSent: number; offersAccepted: number; onboarded: number;
  }> = {};

  candidates.forEach(c => {
    const add = (dateStr: string | null, field: keyof typeof weeks[string]) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const wk = weekStart.toISOString().split("T")[0];
      if (!weeks[wk]) weeks[wk] = { recommended: 0, invited: 0, interviewed: 0, offersSent: 0, offersAccepted: 0, onboarded: 0 };
      weeks[wk][field]++;
    };
    add(c.recommendedDate, "recommended");
    add(c.inviteDate, "invited");
    add(c.interviewDate, "interviewed");
    add(c.offerDate, "offersSent");
    add(c.acceptDate, "offersAccepted");
    add(c.onboardDate, "onboarded");
  });

  const weeklyTrend = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => {
      const safeRate = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
      return {
        week: week.slice(5),
        "推荐→邀约": safeRate(data.invited, data.recommended),
        "邀约→面试": safeRate(data.interviewed, data.invited),
        "面试→Offer": safeRate(data.offersSent, data.interviewed),
        "Offer→入职": safeRate(data.onboarded, data.offersSent),
      };
    });

  // ── Weekly activity ──
  const weeklyActivity = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week: week.slice(5),
      推荐: data.recommended,
      面试: data.interviewed,
      入职: data.onboarded,
    }));

  // ── Elimination reason distribution ──
  const eliminated = candidates.filter(c => c.currentStage === "已淘汰");
  const reasonCounts: Record<string, number> = {};
  eliminated.forEach(c => {
    const note = (c.statusNote || "").trim();
    let reason = "未知";
    if (note.includes("面试未通过") || note.includes("面试未过")) reason = "面试未通过";
    else if (note.includes("筛选") && (note.includes("拒绝") || note.includes("未通过") || note.includes("淘汰"))) reason = "业务筛选未通过";
    else if (note.includes("放弃") || note.includes("拒绝") || note.includes("无意向") || note.includes("取消")) reason = "候选人放弃";
    else if (note.includes("未参加") || note.includes("联系不上") || note.includes("失联") || note.includes("待定")) reason = "未参加面试";
    else if (note.includes("学历") && note.includes("造假")) reason = "简历造假";
    else if (note) reason = "其他";
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  const eliminationData = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ name: k, value: v }));

  // ── Position conversion comparison ──
  const positionStats: Record<string, { total: number; hired: number; eliminated: number }> = {};
  candidates.forEach(c => {
    if (!positionStats[c.position]) positionStats[c.position] = { total: 0, hired: 0, eliminated: 0 };
    positionStats[c.position].total++;
    if (c.currentStage === "已入职") positionStats[c.position].hired++;
    if (c.currentStage === "已淘汰") positionStats[c.position].eliminated++;
  });

  const positionConversion = Object.entries(positionStats)
    .filter(([, v]) => v.total >= 3)
    .map(([name, v]) => ({
      name,
      转化率: Math.round((v.hired / v.total) * 100),
      淘汰率: Math.round((v.eliminated / v.total) * 100),
    }))
    .sort((a, b) => b["转化率"] - a["转化率"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">趋势分析</h1>
        <p className="text-sm text-muted-foreground mt-1">转化率变化 · 淘汰原因分布 · 岗位对比</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Conversion Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              周转化率趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `${v ?? 0}%`}
                />
                <Legend />
                <Line type="monotone" dataKey="推荐→邀约" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="邀约→面试" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="面试→Offer" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Offer→入职" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              周活动量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend />
                <Bar dataKey="推荐" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="面试" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="入职" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Elimination Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              淘汰原因分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eliminationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                  {eliminationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Position Conversion Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各岗位转化率对比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={positionConversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `${v ?? 0}%`}
                />
                <Legend />
                <Bar dataKey="转化率" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="淘汰率" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
