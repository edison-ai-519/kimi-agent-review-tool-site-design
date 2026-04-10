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
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Users
} from 'lucide-react';
import { RelatedDocumentsList } from '@/components/chat/RelatedDocumentsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { getReviewWorkspacePermissions, type ReviewWorkspacePermissions } from '@/lib/permissions';
import { buildStageRecommendation, getReviewStageConfig, getReviewStageStatusLabel, getStageAwareStatusLabel, reviewStageLabelMap } from '@/lib/review-stage';
import { matchesReviewFilter, sortReviewItems, type ReviewListFilter, type ReviewListSort } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { ChatConfig, ChatMessage, KnowledgeDocument, ProjectInfo, ReviewHistoryEntry, ReviewItem, ReviewStageOverview, ReviewStatus, UserRole } from '@/types';

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

function AgentChat({
  messages,
  chatConfig,
  isPending,
  activeReviewItem,
  isDisabled,
  disabledMessage,
  onSendMessage
}: {
  messages: ChatMessage[];
  chatConfig: ChatConfig;
  isPending: boolean;
  activeReviewItem?: ReviewItem | null;
  isDisabled: boolean;
  disabledMessage?: string;
  onSendMessage: (message: string) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-blue-500" />评审助手</CardTitle>
        <div className="text-xs text-muted-foreground">{activeReviewItem ? `当前聚焦：${activeReviewItem.title}` : '当前为全局问答'}</div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-2">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-500')}>
                  {message.role === 'user' ? <Users className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                </div>
                <div className="max-w-[80%]">
                  <div className={cn('rounded-2xl px-4 py-2 text-sm', message.role === 'user' ? 'rounded-br-md bg-blue-500 text-white' : 'rounded-bl-md bg-muted')}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.role === 'assistant' && <RelatedDocumentsList documents={message.relatedDocuments} compact className="bg-background/90" />}
                </div>
              </div>
            ))}
            {isPending && <div className="text-sm text-muted-foreground">评审助手正在整理答案...</div>}
          </div>
        </ScrollArea>
        <div className="border-t border-border/50 p-4">
          {isDisabled && disabledMessage && <div className="mb-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{disabledMessage}</div>}
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {chatConfig.quickActions.map((action) => (
              <button key={action} onClick={() => setInput(action)} disabled={isDisabled} className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs transition-colors hover:bg-muted/80">{action}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入当前阶段问题" disabled={isDisabled} />
            <Button size="icon" disabled={isDisabled || isPending || !input.trim()} onClick={() => { if (!input.trim()) return; onSendMessage(input); setInput(''); }}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
            </div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
          </div>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}><ChevronRight className="h-5 w-5 text-muted-foreground" /></motion.div>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 pb-4">
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{permissions.summary}</div>
              <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">评分</div>
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
  chatMessages,
  chatConfig,
  reviewHistoryByItem,
  generatedReferencesByItem,
  stageOverview = [],
  userRole = 'expert',
  permissions,
  isChatPending = false,
  savingItemId = null,
  generatingItemId = null,
  historyLoadingItemId = null,
  activeReviewItem = null,
  isReasoningVisible = false,
  autoHideAssistantOnReasoning = true,
  onShowReasoning,
  onLoadHistory,
  onActiveReviewItemChange,
  onSendChat,
  onSaveReviewItem,
  onGenerateComment
}: {
  project: ProjectInfo;
  reviewItems: ReviewItem[];
  chatMessages: ChatMessage[];
  chatConfig: ChatConfig;
  reviewHistoryByItem: Record<string, ReviewHistoryEntry[]>;
  generatedReferencesByItem: Record<string, KnowledgeDocument[]>;
  stageOverview?: ReviewStageOverview[];
  userRole?: UserRole;
  permissions?: ReviewWorkspacePermissions;
  isChatPending?: boolean;
  savingItemId?: string | null;
  generatingItemId?: string | null;
  historyLoadingItemId?: string | null;
  activeReviewItem?: ReviewItem | null;
  isReasoningVisible?: boolean;
  autoHideAssistantOnReasoning?: boolean;
  onShowReasoning?: (item: ReviewItem) => void;
  onLoadHistory?: (itemId: string) => Promise<unknown> | void;
  onActiveReviewItemChange?: (itemId: string | null) => void;
  onSendChat: (message: string, itemId?: string) => void;
  onSaveReviewItem: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReviewListFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewListSort>('priority');
  const [assistantVisible, setAssistantVisible] = useState(true);
  const resolvedPermissions = permissions ?? getReviewWorkspacePermissions(userRole);
  const stageConfig = getReviewStageConfig(project.stage);
  const completedCount = reviewItems.filter((item) => item.status === 'reviewed').length;
  const progressPercent = reviewItems.length === 0 ? 0 : (completedCount / reviewItems.length) * 100;
  const filteredItems = useMemo(() => sortReviewItems(reviewItems.filter((item) => matchesReviewFilter(item, filter) && matchesReviewSearch(item, search)), sortBy), [filter, reviewItems, search, sortBy]);
  const shouldShowAssistant = assistantVisible && (!isReasoningVisible || !autoHideAssistantOnReasoning);

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

      <div className={cn('grid flex-1 gap-4 overflow-hidden', shouldShowAssistant ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1')}>
        <div className="min-w-0 overflow-hidden">
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
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索评审项标题、说明或意见" className="pl-9" /></div>
                  <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as ReviewListSort)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
                  <div className="hidden justify-end lg:flex"><Button variant="outline" size="sm" className="gap-2" onClick={() => setAssistantVisible((current) => !current)}>{shouldShowAssistant ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}{shouldShowAssistant ? '收起助手' : '显示助手'}</Button></div>
                </div>
                {isReasoningVisible && autoHideAssistantOnReasoning && <div className="mt-3 hidden rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground lg:block">推理依据面板已打开，评审助手已自动收起。</div>}
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

        {shouldShowAssistant && <div className="hidden min-w-0 lg:block"><AgentChat messages={chatMessages} chatConfig={chatConfig} isPending={isChatPending} activeReviewItem={activeReviewItem} isDisabled={!resolvedPermissions.canUseChat} disabledMessage="当前角色不允许直接向评审助手发起对话，你仍然可以查看历史消息和引用资料。" onSendMessage={(message) => onSendChat(message, activeReviewItem?.id)} /></div>}
      </div>
    </motion.div>
  );
}
