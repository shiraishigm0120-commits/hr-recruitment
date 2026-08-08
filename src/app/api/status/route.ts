import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    feishu: { configured: Boolean(process.env.FEISHU_APP_ID) },
    ai: { configured: Boolean(process.env.AI_API_KEY) },
    mode: process.env.FEISHU_APP_ID ? "live" : "demo",
  });
}
