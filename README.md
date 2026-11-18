# 途泊属 BurrowPark

途泊属（BurrowPark）是一个面向家庭经营的小型私人停车场的管理工具，以手机 PWA 的形式运行，主要供不熟悉手机操作的长辈管理员日常使用。

名字取自"土拨鼠"的谐音：途（路途）、泊（停泊）、属（归属）。

## 要解决的问题

停车场分为内院和外院，目前完全依赖人工管理：手动抬杆、拍照登记、手记车牌、手算停车时长和缴费区间，并通过微信群留存照片。车辆一多就容易出错，也很难随时掌握空位和预订情况。

## 核心功能（规划）

- 拍照登记车辆，在浏览器端本地识别车牌（可手动修正）
- 从进场时刻开始计时，随时查看停车时长与应收金额
- 酒店合作客包天 / 临停按小时 / 长租 / 免费装卸等多种计费类型
- 缴费区间记录、续费与到期提醒
- 可自定义的内院 / 外院车位地图，直观查看空位、占用、预留状态
- 私人产权车位的临时借用与超时提醒
- 按月统计收入与车位使用率

## 技术栈

- **前端**：Next.js 16（App Router）· React 19 · MUI 9 · PWA
- **后端**：Hono（`@hono/zod-openapi`）挂载于 `/api`，Zod 作为请求 / 响应的单一契约来源
- **数据**：Supabase（Postgres + Storage + RLS）
- **质量**：TypeScript strict · ESLint · Prettier · Vitest · Storybook · GitHub Actions

## 本地开发

```bash
cp .env.example .env.local   # 填入 Supabase 连接信息
npm install
npm run dev                  # http://localhost:3000
npm run storybook            # http://localhost:6006
npm run check                # 类型检查 + Lint + 格式检查 + 单元测试
```

## 目录结构

```text
app/                      Next.js 路由（页面、API 入口、manifest）
src/
├── components/           Atomic Design：atoms / molecules / organisms / templates
├── internal/             后端：按业务模块分层（router / controller / service / repository）
│   └── shared/           统一错误、日志、中间件、Supabase client 等通用能力
├── theme/                MUI theme 与设计 token（面向长辈的大字号、车位状态配色）
├── config/               面向用户的文案常量
└── test/                 测试共通设置
docs/                     开发规则（AI_RULES.md、backend-rules.md）
```

开发规则见 [docs/AI_RULES.md](docs/AI_RULES.md)。

## 开发状态

工程框架已搭建，业务功能按 Issue 逐步实现中。
