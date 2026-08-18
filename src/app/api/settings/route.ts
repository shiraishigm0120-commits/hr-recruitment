import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getUserId();
    let settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }
    return NextResponse.json({ settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    // 只保留 UserSettings 模型的有效字段，排除 id/userId/updatedAt
    const allowed = ["feishuAppId", "feishuAppSecret", "feishuBitableToken", "feishuCandidateTable", "feishuFunnelTable", "aiApiKey", "aiBaseUrl", "aiModel"];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return NextResponse.json({ settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
