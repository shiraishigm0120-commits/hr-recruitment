// Sync offer dates back to Feishu
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: "file:./dev.db" }) });

const FEISHU_BASE = "https://open.feishu.cn/open-apis";
const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BITABLE_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN!;
const CANDIDATE_TABLE = process.env.FEISHU_CANDIDATE_TABLE_ID!;

function beijingMidnightMs(date: Date): number {
  return new Date(date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00").getTime();
}

async function getToken(): Promise<string> {
  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const data = await res.json() as any;
  return data.tenant_access_token;
}

async function findRecord(token: string, name: string): Promise<string | null> {
  const res = await fetch(`${FEISHU_BASE}/bitable/v1/apps/${BITABLE_TOKEN}/tables/${CANDIDATE_TABLE}/records/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { conjunction: "and", conditions: [{ field_name: "姓名", operator: "is", value: [name] }] } }),
  });
  const data = await res.json() as any;
  return data.data?.items?.[0]?.record_id ?? null;
}

async function main() {
  const token = await getToken();
  const hired = await prisma.candidate.findMany({
    where: { currentStage: "已入职", offerDate: { not: null } },
  });

  for (const c of hired) {
    if (!c.offerDate) continue;
    const rid = await findRecord(token, c.name);
    if (!rid) { console.log(`NOT FOUND in Feishu: ${c.name}`); continue; }

    const offerMs = beijingMidnightMs(c.offerDate);
    await fetch(`${FEISHU_BASE}/bitable/v1/apps/${BITABLE_TOKEN}/tables/${CANDIDATE_TABLE}/records/${rid}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { "Offer日期": offerMs } }),
    });
    console.log(`✅ Feishu: ${c.name} offer=${c.offerDate.toISOString().slice(0,10)}`);
  }

  await prisma.$disconnect();
  console.log("\nDone syncing to Feishu.");
}

main().catch(console.error);
