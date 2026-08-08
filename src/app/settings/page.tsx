"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, Database, Bot, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setSettings(d.settings || {}))
      .catch(() => toast.error("加载设置失败")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      if (!res.ok) throw new Error("保存失败");
      toast.success("设置已保存");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const update = (key: string, value: string) => setSettings((prev: any) => ({ ...prev, [key]: value }));

  const testFeishu = async () => {
    setTesting("feishu");
    try {
      const res = await fetch("/api/candidates/sync");
      const data = await res.json();
      if (data.success && data.mode === "feishu") toast.success("飞书连接成功！已同步 " + data.count + " 条数据");
      else toast.error("飞书连接失败，请检查配置");
    } catch { toast.error("飞书连接失败"); } finally { setTesting(""); }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">配置飞书和 AI，每人独立，互不影响</p>
      </div>

      {/* Feishu */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" />飞书多维表格</CardTitle>
            <CardDescription>
              在<a href="https://open.feishu.cn/app" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">飞书开发者后台<ExternalLink className="w-3 h-3" /></a>创建企业自建应用，开启「多维表格」权限，发布后把应用添加到表格
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label text="App ID" hint="飞书开发者后台 → 应用 → 凭证与基础信息 → App ID">
              <Input placeholder="cli_xxxxxxxx" value={settings.feishuAppId || ""} onChange={e => update("feishuAppId", (e.target as HTMLInputElement).value)} />
            </Label>
            <Label text="App Secret" hint="同上页面 → App Secret（点击查看）">
              <Input type="password" placeholder="••••••••" value={settings.feishuAppSecret || ""} onChange={e => update("feishuAppSecret", (e.target as HTMLInputElement).value)} />
            </Label>
            <Label text="Bitable App Token" hint="打开飞书多维表格 → 浏览器地址栏 https://xxx.feishu.cn/base/{这串}/...">
              <Input placeholder="UdOwbeUuYarzS9sZbphcnlw9nH3" value={settings.feishuBitableToken || ""} onChange={e => update("feishuBitableToken", (e.target as HTMLInputElement).value)} />
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Label text="候选人表 ID" hint="表格右上角 ... → 更多 → 表 ID">
                <Input placeholder="tblV49gshqS0AWoc" value={settings.feishuCandidateTable || ""} onChange={e => update("feishuCandidateTable", (e.target as HTMLInputElement).value)} />
              </Label>
              <Label text="漏斗表 ID" hint="日报写回的目标表 ID">
                <Input placeholder="tblc6lv1WUnVzPeR" value={settings.feishuFunnelTable || ""} onChange={e => update("feishuFunnelTable", (e.target as HTMLInputElement).value)} />
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={testFeishu} disabled={testing === "feishu"}>
              {testing === "feishu" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}测试连接
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4 text-purple-500" />AI 模型配置</CardTitle>
            <CardDescription>
              支持 OpenAI / DeepSeek 等兼容接口。在<a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">DeepSeek<ExternalLink className="w-3 h-3" /></a>创建 API Key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label text="API Key" hint="DeepSeek 后台 → API Keys → 创建 → 复制 sk- 开头的密钥">
              <Input type="password" placeholder="sk-..." value={settings.aiApiKey || ""} onChange={e => update("aiApiKey", (e.target as HTMLInputElement).value)} />
            </Label>
            <Label text="API Base URL" hint="接口地址。DeepSeek: https://api.deepseek.com  OpenAI: https://api.openai.com/v1">
              <Input placeholder="https://api.deepseek.com" value={settings.aiBaseUrl || ""} onChange={e => update("aiBaseUrl", (e.target as HTMLInputElement).value)} />
            </Label>
            <Label text="模型名称" hint="deepseek-chat / gpt-4o / gpt-3.5-turbo">
              <Input placeholder="deepseek-chat" value={settings.aiModel || ""} onChange={e => update("aiModel", (e.target as HTMLInputElement).value)} />
            </Label>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}保存设置
        </Button>
      </motion.div>
    </div>
  );
}

function Label({ text, hint, children }: { text: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{text}</label>
      {children}
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{hint}</p>
    </div>
  );
}
