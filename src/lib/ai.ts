import { prisma } from "@/lib/db";

// Get effective AI config (user settings > env)
async function getAIConfig(userId?: string) {
  const envKey = process.env.AI_API_KEY || "";
  const envBase = (process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const envModel = process.env.AI_MODEL || "deepseek-chat";

  if (!userId) return { apiKey: envKey, baseUrl: envBase, model: envModel };

  try {
    const s = await prisma.userSettings.findUnique({ where: { userId } });
    if (s?.aiApiKey) {
      return {
        apiKey: s.aiApiKey,
        baseUrl: (s.aiBaseUrl || envBase).replace(/\/+$/, ""),
        model: s.aiModel || envModel,
      };
    }
  } catch {}
  return { apiKey: envKey, baseUrl: envBase, model: envModel };
}

function isConfigured(cfg: { apiKey: string }) {
  return Boolean(cfg.apiKey);
}

async function chat(cfg: { apiKey: string; baseUrl: string; model: string }, system: string, user: string, jsonMode = false): Promise<string> {
  if (!isConfigured(cfg)) throw new Error("AI not configured");

  const body: any = {
    model: cfg.model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.3,
    max_tokens: 2000,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Daily Report ──
export interface DailyReportInput {
  date: string;
  totalApplications: number;
  recommended: { name: string; position: string; baseLocation: string }[];
  invited: { name: string; position: string; baseLocation: string }[];
  interviewed: { name: string; position: string; baseLocation: string }[];
  offersSent: { name: string; position: string; baseLocation: string }[];
  offersAccepted: { name: string; position: string; baseLocation: string }[];
  onboarded: { name: string; position: string; baseLocation: string }[];
  eliminated: { name: string; position: string; baseLocation: string }[];
  inProcess: { name: string; position: string; baseLocation: string }[];
  prevRecommended: number;
  prevInvited: number;
  prevInterviewed: number;
  prevOffersSent: number;
  prevOffersAccepted: number;
}

export async function generateDailyReport(input: DailyReportInput, userId?: string): Promise<string> {
  const cfg = await getAIConfig(userId);
  if (!isConfigured(cfg)) return templateReport(input);

  try {
    return await aiGenerateReport(input, cfg);
  } catch (e: any) {
    console.warn("AI generation failed, using template:", e.message);
    return templateReport(input);
  }
}

async function aiGenerateReport(input: DailyReportInput, cfg: { apiKey: string; baseUrl: string; model: string }): Promise<string> {
  const safeRate = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
  const nameList = (list: any[]) => list.map(c => `${c.name}`).join("、") || "无";
  const detailList = (list: any[]) => list.map(c => `${c.position}-${c.baseLocation}-${c.name}`).join("，") || "无";

  const prompt = `你是招聘助手。根据今天的数据生成简洁日报。

日期：${input.date}
推荐(${input.recommended.length})：${detailList(input.recommended)}
邀约(${input.invited.length})：${detailList(input.invited)}
面试(${input.interviewed.length})：${detailList(input.interviewed)}
Offer(${input.offersSent.length})：${detailList(input.offersSent)}
入职(${input.onboarded.length})：${detailList(input.onboarded)}
流程中(${input.inProcess.length})：${detailList(input.inProcess)}
淘汰累计：${input.eliminated.length}
转化率：推荐→邀约${safeRate(input.prevInvited,input.prevRecommended)}% 邀约→面试${safeRate(input.prevInterviewed,input.prevInvited)}% 面试→Offer${safeRate(input.prevOffersSent,input.prevInterviewed)}% Offer→入职${safeRate(input.prevOffersAccepted,input.prevOffersSent)}%

格式：
${input.date} 日报
1、推荐简历：N（岗位-城市-姓名列表）
2、邀约面试：N（...）
3、今日面试：N（...）
4、面试通过：N（...）
5、待入职：N（...）
6、流程中/待谈薪：N（...）
7、淘汰：N（累计）
8、转化率：...
9、今日心得：（1-3句话的洞察和建议）`;

  return await chat(cfg, "你是招聘助手，按格式生成简洁日报。", prompt);
}

function templateReport(input: DailyReportInput): string {
  const safeRate = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
  const nameList = (list: any[]) => list.map(c => c.name).join("、") || "无";

  return `${input.date} 日报
1、推荐简历：${input.recommended.length}（${nameList(input.recommended)}）
2、邀约面试：${input.invited.length}（${nameList(input.invited)}）
3、今日面试：${input.interviewed.length}（${nameList(input.interviewed)}）
4、面试通过：${input.offersSent.length}（${nameList(input.offersSent)}）
5、待入职：${input.inProcess.length}（${nameList(input.inProcess)}）
6、流程中：0
7、淘汰：${input.eliminated.length}（累计）
8、转化率：推荐→邀约${safeRate(input.prevInvited,input.prevRecommended)}% 邀约→面试${safeRate(input.prevInterviewed,input.prevInvited)}% 面试→Offer${safeRate(input.prevOffersSent,input.prevInterviewed)}% Offer→入职${safeRate(input.prevOffersAccepted,input.prevOffersSent)}%
9、今日心得：配置 AI Key 后可自动生成洞察`;
}

export async function classifyEliminationReasons(
  candidates: { name: string; position: string; note: string | null }[],
  userId?: string
): Promise<Record<string, number>> {
  const cfg = await getAIConfig(userId);
  if (!isConfigured(cfg) || candidates.length === 0) return {};

  try {
    const notes = candidates.map(c => `${c.name}: ${c.note || "无备注"}`).join("\n");
    const result = await chat(cfg,
      "将淘汰原因归类：面试未通过/业务筛选未通过/候选人放弃/未参加面试/简历造假/其他。返回JSON: {\"类别\": 人数}",
      notes, true);
    return JSON.parse(result);
  } catch { return {}; }
}
