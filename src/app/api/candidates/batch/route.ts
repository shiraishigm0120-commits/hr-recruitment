import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { ids, stage } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择候选人" }, { status: 400 });
    }
    if (!stage) {
      return NextResponse.json({ error: "请选择目标阶段" }, { status: 400 });
    }

    const result = await prisma.candidate.updateMany({
      where: { id: { in: ids }, userId },
      data: { currentStage: stage },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}