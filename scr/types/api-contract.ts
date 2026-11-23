import { z } from 'zod';

// ==================== 基础共享类型 ====================

export const LocaleSchema = z.enum(['en', 'zh']);
export type Locale = z.infer<typeof LocaleSchema>;

export const SafetyLevelSchema = z.enum(['green', 'yellow', 'gray', 'red']);
export type SafetyLevel = z.infer<typeof SafetyLevelSchema>;

export const BoardTypeSchema = z.enum(['all_time', 'new', 'trending', 'trending_simple']);
export type BoardType = z.infer<typeof BoardTypeSchema>;

export const RuleHitSchema = z.object({
  ruleId: z.string(), // e.g. "R-01", "Y-02", "G-01"
  evidenceEn: z.string(),
  evidenceZh: z.string().nullable(),
});
export type RuleHit = z.infer<typeof RuleHitSchema>;

// ==================== 1. 榜单查询 GET /api/v1/leaderboard ====================

export const LeaderboardQuerySchema = z.object({
  board: BoardTypeSchema.default('all_time'),
  locale: LocaleSchema.default('en'),
  connectors: z.array(z.string()).optional(), // 多选 AND 筛选
  onlyLowRisk: z.coerce.boolean().optional(),
  hideInsufficient: z.coerce.boolean().optional(),
  hasRoutine: z.coerce.boolean().optional(),
  category: z.string().optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
});

export interface LeaderboardItemDTO {
  botId: string;
  slug: string;
  name: string;
  officialUrl: string;
  summary: string;
  isSummaryMachineTranslated: boolean;
  rank: number | null; // 🔴 为 null
  rankDelta7d: number | null;
  isNew: boolean;
  displayScore: number;
  safetyLevel: SafetyLevel;
  subTags: string[];
  connectors: { key: string; name: string; icon: string }[];
  githubCitations: number;
  xCitations: number;
  newCitations7d?: number;
  weeklyGrowthRate?: number | null; // 仅正式 trending 有值
  rawUpvotes: number;
  userUpvoted: boolean;
  userBookmarked: boolean;
}

export interface LeaderboardResponseDTO {
  snapshotDate: string; // YYYY-MM-DD
  revision: number;
  updatedAtUtc: string; // ISO string
  boardType: BoardType;
  xDataCutoffDate: string | null;
  items: LeaderboardItemDTO[];
  collapsedRedItems: LeaderboardItemDTO[]; // 统一折叠在底部，仅 onlyLowRisk=false 时返回
  total: number;
  hasMore: boolean;
}

// ==================== 2. 详情页 GET /api/v1/bots/[slug] ====================
// 严禁包含 rawStorageKey 或任何配置原文

export interface BotDetailDTO {
  id: string;
  slug: string;
  name: string;
  officialUrl: string; // status=archived 时前端隐藏按钮，后端保留记录
  status: 'active' | 'archived';
  archivedAt: string | null;
  authorHandle: string | null;
  categories: { key: string; name: string }[];
  rankings: { allTime: number | null; new: number | null; trending: number | null; bestHistoricalRank: number | null };
  summary: string;
  isSummaryMachineTranslated: boolean;
  rawUpvotes: number;
  userUpvoted: boolean;
  userBookmarked: boolean;
  safetyCard: {
    safetyLevel: SafetyLevel;
    subTags: string[];
    auditMode: 'manual' | 'auto';
    scannedAt: string;
    zhProofread: boolean;
    fallbackToEnglish: boolean; // locale==='zh' && !zhProofread
    ruleHits: { ruleId: string; evidence: string }[];
    permissions: { connectorKey: string; name: string; scope: 'read' | 'write' | 'send' }[];
  };
  citations: {
    githubCount: number;
    xCount: number;
    xDataCutoffDate: string | null;
    items: {
      sourceType: 'github' | 'x';
      sourceUrl: string;
      citerHandle: string;
      citedAt: string;
      isManual: boolean;
    }[];
  };
  appeals: {
    canAppeal: boolean;
    cooldownUntil: string | null;
    activeAppeal: { id: string; openedAt: string; dueAt: string } | null;
    publicHistory: {
      id: string;
      status: 'upheld' | 'revised';
      resolution: string;
      resolvedAt: string;
    }[];
  };
}

// ==================== 3. 出站埋点 POST /api/v1/track/outbound ====================

export const OutboundTrackSchema = z.object({
  botId: z.string().min(1),
  sourcePage: z.enum(['board', 'detail']),
  boardType: BoardTypeSchema.optional(),
  rankPosition: z.number().int().positive().nullable().optional(),
  navSource: z.enum(['board', 'search', 'filter', 'external']),
  locale: LocaleSchema,
  sessionId: z.string().max(128).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  isWebdriver: z.boolean().optional(),
});
export type OutboundTrackPayload = z.infer<typeof OutboundTrackSchema>;

// ==================== 4. 投稿 POST /api/v1/submissions ====================

export const CreateSubmissionSchema = z.object({
  url: z.string().url().refine((u) => /^https?:\/\/(www\.)?x\.ai\/bot\//i.test(u), {
    message: 'Only x.ai/bot/ URLs are accepted',
  }),
  reason: z.string().max(200).optional(),
  citationUrls: z.array(z.string().url()).max(5).optional(),
});

export interface CreateSubmissionResponseDTO {
  result: 'accepted' | 'duplicate' | 'rejected';
  existingBotSlug?: string;
  submissionId?: string;
  message: string;
}

// ==================== 5. 申诉 POST /api/v1/appeals ====================

export const CreateAppealSchema = z.object({
  botId: z.string().min(1),
  ruleIds: z.array(z.string()).min(1),
  reason: z.string().min(10).max(2000),
  contactEmail: z.string().email().optional().or(z.literal('')),
  attachments: z.array(z.string().url()).max(5).optional(),
});

// ==================== 6. 后台审核提交 POST /api/admin/audit/[reportId] ====================

export const AdminAuditSubmitSchema = z.object({
  stage: z.enum(['initial_a', 'review_b', 'proofread_zh']),
  safetyLevel: SafetyLevelSchema,
  subTags: z.array(z.string()),
  ruleHits: z.array(RuleHitSchema),
  zhProofread: z.boolean(),
  publishNow: z.boolean().optional(),
  note: z.string().max(1000).optional(),
});

// ==================== 7. 后台申诉结案 POST /api/admin/appeals/[id]/resolve ====================

export const AdminAppealResolveSchema = z.object({
  decision: z.enum(['upheld', 'revised']),
  newSafetyLevel: SafetyLevelSchema.optional(), // decision === 'revised' 时必填
  newRuleHits: z.array(RuleHitSchema).optional(),
  resolutionEn: z.string().min(5),
  resolutionZh: z.string().min(5), // 强制双语必填
});

// ==================== 8. 后台批量导入 POST /api/admin/import ====================

export const ImportBotRowSchema = z.object({
  official_url: z.string().url(),
  name: z.string().min(1).max(120),
  summary_en: z.string().min(1).max(140),
  summary_zh: z.string().max(200).optional(),
  author_handle: z.string().optional(),
  author_github: z.string().optional(),
  connectors: z.array(z.string()).min(1),
  has_routine: z.boolean(),
  categories: z.array(z.string()).optional(),
  source: z.enum(['official_marketplace', 'github', 'x', 'submission']),
  citations: z.array(z.string().url()).optional(),
});