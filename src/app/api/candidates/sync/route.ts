import { NextResponse } from "next/server";
import { pullCandidates, type FeishuCandidate, getFeishuStatus } from "@/lib/feishu";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";
import fs from "fs";
import path from "path";

function subBusinessDays(date: Date, days: number): Date {
  const d = new Date(date); let remaining = days;
  while (remaining > 0) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) remaining--; }
  return d;
}

async function loadDemoData(): Promise<FeishuCandidate[]> {
  const csvPath = path.join(process.cwd(), "public", "demo-data.csv");
  if (!fs.existsSync(csvPath)) return [];
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/^\uFEFF/, "").split(",");
  const results: FeishuCandidate[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < headers.length) continue;
    const get = (n: string) => vals[headers.indexOf(n)] || "";
    const parseDate = (s: string) => s.match(/^\d{4}\/\d{2}\/\d{2}$/) ? new Date(s + "T00:00:00+08:00") : null;
    results.push({
      name: get("姓名").trim(),
      position: get("岗位").includes("策划") || get("岗位").includes("策略") ? "内容策略运营" : get("岗位"),
      currentStage: get("当前阶段") || "推荐简历", baseLocation: get("base地"),
      recommendedDate: parseDate(get("推荐日期")), businessPassDate: parseDate(get("业务筛选日期")),
      inviteDate: parseDate(get("邀约日期")), interviewDate: parseDate(get("面试日期")),
      offerDate: parseDate(get("Offer日期")), acceptDate: parseDate(get("接受日期")),
      onboardDate: parseDate(get("入职日期")), statusNote: get("状态备注") || null,
    });
  }
  return results.filter(c => c.name);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { inQuotes = !inQuotes; continue; } if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; } current += ch; }
  result.push(current); return result;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const status = await getFeishuStatus(userId);
    let candidates: FeishuCandidate[];
    if (status.configured) {
      candidates = await pullCandidates(userId);
    } else {
      candidates = await loadDemoData();
    }

    for (const c of candidates) {
      if (!c.name) continue;
      await prisma.candidate.upsert({
        where: { userId_name: { userId, name: c.name } },
        create: { userId, name: c.name, position: c.position, currentStage: c.currentStage, baseLocation: c.baseLocation, recommendedDate: c.recommendedDate, businessPassDate: c.businessPassDate, inviteDate: c.inviteDate, interviewDate: c.interviewDate, offerDate: c.offerDate, acceptDate: c.acceptDate, onboardDate: c.onboardDate, statusNote: c.statusNote },
        update: { position: c.position, currentStage: c.currentStage, baseLocation: c.baseLocation, recommendedDate: c.recommendedDate, businessPassDate: c.businessPassDate, inviteDate: c.inviteDate, interviewDate: c.interviewDate, offerDate: c.offerDate, acceptDate: c.acceptDate, onboardDate: c.onboardDate, statusNote: c.statusNote },
      });
    }

    // Backfill offer dates
    const hiredMissingOffer = await prisma.candidate.findMany({ where: { userId, currentStage: "已入职", offerDate: null, onboardDate: { not: null } } });
    let backfilled = 0;
    for (const c of hiredMissingOffer) { const od = subBusinessDays(c.onboardDate!, 2); await prisma.candidate.update({ where: { id: c.id }, data: { offerDate: od } }); backfilled++; }

    return NextResponse.json({ success: true, count: candidates.length, mode: status.configured ? "feishu" : "demo", backfilled });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
