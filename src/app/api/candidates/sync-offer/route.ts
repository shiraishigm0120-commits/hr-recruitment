import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Sync candidate offer dates to Feishu
export async function POST() {
  try {
    const userId = await getUserId();
    
    // Check feishu config
    if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_BITABLE_APP_TOKEN || !process.env.FEISHU_CANDIDATE_TABLE_ID) {
      return NextResponse.json({ error: "Feishu not configured" }, { status: 400 });
    }

    // Get token
    const tokenRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }),
    });
    const tokenData = await tokenRes.json() as any;
    const token = tokenData.tenant_access_token;

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
    const tableId = process.env.FEISHU_CANDIDATE_TABLE_ID;
    const base = "https://open.feishu.cn/open-apis";

    const candidates = await prisma.candidate.findMany({
      where: { userId, currentStage: "已入职", offerDate: { not: null } },
    });

    const results: string[] = [];

    for (const c of candidates) {
      // Search
      const searchRes = await fetch(`${base}/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: { conjunction: "and", conditions: [{ field_name: "姓名", operator: "is", value: [c.name] }] },
        }),
      });
      const searchData = await searchRes.json() as any;
      const rid = searchData.data?.items?.[0]?.record_id;
      if (!rid) { results.push(`NOT FOUND: ${c.name}`); continue; }

      const offerMs = new Date(c.offerDate!.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00").getTime();

      const updateRes = await fetch(`${base}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${rid}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { "Offer日期": offerMs } }),
      });
      const updateData = await updateRes.json() as any;
      if (updateData.code === 0) {
        results.push(`✅ ${c.name}`);
      } else {
        results.push(`❌ ${c.name}: ${updateData.msg}`);
      }
    }

    return NextResponse.json({ results, count: results.filter(r => r.startsWith("✅")).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
