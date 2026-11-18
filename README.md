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
npm install             # Node 24 / npm 11
npx supabase start      # 首次启动本地 Supabase，自动应用迁移与 seed
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

## 部署

部署前先准备 Supabase 项目、Vercel 环境变量和域名。不要把生产访问码或家庭账号密码提交到仓库。

1. 在 Supabase 控制台 Authentication 关闭 **Allow new users to sign up** 和 **Anonymous sign-ins**；Sessions 中保持 **Time-box user sessions**、**Inactivity timeout** 关闭。
2. 在 Authentication 的 Users 中选择 **Add user**，勾选 **Auto Confirm**，创建家庭共用账号并设置随机长密码。
3. 推送数据库 migration（在 GitHub Actions 上执行，本地不需要 Docker）：
   - 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加两个 Repository secret：`SUPABASE_ACCESS_TOKEN`（Supabase 控制台右上角头像 → Account preferences → Access Tokens 生成）、`SUPABASE_DB_PASSWORD`（创建项目时设置的数据库密码）。
   - 在 Actions 页面手动运行 **Deploy database**。之后每次合并到 main 且 `supabase/migrations/` 有变更时会自动运行。
4. migration 推送成功后，在 SQL Editor 中执行（替换实际 UID）：

   ```sql
   insert into public.family_account (user_id) values ('<家庭账号 uid>');
   ```

5. 在 Vercel 的 **Production 与 Preview** 都配置 `ACCESS_CODE`（6～12 位随机数字）、`FAMILY_ACCOUNT_EMAIL`、`FAMILY_ACCOUNT_PASSWORD`、`SUPABASE_SECRET_KEY`；同时需要已有的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
6. 手机遗失后修改 `ACCESS_CODE` 并重新部署，再在 SQL Editor 执行：

   ```sql
   delete from auth.sessions where user_id = '<uid>';
   ```

   已发出的 access token 可能最长 1 小时后才失效；仅修改访问码不会立即踢出旧会话。

本地 `.env.example` 的访问码和密码仅用于 seed 账号；生产必须更换。数据库迁移、pgTAP 测试与类型生成使用 `npx supabase start`、`npx supabase test db`、`npm run db:types`。
