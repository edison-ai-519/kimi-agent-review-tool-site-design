import { useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  FileText,
  HelpCircle,
  AlertCircle,
  History,
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
import { cn } from '@/lib/utils';
import {
  matchesReviewFilter,
  reviewStatusLabelMap,
  sortReviewItems,
  type ReviewListFilter,
  type ReviewListSort
} from '@/lib/review';
import type {
  ChatConfig,
  ChatMessage,
  KnowledgeDocument,
  ProjectInfo,
  ReviewHistoryEntry,
  ReviewItem,
  ReviewStatus
} from '@/types';

const stageLabelMap: Record<ProjectInfo['stage'], string> = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收'
};

const statusConfig: Record<
  ReviewStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: ReactElement;
  }
> = {
  draft: {
    label: reviewStatusLabelMap.draft,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    icon: <FileText className="h-4 w-4" />
  },
  pending: {
    label: reviewStatusLabelMap.pending,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    icon: <HelpCircle className="h-4 w-4" />
  },
  in_review: {
    label: reviewStatusLabelMap.in_review,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: <Clock3 className="h-4 w-4" />
  },
  needs_revision: {
    label: reviewStatusLabelMap.needs_revision,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: <RotateCcw className="h-4 w-4" />
  },
  reviewed: {
    label: reviewStatusLabelMap.reviewed,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  disputed: {
    label: reviewStatusLabelMap.disputed,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    icon: <AlertCircle className="h-4 w-4" />
  }
};

const filterOptions: { id: ReviewListFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待处理' },
  { id: 'needs_revision', label: '待补材料' },
  { id: 'disputed', label: '有争议' },
  { id: 'reviewed', label: '已评审' }
];

const sortOptions: { id: ReviewListSort; label: string }[] = [
  { id: 'priority', label: '优先级' },
  { id: 'confidence-desc', label: '置信度' },
  { id: 'score-desc', label: '评分' },
  { id: 'title-asc', label: '标题' }
];

const statusOptions: ReviewStatus[] = ['draft', 'pending', 'in_review', 'needs_revision', 'reviewed', 'disputed'];

function formatHistoryTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function matchesReviewSearch(item: ReviewItem, searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [item.title, item.description, item.comment ?? '', reviewStatusLabelMap[item.status]]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function ReviewHistorySection({
  entries,
  isLoading
}: {
  entries: ReviewHistoryEntry[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">评审历史</span>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">正在加载历史记录...</div>}

      {!isLoading && entries.length === 0 && <div className="text-sm text-muted-foreground">当前还没有历史记录。</div>}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border/50 bg-background/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{entry.action}</div>
                <span className="text-[11px] text-muted-foreground">{formatHistoryTime(entry.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.summary}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">记录人：{entry.actorName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentChat({
  messages,
  chatConfig,
  isPending,
  activeReviewItem,
  onSendMessage
}: {
  messages: ChatMessage[];
  chatConfig: ChatConfig;
  isPending: boolean;
  activeReviewItem?: ReviewItem | null;
  onSendMessage: (message: string) => void;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isPending) {
      return;
    }

    onSendMessage(input);
    setInput('');
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-blue-500" />
            评审助手
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {activeReviewItem ? `当前聚焦：${activeReviewItem.title}` : '当前为全局问答'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-2">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  )}
                >
                  {message.role === 'user' ? <Users className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                </div>
                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 text-sm',
                      message.role === 'user' ? 'rounded-br-md bg-blue-500 text-white' : 'rounded-bl-md bg-muted'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.role === 'assistant' && (
                    <RelatedDocumentsList documents={message.relatedDocuments} compact className="bg-background/90" />
                  )}
                </div>
              </motion.div>
            ))}

            {isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: dot * 0.15 }}
                        className="h-2 w-2 rounded-full bg-blue-500"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/50 p-4">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {chatConfig.quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInput(action)}
                className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs transition-colors hover:bg-muted/80"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="输入问题，例如：帮我概括技术风险"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" disabled={isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReviewItemCardProps {
  item: ReviewItem;
  isExpanded: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isHistoryLoading: boolean;
  historyEntries: ReviewHistoryEntry[];
  generatedReferences: KnowledgeDocument[];
  onToggle: () => void;
  onShowReasoning: () => void;
  onSave: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}

function ReviewItemCard({
  item,
  isExpanded,
  isSaving,
  isGenerating,
  isHistoryLoading,
  historyEntries,
  generatedReferences,
  onToggle,
  onShowReasoning,
  onSave,
  onGenerateComment
}: ReviewItemCardProps) {
  const status = statusConfig[item.status] ?? statusConfig.pending;
  const confidencePercent = Math.round(item.confidence * 100);
  const [draftScore, setDraftScore] = useState(item.score?.toString() ?? '');
  const [draftComment, setDraftComment] = useState(item.comment ?? '');
  const [draftStatus, setDraftStatus] = useState<ReviewStatus>(item.status);

  const normalizedScore = (() => {
    if (draftScore.trim() === '') {
      return undefined;
    }

    const parsedScore = Number(draftScore);
    return Number.isFinite(parsedScore) ? parsedScore : undefined;
  })();

  const handleGenerate = async () => {
    try {
      const generatedComment = await onGenerateComment(item);
      if (typeof generatedComment === 'string') {
        setDraftComment(generatedComment);
      }
    } catch {
      // Error state is handled upstream.
    }
  };

  const handleSave = async (statusOverride?: ReviewItem['status']) => {
    try {
      await onSave(item.id, normalizedScore, draftComment, statusOverride ?? draftStatus);
    } catch {
      // Error state is handled upstream.
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'cursor-pointer rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        isExpanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-border/50'
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg', status.bgColor)}>{status.icon}</div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold">{item.title}</h3>
              <Badge variant="secondary" className={cn('text-xs', status.color, status.bgColor)}>
                {status.label}
              </Badge>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">置信度</span>
                  <span
                    className={cn(
                      'font-medium',
                      confidencePercent >= 80 ? 'text-emerald-500' : confidencePercent >= 60 ? 'text-amber-500' : 'text-rose-500'
                    )}
                  >
                    {confidencePercent}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePercent}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={cn(
                      'h-full rounded-full',
                      confidencePercent >= 80 ? 'bg-emerald-500' : confidencePercent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                  />
                </div>
              </div>

              {item.score !== undefined && (
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {item.score}
                    <span className="text-sm text-muted-foreground">/{item.maxScore}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} className="text-muted-foreground">
            <ChevronRight className="h-5 w-5" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className="flex items-center gap-4">
                    <label className="min-w-[80px] text-sm font-medium">评分</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={item.maxScore}
                        value={draftScore}
                        onChange={(event) => setDraftScore(event.target.value)}
                        className="w-20 text-center"
                      />
                      <span className="text-muted-foreground">/ {item.maxScore} 分</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="min-w-[80px] text-sm font-medium">当前状态</label>
                    <select
                      value={draftStatus}
                      onChange={(event) => setDraftStatus(event.target.value as ReviewStatus)}
                      className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {statusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {reviewStatusLabelMap[statusOption]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {item.updatedAt && (
                    <div className="text-xs text-muted-foreground">最近更新：{formatHistoryTime(item.updatedAt)}</div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">评审意见</label>
                  <Textarea
                    placeholder="请输入评审意见，建议包含结论、依据和风险说明..."
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
                      <Sparkles className="h-4 w-4" />
                      {isGenerating ? '生成中...' : '生成辅助意见'}
                    </Button>
                  </div>
                </div>

                <RelatedDocumentsList documents={generatedReferences} title="本次生成参考资料" />

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowReasoning();
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                    查看依据
                  </Button>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => {
                        void handleSave();
                      }}
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => {
                        setDraftStatus('disputed');
                        void handleSave('disputed');
                      }}
                    >
                      标记争议
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={isSaving}
                      onClick={() => {
                        setDraftStatus('reviewed');
                        void handleSave('reviewed');
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isSaving ? '提交中...' : '提交'}
                    </Button>
                  </div>
                </div>

                <ReviewHistorySection entries={historyEntries} isLoading={isHistoryLoading} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ReviewWorkspaceProps {
  project: ProjectInfo;
  reviewItems: ReviewItem[];
  chatMessages: ChatMessage[];
  chatConfig: ChatConfig;
  reviewHistoryByItem: Record<string, ReviewHistoryEntry[]>;
  generatedReferencesByItem: Record<string, KnowledgeDocument[]>;
  isChatPending?: boolean;
  savingItemId?: string | null;
  generatingItemId?: string | null;
  historyLoadingItemId?: string | null;
  activeReviewItem?: ReviewItem | null;
  isReasoningVisible?: boolean;
  onShowReasoning?: (item: ReviewItem) => void;
  onLoadHistory?: (itemId: string) => Promise<unknown> | void;
  onActiveReviewItemChange?: (itemId: string | null) => void;
  onSendChat: (message: string, itemId?: string) => void;
  onSaveReviewItem: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}

export function ReviewWorkspace({
  project,
  reviewItems,
  chatMessages,
  chatConfig,
  reviewHistoryByItem,
  generatedReferencesByItem,
  isChatPending = false,
  savingItemId = null,
  generatingItemId = null,
  historyLoadingItemId = null,
  activeReviewItem = null,
  isReasoningVisible = false,
  onShowReasoning,
  onLoadHistory,
  onActiveReviewItemChange,
  onSendChat,
  onSaveReviewItem,
  onGenerateComment
}: ReviewWorkspaceProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReviewListFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewListSort>('priority');
  const [isAssistantVisible, setIsAssistantVisible] = useState(true);
  const completedCount = reviewItems.filter((item) => item.status === 'reviewed').length;
  const progressPercent = reviewItems.length === 0 ? 0 : (completedCount / reviewItems.length) * 100;
  const filteredReviewItems = sortReviewItems(
    reviewItems.filter((item) => matchesReviewFilter(item, activeFilter) && matchesReviewSearch(item, searchQuery)),
    sortBy
  );
  const visibleExpandedItem = filteredReviewItems.some((item) => item.id === expandedItem) ? expandedItem : null;
  const shouldShowAssistant = isAssistantVisible && !isReasoningVisible;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex h-full min-w-0 flex-col overflow-hidden"
    >
      <Card className="mb-4 shrink-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 text-xl font-bold">{project.name}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {project.applicant}
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  {project.budget}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {project.duration}
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {project.field}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {stageLabelMap[project.stage]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className={cn('grid flex-1 gap-4 overflow-hidden', shouldShowAssistant ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1')}>
        <div className="min-w-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pb-4 pr-4">
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    评审要点清单
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>进度</span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span>
                      {completedCount}/{reviewItems.length}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="搜索评审项标题、说明或评审意见"
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as ReviewListSort)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          按{option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden items-center justify-end lg:flex">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsAssistantVisible((current) => !current)}
                    >
                      {shouldShowAssistant ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                      {shouldShowAssistant ? '收起助手' : '显示助手'}
                    </Button>
                  </div>
                </div>

                {isReasoningVisible && (
                  <div className="hidden rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground lg:block">
                    推理依据面板已打开，评审助手已自动收起。需要继续追问时，可以先关闭推理面板，或使用右下角悬浮助手。
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setActiveFilter(option.id)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition-colors',
                        activeFilter === option.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                          : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="ml-auto text-xs text-muted-foreground">当前显示 {filteredReviewItems.length} / {reviewItems.length}</div>
                </div>
              </div>

              {filteredReviewItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  当前筛选条件下没有匹配的评审项。
                </div>
              )}

              {filteredReviewItems.map((item) => (
                <ReviewItemCard
                  key={`${item.id}:${item.score ?? 'none'}:${item.comment ?? 'empty'}:${item.status}:${item.updatedAt ?? 'seed'}`}
                  item={item}
                  isExpanded={visibleExpandedItem === item.id}
                  isSaving={savingItemId === item.id}
                  isGenerating={generatingItemId === item.id}
                  isHistoryLoading={historyLoadingItemId === item.id}
                  historyEntries={reviewHistoryByItem[item.id] ?? []}
                  generatedReferences={generatedReferencesByItem[item.id] ?? []}
                  onToggle={() =>
                    setExpandedItem((current) => {
                      const nextExpandedItemId = current === item.id ? null : item.id;
                      if (nextExpandedItemId) {
                        void onLoadHistory?.(item.id);
                      }
                      onActiveReviewItemChange?.(nextExpandedItemId);
                      return nextExpandedItemId;
                    })
                  }
                  onShowReasoning={() => onShowReasoning?.(item)}
                  onSave={onSaveReviewItem}
                  onGenerateComment={onGenerateComment}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {shouldShowAssistant && (
          <div className="hidden min-w-0 lg:block">
          <AgentChat
            messages={chatMessages}
            chatConfig={chatConfig}
            isPending={isChatPending}
            activeReviewItem={activeReviewItem}
            onSendMessage={(message) => onSendChat(message, activeReviewItem?.id)}
          />
          </div>
        )}
      </div>
    </motion.div>
  );
}
