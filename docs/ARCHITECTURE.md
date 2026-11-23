# ARCHITECTURE.md — BotHot 系统架构与目录地图

## 1. 系统分层架构
```text
[Cloudflare CDN / WAF]
        │
        ▼
[Next.js App Router on Vercel]
  ├── Public Pages (/[locale]/...) ── ISR + On-Demand Revalidate
  ├── OG & Honor Cards (/api/og, /api/admin/honor-cards) ── @vercel/og
  ├── Public APIs (/api/v1/*) ── Zod 校验 + Upstash Redis 限流
  ├── Admin Portal (/admin/* & /api/admin/*) ── GitHub OAuth + RBAC 白名单
  └── Cron Workers (/api/cron/*) ── Vercel Cron (CRON_SECRET 鉴权)
        │
        ├──► [PostgreSQL (Neon / Supabase)] ── 主业务数据 + 快照 + 审计日志
        ├──► [Upstash Redis] ── 24h 出站去重键 / 限流计数 / 榜单缓存
        └──► [Private Object Storage (R2 / Supabase Storage)] ── 原文临时存储 (raw/{bot_id}/{version_id})