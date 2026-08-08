"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">候选人看板</h1>
        <p className="text-sm text-muted-foreground mt-1">{candidates.length} 位候选人</p>
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

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
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
                    "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                    selected?.id === c.id && "bg-primary/5"
                  )}
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="font-normal">{c.position}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
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
            <CardTitle className="text-base flex items-center gap-2">
              {selected.name}
              <Badge variant="secondary">{selected.position}</Badge>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STAGE_STYLES[selected.currentStage] || "bg-muted")}>
                {selected.currentStage}
              </span>
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
