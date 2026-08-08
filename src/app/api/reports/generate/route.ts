import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDailyReport, type DailyReportInput } from "@/lib/ai";
import { upsertFunnelRow } from "@/lib/feishu";
import { getUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const { date, writeToFeishu } = await req.json();
    if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

    const dayStart = new Date(date + "T00:00:00+08:00");
    const dayEnd = new Date(date + "T23:59:59+08:00");

    const allCandidates = await prisma.candidate.findMany({ where: { userId } });

    const recommended = allCandidates.filter(c => c.recommendedDate && isSameDay(c.recommendedDate, dayStart));
    const invited = allCandidates.filter(c => c.inviteDate && isSameDay(c.inviteDate, dayStart));
    const interviewed = allCandidates.filter(c => c.interviewDate && isSameDay(c.interviewDate, dayStart));
    const offersSent = allCandidates.filter(c => c.offerDate && isSameDay(c.offerDate, dayStart));
    const offersAccepted = allCandidates.filter(c => c.acceptDate && isSameDay(c.acceptDate, dayStart));
    const onboarded = allCandidates.filter(c => c.onboardDate && isSameDay(c.onboardDate, dayStart));
    const eliminated = allCandidates.filter(c => c.currentStage === "已淘汰");
    const inProcess = allCandidates.filter(c => !["已淘汰", "已入职"].includes(c.currentStage));

    const prevRecommended = allCandidates.filter(c => c.recommendedDate && c.recommendedDate <= dayEnd).length;
    const prevInvited = allCandidates.filter(c => c.inviteDate && c.inviteDate <= dayEnd).length;
    const prevInterviewed = allCandidates.filter(c => c.interviewDate && c.interviewDate <= dayEnd).length;
    const prevOffersSent = allCandidates.filter(c => c.offerDate && c.offerDate <= dayEnd).length;
    const prevOffersAccepted = allCandidates.filter(c => c.acceptDate && c.acceptDate <= dayEnd).length;

    const input: DailyReportInput = {
      date,
      totalApplications: recommended.length + invited.length + interviewed.length,
      recommended, invited, interviewed, offersSent, offersAccepted, onboarded,
      eliminated, inProcess,
      prevRecommended, prevInvited, prevInterviewed, prevOffersSent, prevOffersAccepted,
    };

    const dailyReport = await generateDailyReport(input, userId);

    await prisma.dailyFunnel.upsert({
      where: { userId_date: { userId, date: dayStart } },
      create: {
        userId, date: dayStart,
        totalApplications: input.totalApplications,
        recommended: recommended.length, invited: invited.length,
        interviewed: interviewed.length, offersSent: offersSent.length,
        offersAccepted: offersAccepted.length, onboarded: onboarded.length,
        eliminated: eliminated.length, dailyReport,
      },
      update: {
        totalApplications: input.totalApplications,
        recommended: recommended.length, invited: invited.length,
        interviewed: interviewed.length, offersSent: offersSent.length,
        offersAccepted: offersAccepted.length, onboarded: onboarded.length,
        eliminated: eliminated.length, dailyReport,
      },
    });

    let feishuResult = null;
    if (writeToFeishu) {
      await upsertFunnelRow(userId, {
        date: dayStart,
        totalApplications: input.totalApplications,
        recommended: recommended.length, invited: invited.length,
        interviewed: interviewed.length, offersSent: offersSent.length,
        offersAccepted: offersAccepted.length, onboarded: onboarded.length,
        eliminated: eliminated.length, dailyReport,
      });
      feishuResult = "written";
    }

    return NextResponse.json({ success: true, dailyReport, feishuResult });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
