import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Format a Date to Beijing YYYY-MM-DD string
function bjDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

export async function GET() {
  try {
    const userId = await getUserId();
    const rows = await prisma.candidate.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    const total = rows.length;
    const byStage: Record<string, number> = {};
    const byPosition: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    const activeStages = ["推荐简历", "邀约面试", "已面试待反馈", "Offer", "待入职"];
    let activeCount = 0;

    const candidates = rows.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position,
      currentStage: c.currentStage,
      baseLocation: c.baseLocation,
      recommendedDate: bjDate(c.recommendedDate),
      businessPassDate: bjDate(c.businessPassDate),
      inviteDate: bjDate(c.inviteDate),
      interviewDate: bjDate(c.interviewDate),
      offerDate: bjDate(c.offerDate),
      acceptDate: bjDate(c.acceptDate),
      onboardDate: bjDate(c.onboardDate),
      statusNote: c.statusNote,
    }));

    for (const c of candidates) {
      byStage[c.currentStage] = (byStage[c.currentStage] || 0) + 1;
      byPosition[c.position] = (byPosition[c.position] || 0) + 1;
      if (c.baseLocation) byLocation[c.baseLocation] = (byLocation[c.baseLocation] || 0) + 1;
      if (activeStages.includes(c.currentStage)) activeCount++;
    }

    const hired = byStage["已入职"] || 0;
    const eliminated = byStage["已淘汰"] || 0;

    return NextResponse.json({
      candidates,
      stats: {
        total, hired, active: activeCount, eliminated,
        conversionRate: total > 0 ? ((hired / total) * 100).toFixed(1) : "0",
        byStage, byPosition, byLocation,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
