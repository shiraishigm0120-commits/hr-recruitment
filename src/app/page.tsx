"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle, XCircle, Target, RefreshCw, CalendarDays, UserPlus, Phone, Video, FileText, Bell, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface Stats {
  total: number; hired: number; active: number; eliminated: number;
  conversionRate: string;
  byStage: Record<string, number>;
  byPosition: Record<string, number>;
  byLocation: Record<string, number>;
}

interface Candidate {
  id: string; name: string; position: string; currentStage: string;
  baseLocation: string;
  recommendedDate: string | null; inviteDate: string | null;
  interviewDate: string | null; offerDate: string | null;
  onboardDate: string | null; statusNote: string | null;
}

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#22c55e", "#f97316", "#eab308", "#ef4444"];
const STAGE_COLORS: Record<string, string> = {
  "已入职": "#22c55e", "待入职": "#3b82f6", "Offer": "#06b6d4",
  "已面试待反馈": "#8b5cf6", "邀约面试": "#eab308", "推荐简历": "#f97316", "已淘汰": "#ef4444",
};

function isToday(d: string | null): boolean {
  if (!d) return false;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  return d.startsWith(today);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data.stats);
      setCandidates(data.candidates);
      setLastSynced(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    } catch (e: any) {
      toast.error("获取数据失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const syncFromFeishu = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/candidates/sync");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`已同步 ${data.count} 条候选人数据`);
      await fetchData();
    } catch (e: any) {
      toast.error("飞书同步失败: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Empty state
  if (!stats || stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">还没有招聘数据</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {process.env.NEXT_PUBLIC_FEISHU_MODE === "demo"
            ? "点击下方按钮加载演示数据，体验完整功能"
            : "点击同步按钮，从飞书拉取候选人数据"}
        </p>
        <Button size="lg" onClick={syncFromFeishu} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "同步中..." : "同步飞书数据"}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          或手动导入 CSV 文件
        </p>
      </div>
    );
  }

  // Today's activity
  const todayRec = candidates.filter(c => isToday(c.recommendedDate));
  const todayInv = candidates.filter(c => isToday(c.inviteDate));
  const todayIvw = candidates.filter(c => isToday(c.interviewDate));
  const todayOff = candidates.filter(c => isToday(c.offerDate));
  const todayOnb = candidates.filter(c => isToday(c.onboardDate));

  const funnelData = [
    { name: "已推荐", value: candidates.filter(c => c.recommendedDate).length },
    { name: "已邀约", value: candidates.filter(c => c.inviteDate).length },
    { name: "已面试", value: candidates.filter(c => c.interviewDate).length },
    { name: "发Offer", value: candidates.filter(c => c.offerDate).length },
    { name: "已入职", value: stats.hired },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">招聘仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">
            飞书实时同步
            {lastSynced && <span className="ml-2 opacity-60">· 最后同步 {lastSynced}</span>}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={syncFromFeishu} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "同步中..." : "同步飞书"}
        </Button>
      </div>

      {/* Today Overview */}
      {(todayRec.length > 0 || todayInv.length > 0 || todayIvw.length > 0) && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                今日概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {todayRec.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">推荐</span>
                    <span className="font-bold text-blue-600">{todayRec.length}人</span>
                  </div>
                )}
                {todayInv.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-yellow-500" />
                    <span className="text-muted-foreground">邀约</span>
                    <span className="font-bold text-yellow-600">{todayInv.length}人</span>
                  </div>
                )}
                {todayIvw.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">面试</span>
                    <span className="font-bold text-purple-600">{todayIvw.length}人</span>
                  </div>
                )}
                {todayOff.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    <span className="text-muted-foreground">Offer</span>
                    <span className="font-bold text-cyan-600">{todayOff.length}人</span>
                  </div>
                )}
                {todayOnb.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">入职</span>
                    <span className="font-bold text-green-600">{todayOnb.length}人</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 待办事项 */}
      {(() => {
        const needFeedback = candidates.filter(c => c.currentStage === "已面试待反馈");
        const needOffer = candidates.filter(c => c.currentStage === "Offer");
        const needFollow = candidates.filter(c => c.currentStage === "推荐简历" || c.currentStage === "邀约面试");
        const totalTodos = needFeedback.length + needOffer.length + needFollow.length;
        if (totalTodos === 0) return null;
        return (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  待办事项
                  <span className="text-xs font-normal text-muted-foreground">共 {totalTodos} 项</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {needFeedback.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-muted-foreground">待反馈</span>
                      <span className="font-bold text-purple-600">{needFeedback.length}人</span>
                    </div>
                  )}
                  {needOffer.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-cyan-500" />
                      <span className="text-muted-foreground">待发Offer</span>
                      <span className="font-bold text-cyan-600">{needOffer.length}人</span>
                    </div>
                  )}
                  {needFollow.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-amber-500" />
                      <span className="text-muted-foreground">待跟进</span>
                      <span className="font-bold text-amber-600">{needFollow.length}人</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: Users, label: "候选人总数", value: stats.total, color: "primary" },
          { icon: CheckCircle, label: "已入职", value: stats.hired, color: "green", sub: `转化率 ${stats.conversionRate}%` },
          { icon: Target, label: "流程中", value: stats.active, color: "blue" },
          { icon: XCircle, label: "已淘汰", value: stats.eliminated, color: "red", sub: `占比 ${((stats.eliminated / stats.total) * 100).toFixed(1)}%` },
          { icon: TrendingUp, label: "覆盖城市", value: Object.keys(stats.byLocation).length, color: "default", sub: Object.keys(stats.byLocation).join(" · ") },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${item.color !== "default" ? `border-l-4 border-l-${item.color}-500` : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <item.icon className={`w-4 h-4 ${item.color !== "default" ? `text-${item.color}-500` : ""}`} />
                  {item.label}
                </div>
                <div className={`text-2xl font-bold ${item.color !== "default" ? `text-${item.color}-600` : ""}`}>
                  {item.value}
                </div>
                {item.sub && <div className="text-xs text-muted-foreground">{item.sub}</div>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">📊 岗位分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={Object.entries(stats.byPosition).map(([k, v]) => ({ name: k, value: v }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {Object.entries(stats.byPosition).map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">📍 城市分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={Object.entries(stats.byLocation).map(([k, v]) => ({ name: k, value: v }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                  {Object.entries(stats.byLocation).map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">🔄 阶段分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={Object.entries(stats.byStage).map(([k, v]) => ({ name: k, value: v }))} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                  {Object.entries(stats.byStage).map(([k], i) => (<Cell key={i} fill={STAGE_COLORS[k] || COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">🔽 招聘漏斗</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                  {funnelData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
