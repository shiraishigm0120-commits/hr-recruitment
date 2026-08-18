"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, Download, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Candidate {
  id: string;
  name: string;
  position: string;
  currentStage: string;
  baseLocation: string;
  recommendedDate: string | null;
  businessPassDate: string | null;
  inviteDate: string | null;
  interviewDate: string | null;
  offerDate: string | null;
  acceptDate: string | null;
  onboardDate: string | null;
  statusNote: string | null;
}

const ALL_STAGES = ["推荐简历", "邀约面试", "已面试待反馈", "Offer", "待入职", "已入职", "已淘汰"];

const STAGE_STYLES: Record<string, string> = {
  "已入职": "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  "待入职": "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "Offer": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
  "已面试待反馈": "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  "邀约面试": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  "推荐简历": "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  "已淘汰": "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("zh-CN") : "-";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [sortKey, setSortKey] = useState<string>("updatedAt");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchStage, setBatchStage] = useState("");
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = () => {
    fetch("/api/candidates")
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setCandidates(d.candidates);
      })
      .catch(e => toast.error("获取数据失败: " + e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const stages = [...new Set(candidates.map(c => c.currentStage))];
  const positions = [...new Set(candidates.map(c => c.position))];
  const locations = [...new Set(candidates.map(c => c.baseLocation).filter(Boolean))];

  let filtered = candidates.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter !== "all" && c.currentStage !== stageFilter) return false;
    if (positionFilter !== "all" && c.position !== positionFilter) return false;
    if (locationFilter !== "all" && c.baseLocation !== locationFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const va = (a as any)[sortKey] || "";
    const vb = (b as any)[sortKey] || "";
    return String(va).localeCompare(String(vb)) * sortDir;
  });

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const quickUpdateStage = async (id: string, stage: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失败");
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, currentStage: stage } : c));
      toast.success("已更新");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const batchUpdate = async () => {
    if (checkedIds.size === 0 || !batchStage) return;
    setBatchUpdating(true);
    try {
      const res = await fetch("/api/candidates/batch", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...checkedIds], stage: batchStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCandidates(prev => prev.map(c => checkedIds.has(c.id) ? { ...c, currentStage: batchStage } : c));
      toast.success(`已更新 ${data.count} 人`);
      setCheckedIds(new Set());
      setBatchStage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBatchUpdating(false);
    }
  };

  const exportCSV = () => {
    const headers = ["姓名", "岗位", "当前阶段", "城市", "推荐日期", "面试日期", "Offer日期", "入职日期", "备注"];
    const rows = candidates.map(c => [
      c.name, c.position, c.currentStage, c.baseLocation,
      fmtDate(c.recommendedDate), fmtDate(c.interviewDate),
      fmtDate(c.offerDate), fmtDate(c.onboardDate),
      c.statusNote || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `候选人数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">候选人看板</h1>
          <p className="text-sm text-muted-foreground mt-1">{candidates.length} 位候选人</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" />导出 CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索姓名..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v || "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="阶段" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部阶段</SelectItem>
            {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={(v) => setPositionFilter(v || "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="岗位" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部岗位</SelectItem>
            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v || "all")}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="城市" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部城市</SelectItem>
            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center ml-auto">
          {filtered.length} / {candidates.length} 条
        </div>
      </div>

      {/* Batch Action Bar */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">已选 {checkedIds.size} 人</span>
          <Select value={batchStage} onValueChange={(v) => setBatchStage(v || "")}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="目标阶段" />
            </SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={batchUpdate} disabled={!batchStage || batchUpdating}>
            {batchUpdating ? "更新中..." : "批量更新"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCheckedIds(new Set()); setBatchStage(""); }}>
            取消选择
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-2 py-3 w-8">
                  <button onClick={toggleAll} className="p-1 hover:bg-muted rounded">
                    {checkedIds.size === filtered.length && filtered.length > 0
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {[
                  { key: "name", label: "姓名" },
                  { key: "position", label: "岗位" },
                  { key: "currentStage", label: "当前阶段" },
                  { key: "baseLocation", label: "城市" },
                  { key: "recommendedDate", label: "推荐日期" },
                  { key: "interviewDate", label: "面试日期" },
                  { key: "offerDate", label: "Offer日期" },
                  { key: "onboardDate", label: "入职日期" },
                ].map(col => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                    onClick={() => {
                      if (sortKey === col.key) setSortDir(d => (d * -1) as 1 | -1);
                      else { setSortKey(col.key); setSortDir(1); }
                    }}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <ChevronDown className={cn("inline w-3 h-3 ml-1", sortDir === -1 && "rotate-180")} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b hover:bg-muted/30 transition-colors",
                    selected?.id === c.id && "bg-primary/5"
                  )}
                >
                  <td className="px-2 py-2.5">
                    <button onClick={(e) => { e.stopPropagation(); toggleCheck(c.id); }} className="p-1 hover:bg-muted rounded">
                      {checkedIds.has(c.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-medium cursor-pointer" onClick={() => setSelected(c)}>{c.name}</td>
                  <td className="px-4 py-2.5" onClick={() => setSelected(c)}>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STAGE_STYLES[c.currentStage] || "bg-muted")}>
                      {c.currentStage}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.baseLocation || "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(c.recommendedDate)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(c.interviewDate)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(c.offerDate)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(c.onboardDate)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    没有匹配的候选人
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Panel */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {selected.name}
              <Badge variant="secondary">{selected.position}</Badge>
              <Select
                value={selected.currentStage}
                onValueChange={(v) => v && quickUpdateStage(selected.id, v)}
              >
                <SelectTrigger className={cn("w-[130px] h-7 text-xs", STAGE_STYLES[selected.currentStage])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updatingId === selected.id && <span className="text-xs text-muted-foreground">更新中...</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">城市</div>
                <div className="font-medium">{selected.baseLocation || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">推荐日期</div>
                <div className="font-medium">{fmtDate(selected.recommendedDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">业务筛选</div>
                <div className="font-medium">{fmtDate(selected.businessPassDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">邀约日期</div>
                <div className="font-medium">{fmtDate(selected.inviteDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">面试日期</div>
                <div className="font-medium">{fmtDate(selected.interviewDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Offer日期</div>
                <div className="font-medium">{fmtDate(selected.offerDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">接受日期</div>
                <div className="font-medium">{fmtDate(selected.acceptDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">入职日期</div>
                <div className="font-medium">{fmtDate(selected.onboardDate)}</div>
              </div>
            </div>
            {selected.statusNote && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">备注：</span>
                {selected.statusNote}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}