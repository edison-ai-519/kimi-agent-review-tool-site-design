import { useMemo, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  HelpCircle,
  History,
  Lock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { RelatedDocumentsList } from '@/components/chat/RelatedDocumentsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { getReviewWorkspacePermissions, type ReviewWorkspacePermissions } from '@/lib/permissions';
import { buildStageRecommendation, getReviewStageConfig, getReviewStageStatusLabel, getStageAwareStatusLabel, reviewStageLabelMap } from '@/lib/review-stage';
import { matchesReviewFilter, sortReviewItems, type ReviewListFilter, type ReviewListSort } from '@/lib/review';
import { cn } from '@/lib/utils';
import type {
  KnowledgeDocument,
  ProjectInfo,
  ReviewHistoryEntry,
  ReviewItem,
  ReviewItemOntologyValidation,
  ReviewStageOverview,
  ReviewStatus,
  UserRole
} from '@/types';

const statusConfig = {
  draft: { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: <FileText className="h-4 w-4" /> },
  pending: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: <HelpCircle className="h-4 w-4" /> },
  in_review: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Clock3 className="h-4 w-4" /> },
  needs_revision: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: <RotateCcw className="h-4 w-4" /> },
  reviewed: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="h-4 w-4" /> },
  disputed: { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: <AlertCircle className="h-4 w-4" /> }
} satisfies Record<ReviewStatus, { color: string; bg: string; icon: ReactElement }>;

const filterOptions: { id: ReviewListFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待处理' },
  { id: 'needs_revision', label: '待补材料' },
  { id: 'disputed', label: '有争议' },
  { id: 'reviewed', label: '已完成' }
];

const sortOptions: { id: ReviewListSort; label: string }[] = [
  { id: 'priority', label: '按优先级' },
  { id: 'confidence-desc', label: '按置信度' },
  { id: 'score-desc', label: '按评分' },
  { id: 'title-asc', label: '按标题' }
];

const roleLabels: Record<UserRole, string> = {
  expert: '评审专家',
  applicant: '申报方',
  admin: '系统管理员'
};

const statusOptions: ReviewStatus[] = ['draft', 'pending', 'in_review', 'needs_revision', 'reviewed', 'disputed'];

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function compactText(value: string | undefined, maxLength = 120) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function matchesReviewSearch(item: ReviewItem, search: string) {
  const query = search.trim().toLowerCase();
  return !query || [item.title, item.description, item.comment ?? ''].join(' ').toLowerCase().includes(query);
}

function HistorySection({ entries, isLoading }: { entries: ReviewHistoryEntry[]; isLoading: boolean }) {
  if (isLoading) return <div className="text-sm text-muted-foreground">正在加载评审历史...</div>;
  if (entries.length === 0) return <div className="text-sm text-muted-foreground">当前还没有历史记录。</div>;
  return (
    <div className="space-y-3">
      {entries.slice(0, 5).map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border/50 bg-background/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">{entry.action}</div>
            <div className="text-[11px] text-muted-foreground">{formatTime(entry.createdAt)}</div>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.summary}</div>
        </div>
      ))}
    </div>
  );
}

const ontologyValidationConfig = {
  pass: {
    label: '本体校验通过',
    badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    panelClassName: 'border-emerald-500/20 bg-emerald-500/5'
  },
  warn: {
    label: '本体待补充',
    badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    panelClassName: 'border-amber-500/20 bg-amber-500/5'
  },
  fail: {
    label: '本体高风险',
    badgeClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-700',
    panelClassName: 'border-rose-500/20 bg-rose-500/5'
  }
} as const;

const llmParticipationBadgeClassName = 'border-blue-500/30 bg-blue-500/10 text-blue-700';
const aiScoreBadgeClassName = 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700';

function OntologyValidationPanel({ validation }: { validation?: ReviewItemOntologyValidation }) {
  if (!validation) return null;
  const config = ontologyValidationConfig[validation.status];

  return (
    <div className={cn('rounded-xl border p-3', config.panelClassName)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', config.badgeClassName)}>
          {config.label}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          本体版本 {validation.ontologyVersion}
        </Badge>
      </div>
      <div className="mt-3 text-sm font-medium">本体规则校验</div>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{validation.summary}</div>

      {validation.matchedConcepts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {validation.matchedConcepts.map((concept) => (
            <Badge key={concept} variant="secondary" className="bg-background/80 text-xs">
              {concept}
            </Badge>
          ))}
        </div>
      )}

      {validation.evidenceChecks.length > 0 && (
        <div className="mt-4 grid gap-2">
          {validation.evidenceChecks.map((check) => (
            <div key={check.id} className="rounded-lg border border-border/50 bg-background/80 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium">{check.label}</div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    check.matched
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                  )}
                >
                  {check.matched ? '已命中' : '未命中'}
                </Badge>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {check.matched
                  ? `命中来源：${
                      check.matchedIn === 'both'
                        ? '评审意见 + 知识库'
                        : check.matchedIn === 'comment'
                          ? '评审意见'
                          : '知识库'
                    }`
                  : '当前评审意见和检索资料都没有覆盖这条证据要求。'}
              </div>
              {check.matchedTerms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {check.matchedTerms.slice(0, 4).map((term) => (
                    <span key={term} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {validation.findings.length > 0 && (
        <div className="mt-4 space-y-2">
          {validation.findings.map((finding) => (
            <div key={finding.id} className="rounded-lg border border-border/50 bg-background/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', ontologyValidationConfig[finding.severity].badgeClassName)}
                >
                  {finding.severityLabel}
                </Badge>
                <div className="text-sm font-medium">{finding.title}</div>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.message}</div>
              {finding.suggestion && (
                <div className="mt-2 text-xs leading-relaxed text-foreground/80">建议动作：{finding.suggestion}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LlmParticipationPanel({ participation }: { participation?: ReviewItem['llmParticipation'] }) {
  if (!participation) return null;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', llmParticipationBadgeClassName)}>
          LLM 已参与评审
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {participation.provider} / {participation.model}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {participation.useCase}
        </Badge>
      </div>
      <div className="mt-3 text-sm font-medium">LLM 评审建议</div>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {participation.summary}
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">生成时间：{formatTime(participation.createdAt)}</div>
      <RelatedDocumentsList documents={participation.relatedDocuments} title="LLM 参考资料" />
    </div>
  );
}

function AiScorePanel({ aiScore }: { aiScore?: ReviewItem['aiScore'] }) {
  if (!aiScore) return null;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', aiScoreBadgeClassName)}>
          AI 评分 {aiScore.score}/{aiScore.maxScore}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          置信度 {Math.round(aiScore.confidence * 100)}%
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {aiScore.provider} / {aiScore.model}
        </Badge>
      </div>
      <div className="mt-3 text-sm font-medium">AI 评分理由</div>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{aiScore.rationale}</div>
      {(aiScore.relatedDocumentIds ?? []).length > 0 && (
        <div className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          引用材料 ID：{(aiScore.relatedDocumentIds ?? []).slice(0, 5).join('、')}
        </div>
      )}
      <div className="mt-2 text-[11px] text-muted-foreground">生成时间：{formatTime(aiScore.createdAt)}</div>
    </div>
  );
}

function StageOverviewPanel({ currentStage, stageOverview }: { currentStage: ProjectInfo['stage']; stageOverview: ReviewStageOverview[] }) {
  const current = stageOverview.find((item) => item.stage === currentStage);
  if (!current && stageOverview.length === 0) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {current && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-background/80 text-xs">阶段状态：{getReviewStageStatusLabel(current.status)}</Badge>
            <Badge variant="secondary" className="text-xs">完成度 {current.completionPercent}%</Badge>
          </div>
          <div className="text-base font-semibold">阶段结论建议</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{buildStageRecommendation(current)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-border/50 bg-background/80 p-3"><div className="text-xs text-muted-foreground">已完成</div><div className="mt-1 text-lg font-semibold text-emerald-600">{current.completed}</div></div>
            <div className="rounded-lg border border-border/50 bg-background/80 p-3"><div className="text-xs text-muted-foreground">待处理</div><div className="mt-1 text-lg font-semibold text-blue-600">{current.pending}</div></div>
            <div className="rounded-lg border border-border/50 bg-background/80 p-3"><div className="text-xs text-muted-foreground">待补材料</div><div className="mt-1 text-lg font-semibold text-amber-600">{current.needsRevision}</div></div>
            <div className="rounded-lg border border-border/50 bg-background/80 p-3"><div className="text-xs text-muted-foreground">争议项</div><div className="mt-1 text-lg font-semibold text-rose-600">{current.disputed}</div></div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="text-base font-semibold">全阶段流转</div>
        <div className="mt-3 space-y-3">
          {stageOverview.map((item) => (
            <div key={item.stage} className="rounded-lg border border-border/50 bg-background/80 p-3">
              <div className="flex items-start gap-3">
                <div className={cn('mt-1 h-2.5 w-2.5 rounded-full', item.status === 'completed' ? 'bg-emerald-500' : item.status === 'blocked' ? 'bg-amber-500' : item.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{reviewStageLabelMap[item.stage]}</div>
                    <Badge variant="secondary" className="text-[10px]">{getReviewStageStatusLabel(item.status)}</Badge>
                    {!item.canEnter && item.stage !== currentStage && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">完成 {item.completed}/{item.total}，待处理 {item.pending}，待补材料 {item.needsRevision}，争议 {item.disputed}</div>
                  {item.blockedReason && item.stage !== currentStage && <div className="mt-2 text-[11px] leading-relaxed text-amber-600">{item.blockedReason}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  item,
  stage,
  permissions,
  expanded,
  isSaving,
  isGenerating,
  isHistoryLoading,
  historyEntries,
  generatedReferences,
  onToggle,
  onShowReasoning,
  onSave,
  onGenerateComment
}: {
  item: ReviewItem;
  stage: ProjectInfo['stage'];
  permissions: ReviewWorkspacePermissions;
  expanded: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isHistoryLoading: boolean;
  historyEntries: ReviewHistoryEntry[];
  generatedReferences: KnowledgeDocument[];
  onToggle: () => void;
  onShowReasoning: () => void;
  onSave: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}) {
  const config = getReviewStageConfig(stage);
  const status = statusConfig[item.status];
  const ontologyValidation = item.ontologyValidation;
  const llmParticipation = item.llmParticipation;
  const aiScore = item.aiScore;
  const [draftScore, setDraftScore] = useState(item.score?.toString() ?? '');
  const [draftComment, setDraftComment] = useState(item.comment ?? '');
  const [draftStatus, setDraftStatus] = useState<ReviewStatus>(item.status);
  const score = draftScore.trim() ? Number(draftScore) : undefined;

  return (
    <motion.div layout className={cn('rounded-xl border transition-all', expanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-border/50')}>
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', status.bg)}>{status.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div className="font-semibold">{item.title}</div>
              <Badge variant="secondary" className={cn('text-xs', status.color, status.bg)}>{getStageAwareStatusLabel(stage, item.status)}</Badge>
              {ontologyValidation && (
                <Badge variant="outline" className={cn('text-xs', ontologyValidationConfig[ontologyValidation.status].badgeClassName)}>
                  {ontologyValidationConfig[ontologyValidation.status].label}
                </Badge>
              )}
              {llmParticipation && (
                <Badge variant="outline" className={cn('text-xs', llmParticipationBadgeClassName)}>
                  LLM 已参与
                </Badge>
              )}
              {aiScore && (
                <Badge variant="outline" className={cn('text-xs', aiScoreBadgeClassName)}>
                  AI评分 {aiScore.score}/{aiScore.maxScore}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
            {ontologyValidation && (
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{ontologyValidation.summary}</div>
            )}
            {llmParticipation && (
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {compactText(llmParticipation.summary, 140)}
              </div>
            )}
            {aiScore && (
              <div className="mt-2 text-xs leading-relaxed text-cyan-700">
                AI评分理由：{compactText(aiScore.rationale, 140)}
              </div>
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}><ChevronRight className="h-5 w-5 text-muted-foreground" /></motion.div>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 pb-4">
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{permissions.summary}</div>
              <OntologyValidationPanel validation={ontologyValidation} />
              <AiScorePanel aiScore={aiScore} />
              <LlmParticipationPanel participation={llmParticipation} />
              <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">专家评分</div>
                  <Input type="number" min={0} max={item.maxScore} value={draftScore} onChange={(event) => setDraftScore(event.target.value)} className="w-24 text-center" disabled={!permissions.canEditScore} />
                  <div className="text-sm text-muted-foreground">/ {item.maxScore}</div>
                </div>
                <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as ReviewStatus)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={!permissions.canChangeStatus}>
                  {statusOptions.map((statusOption) => <option key={statusOption} value={statusOption}>{getStageAwareStatusLabel(stage, statusOption)}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">评审意见</div>
                <Textarea value={draftComment} onChange={(event) => setDraftComment(event.target.value)} className="min-h-[100px] resize-none" disabled={!permissions.canEditComment} />
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" disabled={isGenerating || !permissions.canGenerateComment} onClick={async () => { const nextComment = await onGenerateComment(item); if (typeof nextComment === 'string') setDraftComment(nextComment); }}>
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? '生成中...' : '生成辅助意见'}
                  </Button>
                </div>
              </div>
              <RelatedDocumentsList documents={generatedReferences} title="本次生成参考资料" />
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled={!permissions.canViewReasoning} onClick={onShowReasoning}><BarChart3 className="h-4 w-4" />查看依据</Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={isSaving || !permissions.canSaveDraft} onClick={() => { void onSave(item.id, score, draftComment, draftStatus); }}>{isSaving ? '保存中...' : config.saveLabel}</Button>
                  <Button variant="outline" size="sm" disabled={isSaving || !permissions.canMarkDisputed} onClick={() => { setDraftStatus(config.secondaryActionStatus); void onSave(item.id, score, draftComment, config.secondaryActionStatus); }}>{config.secondaryActionLabel}</Button>
                  <Button size="sm" className="gap-2" disabled={isSaving || !permissions.canSubmitReview} onClick={() => { setDraftStatus('reviewed'); void onSave(item.id, score, draftComment, 'reviewed'); }}><CheckCircle2 className="h-4 w-4" />{isSaving ? '提交中...' : config.submitLabel}</Button>
                </div>
              </div>
              {!permissions.canEditComment && !permissions.canEditScore && !permissions.canChangeStatus && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">当前角色下此评审项为只读状态。</div>}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4 text-blue-500" />评审历史</div>
                <HistorySection entries={historyEntries} isLoading={isHistoryLoading} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ReviewWorkspace({
  project,
  reviewItems,
  reviewHistoryByItem,
  generatedReferencesByItem,
  stageOverview = [],
  userRole = 'expert',
  permissions,
  savingItemId = null,
  generatingItemId = null,
  historyLoadingItemId = null,
  isReasoningVisible = false,
  onShowReasoning,
  onLoadHistory,
  onActiveReviewItemChange,
  onSaveReviewItem,
  onGenerateComment
}: {
  project: ProjectInfo;
  reviewItems: ReviewItem[];
  reviewHistoryByItem: Record<string, ReviewHistoryEntry[]>;
  generatedReferencesByItem: Record<string, KnowledgeDocument[]>;
  stageOverview?: ReviewStageOverview[];
  userRole?: UserRole;
  permissions?: ReviewWorkspacePermissions;
  savingItemId?: string | null;
  generatingItemId?: string | null;
  historyLoadingItemId?: string | null;
  isReasoningVisible?: boolean;
  onShowReasoning?: (item: ReviewItem) => void;
  onLoadHistory?: (itemId: string) => Promise<unknown> | void;
  onActiveReviewItemChange?: (itemId: string | null) => void;
  onSaveReviewItem: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReviewListFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewListSort>('priority');
  const resolvedPermissions = permissions ?? getReviewWorkspacePermissions(userRole);
  const stageConfig = getReviewStageConfig(project.stage);
  const completedCount = reviewItems.filter((item) => item.status === 'reviewed').length;
  const progressPercent = reviewItems.length === 0 ? 0 : (completedCount / reviewItems.length) * 100;
  const filteredItems = useMemo(() => sortReviewItems(reviewItems.filter((item) => matchesReviewFilter(item, filter) && matchesReviewSearch(item, search)), sortBy), [filter, reviewItems, search, sortBy]);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex h-full min-w-0 flex-col overflow-hidden">
      <Card className="mb-4 shrink-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-xl font-bold">{project.name}</div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{project.applicant}</div>
                <div className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" />{project.budget}</div>
                <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{project.duration}</div>
                <div className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{project.field}</div>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">{reviewStageLabelMap[project.stage]}</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background/80 text-xs">当前视角：{roleLabels[userRole]}</Badge>
                <Badge variant="outline" className="bg-background/80 text-xs">{stageConfig.label}</Badge>
              </div>
              <div className="text-base font-semibold">{stageConfig.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{stageConfig.description}</div>
              <div className="mt-3 flex flex-wrap gap-2">{stageConfig.focusAreas.map((focus) => <Badge key={focus} variant="secondary" className="bg-background/80 text-xs">{focus}</Badge>)}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="text-sm font-medium">{resolvedPermissions.summary}</div>
              <div className="mt-3 flex flex-wrap gap-2">{stageConfig.workflowSteps.map((step, index) => <div key={step} className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">{index + 1}. {step}</div>)}</div>
              <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{stageConfig.assistantHint}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-w-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 pb-4 pr-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-blue-500" />评审要点清单</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{stageConfig.progressLabel}</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} /></div>
                  <span>{completedCount}/{reviewItems.length}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索评审项标题、说明或意见" className="pl-9" /></div>
                <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as ReviewListSort)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
              </div>
              {isReasoningVisible && (
                <div className="mt-3 hidden rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground lg:block">
                  右侧推理依据面板已打开，主工作区会保持完整宽度；聊天请使用右下角悬浮评审助手。
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {filterOptions.map((option) => <button key={option.id} onClick={() => setFilter(option.id)} className={cn('rounded-full border px-3 py-1.5 text-xs transition-colors', filter === option.id ? 'border-blue-500 bg-blue-500/10 text-blue-600' : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50')}>{option.label}</button>)}
                <div className="ml-auto text-xs text-muted-foreground">当前显示 {filteredItems.length} / {reviewItems.length}</div>
              </div>
            </div>

            {filteredItems.length === 0 && <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">当前筛选条件下没有匹配的评审项。</div>}

            {filteredItems.map((item) => (
              <ReviewCard
                key={`${item.id}:${item.status}:${item.updatedAt ?? 'seed'}`}
                item={item}
                stage={project.stage}
                permissions={resolvedPermissions}
                expanded={expandedItem === item.id}
                isSaving={savingItemId === item.id}
                isGenerating={generatingItemId === item.id}
                isHistoryLoading={historyLoadingItemId === item.id}
                historyEntries={reviewHistoryByItem[item.id] ?? []}
                generatedReferences={generatedReferencesByItem[item.id] ?? []}
                onToggle={() => setExpandedItem((current) => { const next = current === item.id ? null : item.id; if (next) void onLoadHistory?.(item.id); onActiveReviewItemChange?.(next); return next; })}
                onShowReasoning={() => onShowReasoning?.(item)}
                onSave={onSaveReviewItem}
                onGenerateComment={onGenerateComment}
              />
            ))}

            <StageOverviewPanel currentStage={project.stage} stageOverview={stageOverview} />
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
