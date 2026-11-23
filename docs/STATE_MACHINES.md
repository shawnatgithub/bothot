# STATE_MACHINES.md — 核心业务状态机、联动规则与 RBAC 权限矩阵

> 本文件直接对应 PRD §5.5、§5.8、§9.1、§11.1（D43、D44）。后端所有状态变更必须封装在服务层事务中，禁止绕过状态机直接 `prisma.update`。

## 1. 总原则（D43）
- **风险变高立即生效**：Bot 失效（`archived`）、下架（`taken_down`）、复检升至 🔴 或 ⚪ → 5 分钟内生成当日新修订版快照（`revision + 1`，只重排不重新取数）并刷新页面缓存。
- **风险变低与新上榜次日生效**：首份报告发布、申诉降档、失效后恢复 → 次日 `00:00 UTC` 快照生效。

## 2. 四大核心状态机

### 2.1 `bots.status`
```mermaid
stateDiagram-v2
    [*] --> pending: 投稿审核通过 / 批量导入
    pending --> active: 首份审计报告 published
    pending --> rejected: 审计判定不合格 (不满足 D39)
    active --> archived: 链接失效 (D22)
    archived --> pending: 链接恢复 (需重新审计，期间详情页仍显已失效)
    pending --> taken_down: Admin 下架
    active --> taken_down: Admin 下架
    archived --> taken_down: Admin 下架
    rejected --> taken_down: Admin 下架
    taken_down --> pending: Admin 恢复 (需重新审计)