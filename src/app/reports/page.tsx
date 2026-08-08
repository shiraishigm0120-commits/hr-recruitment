"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Send, Calendar, Loader2, RefreshCw, Eye, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelRecord {
  id: string; date: string;
  recommended: number; invited: number; interviewed: number;
  offersSent: number; offersAccepted: number; onboarded: number;
  eliminated: number; dailyReport: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<FunnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [writingBack, setWritingBack] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string[]>([]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  useEffect(() => {
    // Load reports
    fetch("/api/reports")
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(e => toast.error("获取报告失败"))
      .finally(() => setLoading(false));

    // Load candidates to determine date range
    fetch("/api/candidates")
      .then(r => r.json())
      .then(d => {
        const cands: any[] = d.candidates || [];
        const dates = new Set<string>();
        cands.forEach(c => {
          ["recommendedDate", "inviteDate", "interviewDate", "offerDate", "onboardDate"].forEach(f => {
            if (c[f]) dates.add(c[f].slice(0, 10));
          });
        });
        // Only include dates that have actual activity
        const sorted = [...dates].filter(d => d <= today).sort();
        setDateRange(sorted);
      })
      .catch(() => setDateRange([today]));
  }, []);

  const generateReport = async (date: string) => {
    setGenerating(date);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, writeToFeishu: false }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReports(prev => {
        const idx = prev.findIndex(r => r.date.startsWith(date));
        if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, dailyReport: data.dailyReport } : r);
        return [{ id: date, date: date + "T00:00:00.000Z", dailyReport: data.dailyReport, recommended: 0, invited: 0, interviewed: 0, offersSent: 0, offersAccepted: 0, onboarded: 0, eliminated: 0 }, ...prev];
      });
      setPreviewing(data.dailyReport);
      toast.success("日报生成成功");
    } catch (e: any) {
      toast.error("生成失败: " + e.message);
    } finally {
      setGenerating(null);
    }
  };

  const writeToFeishu = async (date: string) => {
    setWritingBack(date);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, writeToFeishu: true }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("已写回飞书");
    } catch (e: any) {
      toast.error("写回失败: " + e.message);
    } finally {
      setWritingBack(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">每日招聘总结</h1>
          <p className="text-sm text-muted-foreground mt-1">
            基于看板数据自动生成 · {dateRange.length} 天
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {[...dateRange].reverse().map((date, i) => {
          const existing = reports.find(r => r.date.startsWith(date));
          const hasReport = existing?.dailyReport && existing.dailyReport.length > 10;
          const isToday = date === today;
          const isGenerating = generating === date;
          const isWriting = writingBack === date;

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
            >
              <Card className={cn(
                hasReport && "border-green-200 dark:border-green-900",
                isToday && "ring-1 ring-primary/30"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Calendar className={cn("w-4 h-4", isToday ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("font-medium", isToday && "text-primary")}>
                        {date}
                        {isToday && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">今天</span>}
                      </span>
                      {hasReport && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          已生成
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!hasReport ? (
                        <Button size="sm" variant="outline" onClick={() => generateReport(date)} disabled={isGenerating}>
                          {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                          生成日报
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewing(previewing === date ? null : date)}>
                            <Eye className="w-4 h-4 mr-1" />预览
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateReport(date)} disabled={isGenerating}>
                            <RefreshCw className={cn("w-4 h-4 mr-1", isGenerating && "animate-spin")} />重新生成
                          </Button>
                          <Button size="sm" onClick={() => writeToFeishu(date)} disabled={isWriting}>
                            {isWriting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                            写回飞书
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {previewing === date && existing?.dailyReport && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-line leading-relaxed">
                      {existing.dailyReport}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
