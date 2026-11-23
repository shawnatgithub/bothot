# AGENTS.md — BotHot 多 AI Agent 开发宪法

> 所有参与 BotHot 开发的 AI Agent 在编写任何代码前**必须**完整阅读本文件。违反“合规红线”或“文件所有权”的 PR 将被 CI 或 Review Agent 直接拒绝。

## 1. 项目定位与技术栈（不可擅自更换）
- **产品定位**：Grok Bot 第三方排行榜 + 安全审计站（中英双语：`/en/`、`/zh/`）。
- **前端与全栈**：Next.js (App Router, SSR/ISR) + TypeScript (strict) + Tailwind CSS + `next-intl` + `@vercel/og`
- **数据库与 ORM**：PostgreSQL (Neon / Supabase) + Prisma ORM（Phase 2 启用 `pgvector`）
- **缓存与限流**：Redis (Upstash)
- **原文私有存储**：私有对象存储（Supabase Storage 或 Cloudflare R2，跟随数据库选型）
- **身份认证**：Auth.js (X + GitHub OAuth Provider，仅申请最小只读权限)
- **定时任务**：Vercel Cron (Phase 1)
- **错误监控与邮件**：Sentry + Resend/Postmark（仅用于申诉通知）
- **测试框架**：Vitest（单元测试）+ Playwright（E2E）

## 2. 绝对合规红线（CI 自动化拦截）
1. **禁止担保性措辞**：全站代码、i18n JSON、OG 图、荣誉卡片中**严禁**出现 `"Verified"`、`"Safe"`、`"认证"`、`"安全保证"`（仅允许出现在独立免责声明的否定句中，如“不构成任何安全保证”）。
2. **四档徽章强制规范**：必须同时渲染**图标 + 文字**，不可仅靠颜色区分：
   - `green`: 🟢 `BotHot 审计 · 低风险` / `BotHot Audit · Low Risk`
   - `yellow`: 🟡 `BotHot 审计 · 中风险` / `BotHot Audit · Medium Risk`
   - `gray`: ⚪ `BotHot 审计 · 信息不足` / `BotHot Audit · Insufficient Info`
   - `red`: 🔴 `BotHot 审计 · 高风险` / `BotHot Audit · High Risk`
3. **严禁存储或暴露配置原文**：
   - PostgreSQL 中**绝不**存提示词或 `SKILL.md` 原文。
   - 原文仅存私有对象存储 `raw/{bot_id}/{version_id}`，仅 `reviewer` / `admin` 可通过服务端代理接口查看且必须写入 `admin_audit_log`。
   - 任何公开 API DTO 中**严禁**包含 `raw_storage_key` 字段。
4. **直连官方地址**：所有“去 x.ai 安装”按钮的 `<a href>` **必须**直接指向 `https://x.ai/bot/...`，加 `target="_blank" rel="noopener"`。**严禁**使用站内 302 中转链接；出站埋点必须使用 `navigator.sendBeacon`，埋点失败不得阻塞跳转。
5. **独立声明与视觉隔离**：全站页脚、详情页、方法论页必须展示中/英文独立声明；严禁使用 Grok 官方 Logo 或官方配色。
6. **公正性原则**：任何排序与审计逻辑均不得受付费字段影响；安全评级仅做惩罚（⚪ ×0.8、🔴 折叠不计名次）与筛选，绝不对 🟢 加分。

## 3. 核心业务铁律（防 AI 偷懒与幻觉）
- **双语降级（D42）**：
  - 安全卡片动态文案（`rule_hits[].evidence_zh` 等）按 `verification_reports.zh_proofread` **整块降级**；为 `false` 时中文页显示英文原文并加顶部“中文版校对中”提示，静态标签（徽章/规则名）仍显示中文。
  - 一句话摘要（`bots.summary_zh`）**独立处理**；`summary_zh_proofread = false` 时显示机翻中文并附“机器翻译”标签；为空时回退英文。
- **快照与状态联动（D43）**：
  - 风险变高（`archived`、`taken_down`、升至 🔴/⚪）必须在 5 分钟内触发当日快照重算（`revision + 1`，只重排不重新取数），并触发 ISR `revalidateTag`。
  - 风险变低与新 Bot 上榜仅在次日 `00:00 UTC` 快照生效。
- **审计日志强制写入**：`/api/admin/*` 下所有写操作及查看原文操作，必须在同一事务或紧随其后写入 `admin_audit_log`。
- **外部采集隔离**：所有 X / GitHub 采集必须通过 `src/lib/adapters/` 接口实现；X 抓取凭证与 Auth.js 登录凭证完全隔离；一次性 X 抓取受后台开关保护，默认关闭。

## 4. 多 Agent 协作与文件所有权规则
- **只读共享区**（严禁业务 Agent 直接修改，需变更时向架构师/人工提 RFC）：
  - `prisma/schema.prisma`
  - `src/types/api-contract.ts`
  - `AGENTS.md` / `ARCHITECTURE.md` / `STATE_MACHINES.md`
- **目录领地划分**：
  - `Agent-FE`（前台）：`src/app/[locale]/`、`src/components/public/`、`messages/`
  - `Agent-Core`（核心引擎与公开 API）：`src/lib/ranking/`、`src/lib/audit/`、`src/lib/adapters/`、`src/lib/normalize.ts`、`src/app/api/(public|cron)/`
  - `Agent-Admin`（运营后台）：`src/app/admin/`、`src/components/admin/`、`src/app/api/admin/`
- **TDD 强制要求**：`src/lib/ranking/`、`src/lib/normalize.ts`、`src/lib/tracking/`、`src/lib/audit/rules.ts` 必须先写 Vitest 单元测试再写实现，覆盖率 ≥ 90%。
- **PR 自检清单**：每次提交必须附带对应 User Story（US-01 ~ US-27）的逐条 AC 核对结果，并确保 `pnpm typecheck && pnpm lint && pnpm test && pnpm check:compliance` 全绿。