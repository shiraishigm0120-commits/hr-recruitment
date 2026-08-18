import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await req.json();

    // 只允许更新指定字段
    const allowed = ["currentStage", "statusNote", "position", "baseLocation"];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const candidate = await prisma.candidate.update({
      where: { id, userId },
      data,
    });

    return NextResponse.json({ success: true, candidate });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    await prisma.candidate.delete({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}