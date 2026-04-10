import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, escapeRegExp } from '@/lib/utils';
import { CheckCircle2, ChevronRight, FileText, GitBranch, Lightbulb, Quote, Target, X } from 'lucide-react';
import type { ReasoningChain, ReasoningData, ReviewItem } from '@/types';

function MobileReasoningFlow({ chain }: { chain: ReasoningChain }) {
  return (
    <div className="py-4">
      <div className="space-y-4">
        {chain.nodes.map((node, index) => {
          const colors = {
            input: 'bg-blue-500',
            ontology: 'bg-orange-500',
            rule: 'bg-purple-500',
            conclusion: 'bg-green-500'
          } satisfies Record<ReasoningChain['nodes'][number]['type'], string>;

          const labels = {
            input: '输入',
            ontology: '本体',
            rule: '规则',
            conclusion: '结论'
          } satisfies Record<ReasoningChain['nodes'][number]['type'], string>;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.12 }}
              className="relative"
            >
              {index < chain.nodes.length - 1 && (
                <div className="absolute left-5 top-10 h-6 w-0.5 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10" />
              )}

              <div className="flex items-start gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold text-white', colors[node.type])}>
                  {labels[node.type]}
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-medium">{node.label}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      置信度 {Math.round(node.confidence * 100)}%
                    </Badge>
                    {index < chain.nodes.length - 1 && chain.edges[index] && (
                      <span className="text-[10px] text-muted-foreground">→ {chain.edges[index].label}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentFragment({ fragment }: { fragment: ReasoningChain['documents'][number] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderHighlightedContent = () => {
    const seenHighlights = new Set<string>();
    const normalizedHighlights = fragment.highlights
      .map((highlight) => highlight.trim())
      .filter((highlight) => {
        if (!highlight) {
          return false;
        }

        const normalizedHighlight = highlight.toLowerCase();
        if (seenHighlights.has(normalizedHighlight)) {
          return false;
        }

        seenHighlights.add(normalizedHighlight);
        return true;
      })
      .sort((left, right) => right.length - left.length);

    if (normalizedHighlights.length === 0) {
      return fragment.content;
    }

    const highlightMatcher = new RegExp(`(${normalizedHighlights.map(escapeRegExp).join('|')})`, 'gi');

    return fragment.content.split(highlightMatcher).filter(Boolean).map((part, index) => {
      const isHighlight = normalizedHighlights.some((highlight) => highlight.toLowerCase() === part.toLowerCase());
      return isHighlight ? (
        <mark key={`${fragment.id}-${index}`} className="rounded bg-amber-200 px-0.5 dark:bg-amber-900/50">
          {part}
        </mark>
      ) : (
        <span key={`${fragment.id}-${index}`}>{part}</span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-border/50"
    >
      <div className="flex cursor-pointer items-center justify-between bg-muted/30 p-3" onClick={() => setIsExpanded((current) => !current)}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
          <span className="truncate text-sm font-medium">{fragment.source}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {Math.round(fragment.relevance * 100)}%
          </Badge>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/50">
            <div className="p-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <Quote className="mr-1 inline-block h-3 w-3 text-muted-foreground/50" />
                {renderHighlightedContent()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MobileReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewItem: ReviewItem | null;
  reasoning: ReasoningData | null;
  isLoading?: boolean;
}

export function MobileReasoningModal({
  isOpen,
  onClose,
  reviewItem,
  reasoning,
  isLoading = false
}: MobileReasoningModalProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'docs' | 'path'>('flow');

  if (!reviewItem) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background">
          <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">推理依据</span>
              </div>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{reviewItem.title}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  置信度 {Math.round(reviewItem.confidence * 100)}%
                </Badge>
                {reviewItem.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    评分 {reviewItem.score}/{reviewItem.maxScore}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-1 px-4">
              {[
                { id: 'flow', label: '推理链' },
                { id: 'docs', label: '文档' },
                { id: 'path', label: '本体路径' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex-1 border-b-2 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-4 p-4">
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    结论摘要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {isLoading ? '正在加载推理依据...' : reasoning?.chain.conclusion ?? '暂无推理结论。'}
                  </p>
                </CardContent>
              </Card>

              {!isLoading && reasoning && activeTab === 'flow' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <GitBranch className="h-4 w-4 text-purple-500" />
                      推理流程
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MobileReasoningFlow chain={reasoning.chain} />
                  </CardContent>
                </Card>
              )}

              {!isLoading && reasoning && activeTab === 'docs' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">共检索到 {reasoning.chain.documents.length} 个相关文档片段</div>
                  {reasoning.chain.documents.map((document) => (
                    <DocumentFragment key={document.id} fragment={document} />
                  ))}
                </div>
              )}

              {!isLoading && reasoning && activeTab === 'path' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-orange-500" />
                      本体路径
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                      {reasoning.ontologyPathLabels.map((path, index) => (
                        <div key={path} className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'py-1.5 text-xs',
                              index === reasoning.ontologyPathLabels.length - 1 && 'bg-blue-500/20 text-blue-700 ring-1 ring-blue-500'
                            )}
                          >
                            {path}
                          </Badge>
                          {index < reasoning.ontologyPathLabels.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        当前推理涉及 <span className="font-medium text-foreground">{reasoning.ontologyPathLabels.length}</span> 个本体节点，
                        便于追踪结论从哪条路径得出。
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
