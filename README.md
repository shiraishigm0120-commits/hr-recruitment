# 🎯 HR Recruit

> 飞书联动的智能招聘数据仪表盘 — 从候选人看板到 AI 日报，一站式招聘数据管理。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ 功能

| 模块 | 说明 |
|------|------|
| 📊 **仪表盘** | 实时统计卡片 + 岗位/城市分布图 + 招聘漏斗 + 阶段分布 |
| 📋 **候选人看板** | 搜索/筛选/排序 + 点击查看完整详情 |
| 🤖 **AI 日报** | 一键生成结构化日报 → 预览 → 写回飞书 |
| 📈 **趋势分析** | 周转化率变化 + 活动量趋势 + 淘汰原因分布 + 各岗位对比 |
| 🔗 **飞书双向同步** | 读候选人看板 + 写漏斗表，飞书作为唯一数据源 |

---

## 🎬 Demo 模式

**无需飞书账号即可体验。** 项目内置演示数据（119 条候选人记录），覆盖 7/8 - 8/7 完整招聘周期。

```bash
git clone https://github.com/your-username/hr-recruitment.git
cd hr-recruitment
npm install
cp .env.example .env     # Demo mode, no config needed
npx prisma migrate dev
npm run dev
```

打开 `http://localhost:3000` → 点击「同步」加载演示数据。

---

## 🔗 飞书联动

### 配置飞书应用

1. [飞书开发者后台](https://open.feishu.cn/app) → 创建企业自建应用
2. 添加权限：`bitable:app`
3. 发布应用 → 在飞书表格中添加文档应用

### 设置环境变量

```bash
FEISHU_APP_ID="cli_xxxxxxxxxxxx"
FEISHU_APP_SECRET="xxxxxxxxxxxxxxxx"
FEISHU_BITABLE_APP_TOKEN="UdOwbeUuYarzS9sZbphcnlw9nH3"  # 你的多维表格 token
FEISHU_CANDIDATE_TABLE_ID="tblV49gshqS0AWoc"           # 候选人看板表 ID
FEISHU_FUNNEL_TABLE_ID="tblc6lv1WUnVzPeR"              # 每日漏斗表 ID
```

### 飞书表格结构

**候选人看板**（必需字段）：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 姓名 | 文本 | 唯一标识 |
| 岗位 | 单选 | 抽卡师 / 短剧编剧 / AI短剧编剧 / 短剧运营 / 内容策略运营 / 剧本审核专员 |
| 当前阶段 | 单选 | 推荐简历 / 邀约面试 / 已面试待反馈 / Offer / 待入职 / 已入职 / 已淘汰 |
| base地 | 文本 | 重庆 / 北京 / 深圳 / 杭州 / 广州 / 西安 |
| 推荐日期 | 日期 | — |
| 业务筛选日期 | 日期 | — |
| 邀约日期 | 日期 | — |
| 面试日期 | 日期 | — |
| Offer日期 | 日期 | — |
| 接受日期 | 日期 | — |
| 入职日期 | 日期 | — |
| 状态备注 | 文本 | 淘汰原因等 |

**每日漏斗表**（写回目标）：

| 字段名 | 类型 |
|--------|------|
| 日期 | 日期 |
| 简历投递量 | 数字 |
| 推荐简历 | 数字 |
| 邀约面试 | 数字 |
| 今日面试 | 数字 |
| 日报 | 文本 |

---

## 🏗️ 技术架构

```
src/
├── app/
│   ├── layout.tsx              # 侧边栏布局
│   ├── page.tsx                # 仪表盘首页
│   ├── candidates/page.tsx     # 候选人看板
│   ├── reports/page.tsx        # AI 每日总结
│   ├── trends/page.tsx         # 趋势分析
│   └── api/
│       ├── candidates/         # 飞书同步 + 数据查询
│       ├── reports/            # 日报生成 + 写回飞书
│       └── status/             # 系统状态
├── lib/
│   ├── feishu.ts               # 飞书 SDK（读看板 + 写漏斗）
│   ├── ai.ts                   # AI 日报生成（DeepSeek / OpenAI）
│   └── db.ts                   # Prisma 数据库客户端
└── components/
    └── layout/sidebar.tsx      # 导航侧边栏
```

**技术栈**：Next.js 16 · React 19 · TypeScript · Prisma 7 · Tailwind CSS 4 · shadcn/ui · Recharts · Framer Motion · DeepSeek API

---

## 🚀 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Vercel 部署步骤

1. Fork 本项目到你的 GitHub
2. 在 [Turso](https://turso.tech) 创建免费数据库（或使用本地 SQLite）
3. Vercel 导入仓库
4. 添加环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Turso 连接字符串（`libsql://...`）或本地 `file:./dev.db` |
| `FEISHU_APP_ID` | （可选）飞书应用 ID |
| `FEISHU_APP_SECRET` | （可选）飞书密钥 |
| `FEISHU_BITABLE_APP_TOKEN` | （可选）表格 token |
| `FEISHU_CANDIDATE_TABLE_ID` | （可选）候选人表 ID |
| `FEISHU_FUNNEL_TABLE_ID` | （可选）漏斗表 ID |
| `AI_API_KEY` | （可选）AI Key |

### 环境变量清单

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | SQLite 本地（`file:./dev.db`）或 Turso（`libsql://...`） |
| `TURSO_AUTH_TOKEN` | ❌ | Turso 认证令牌（使用 Turso 时必需） |
| `FEISHU_APP_ID` | ❌ | 飞书应用 ID（不配则用 demo 数据） |
| `FEISHU_APP_SECRET` | ❌ | 飞书应用密钥 |
| `FEISHU_BITABLE_APP_TOKEN` | ❌ | 飞书多维表格 token |
| `FEISHU_CANDIDATE_TABLE_ID` | ❌ | 候选人看板表 ID |
| `FEISHU_FUNNEL_TABLE_ID` | ❌ | 每日漏斗表 ID |
| `AI_API_KEY` | ❌ | AI API Key（不配则用模板日报） |
| `AI_BASE_URL` | ❌ | AI API 地址（默认 DeepSeek） |
| `AI_MODEL` | ❌ | AI 模型名（默认 deepseek-chat） |

---

## 📄 License

MIT © 2026
