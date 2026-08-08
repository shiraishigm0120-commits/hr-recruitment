import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getUserId();
    const records = await prisma.dailyFunnel.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ reports: records });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
