import { prisma } from "@/lib/db";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

// Default from env, overridden by user settings
function defaults() {
  return {
    appId: process.env.FEISHU_APP_ID || "",
    appSecret: process.env.FEISHU_APP_SECRET || "",
    bitableToken: process.env.FEISHU_BITABLE_APP_TOKEN || "",
    candidateTable: process.env.FEISHU_CANDIDATE_TABLE_ID || "",
    funnelTable: process.env.FEISHU_FUNNEL_TABLE_ID || "",
  };
}

// Get effective config (user settings > env)
async function getConfig(userId: string) {
  const d = defaults();
  try {
    const s = await prisma.userSettings.findUnique({ where: { userId } });
    if (s) {
      return {
        appId: s.feishuAppId || d.appId,
        appSecret: s.feishuAppSecret || d.appSecret,
        bitableToken: s.feishuBitableToken || d.bitableToken,
        candidateTable: s.feishuCandidateTable || d.candidateTable,
        funnelTable: s.feishuFunnelTable || d.funnelTable,
      };
    }
  } catch {}
  return d;
}

function isConfigured(cfg: ReturnType<typeof defaults>): boolean {
  return Boolean(cfg.appId && cfg.appSecret && cfg.bitableToken);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(appId: string, appSecret: string): Promise<string> {
  const key = `${appId}:${appSecret}`;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000 && cachedToken.value.startsWith(key)) {
    return cachedToken.value.replace(key + ":", "");
  }
  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await res.json() as any;
  if (data.code !== 0) throw new Error(`Feishu auth failed: ${data.code}`);
  cachedToken = { value: `${key}:${data.tenant_access_token}`, expiresAt: Date.now() + (data.expire ?? 7200) * 1000 };
  return data.tenant_access_token;
}

function toText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(seg => typeof seg === "string" ? seg : (seg as any)?.text ?? "").join("");
  return "";
}
function toDate(v: unknown): Date | null {
  const ms = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!ms || isNaN(ms)) return null;
  return new Date(new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00");
}
function normalizePosition(p: string): string {
  const s = p.trim();
  if (!s) return "";
  if (s.includes("策划") || s.includes("策略")) return "内容策略运营";
  return s;
}

export interface FeishuCandidate {
  name: string; position: string; currentStage: string; baseLocation: string;
  recommendedDate: Date | null; businessPassDate: Date | null;
  inviteDate: Date | null; interviewDate: Date | null;
  offerDate: Date | null; acceptDate: Date | null;
  onboardDate: Date | null; statusNote: string | null;
}

export async function pullCandidates(userId: string): Promise<FeishuCandidate[]> {
  const cfg = await getConfig(userId);
  if (!isConfigured(cfg)) return [];

  const token = await getToken(cfg.appId, cfg.appSecret);
  const items: any[] = [];
  let pageToken = "";
  for (let i = 0; i < 20; i++) {
    const url = `${FEISHU_BASE}/bitable/v1/apps/${cfg.bitableToken}/tables/${cfg.candidateTable}/records?page_size=200${pageToken ? `&page_token=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.code !== 0) throw new Error(`Feishu pull failed: ${data.code}`);
    items.push(...(data.data?.items ?? []));
    if (!data.data?.has_more || !data.data?.page_token) break;
    pageToken = data.data.page_token;
  }

  return items.map(it => {
    const f = it.fields;
    return {
      name: toText(f["姓名"]).trim(),
      position: normalizePosition(toText(f["岗位"])),
      currentStage: toText(f["当前阶段"]) || "推荐简历",
      baseLocation: toText(f["base地"]),
      recommendedDate: toDate(f["推荐日期"]),
      businessPassDate: toDate(f["业务筛选日期"]),
      inviteDate: toDate(f["邀约日期"]),
      interviewDate: toDate(f["面试日期"]),
      offerDate: toDate(f["Offer日期"]),
      acceptDate: toDate(f["接受日期"]),
      onboardDate: toDate(f["入职日期"]),
      statusNote: toText(f["状态备注"]) || null,
    };
  });
}

export interface FunnelRow {
  date: Date; totalApplications: number; recommended: number; invited: number;
  interviewed: number; offersSent: number; offersAccepted: number;
  onboarded: number; eliminated: number; dailyReport: string;
}

function beijingMidnightMs(date: Date): number {
  return new Date(date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00").getTime();
}

export async function upsertFunnelRow(userId: string, row: FunnelRow): Promise<void> {
  const cfg = await getConfig(userId);
  if (!isConfigured(cfg) || !cfg.funnelTable) return;

  const token = await getToken(cfg.appId, cfg.appSecret);
  const dateMs = beijingMidnightMs(new Date(row.date));

  const safeRate = (a: number, b: number) => b > 0 ? Math.round((a / b) * 10000) / 10000 : 0;
  const fields: Record<string, unknown> = {
    日期: dateMs, 简历投递量: row.totalApplications, 推荐简历: row.recommended,
    邀约面试: row.invited, 今日面试: row.interviewed, 日报: row.dailyReport,
    初筛通过率: safeRate(row.recommended, row.totalApplications),
    邀约率: safeRate(row.invited, row.recommended),
    面试到场率: safeRate(row.interviewed, row.invited),
    Offer发出率: safeRate(row.offersSent, row.interviewed),
    Offer接受率: safeRate(row.offersAccepted, row.offersSent),
    入职率: safeRate(row.onboarded, row.offersAccepted),
  };

  // Search by date
  const searchRes = await fetch(`${FEISHU_BASE}/bitable/v1/apps/${cfg.bitableToken}/tables/${cfg.funnelTable}/records/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { conjunction: "and", conditions: [{ field_name: "日期", operator: "is", value: ["ExactDate", String(dateMs)] }] } }),
  });
  const searchData = await searchRes.json() as any;
  const existingId = searchData.data?.items?.[0]?.record_id;

  const url = existingId
    ? `${FEISHU_BASE}/bitable/v1/apps/${cfg.bitableToken}/tables/${cfg.funnelTable}/records/${existingId}`
    : `${FEISHU_BASE}/bitable/v1/apps/${cfg.bitableToken}/tables/${cfg.funnelTable}/records`;

  await fetch(url, {
    method: existingId ? "PUT" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

export async function getFeishuStatus(userId: string) {
  try {
    const cfg = await getConfig(userId);
    return { configured: isConfigured(cfg), appId: cfg.appId ? cfg.appId.slice(0, 8) + "***" : undefined };
  } catch {
    return { configured: false };
  }
}
