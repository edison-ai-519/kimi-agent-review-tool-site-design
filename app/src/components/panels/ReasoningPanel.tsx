import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, FileText, GitBranch, Lightbulb, Quote, Target, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ReasoningChain, ReasoningData, ReviewItem } from '@/types';

function ReasoningGraph({
  chain,
  highlightedNode,
  onNodeHover
}: {
  chain: ReasoningChain;
  highlightedNode: string | null;
  onNodeHover: (nodeId: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 220 });

  useEffect(() => {
    const element = svgRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      const nextDimensions = {
        width: rect?.width || 300,
        height: rect?.height || 220
      };

      setDimensions((current) =>
        current.width === nextDimensions.width && current.height === nextDimensions.height ? current : nextDimensions
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodePositions = chain.nodes.map((node, index) => {
    const x = (index / Math.max(chain.nodes.length - 1, 1)) * (dimensions.width - 80) + 40;
    const y = dimensions.height / 2 + (index % 2 === 0 ? -24 : 24);
    return { ...node, x, y };
  });

  const getNodeColor = (type: ReasoningChain['nodes'][number]['type']) => {
    switch (type) {
      case 'input':
        return '#3b82f6';
      case 'ontology':
        return '#f97316';
      case 'rule':
        return '#8b5cf6';
      case 'conclusion':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const getNodeLabel = (type: ReasoningChain['nodes'][number]['type']) => {
    switch (type) {
      case 'input':
        return '输入';
      case 'ontology':
        return '本体';
      case 'rule':
        return '规则';
      case 'conclusion':
        return '结论';
      default:
        return '节点';
    }
  };

  return (
    <svg ref={svgRef} className="h-[220px] w-full" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
      <defs>
        <linearGradient id="reasoning-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {chain.edges.map((edge, index) => {
        const fromNode = nodePositions.find((node) => node.id === edge.from);
        const toNode = nodePositions.find((node) => node.id === edge.to);
        if (!fromNode || !toNode) {
          return null;
        }

        return (
          <g key={`${edge.from}-${edge.to}`}>
            <motion.line
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="url(#reasoning-line-gradient)"
              strokeLinecap="round"
              strokeWidth={Math.max(edge.strength * 3, 2)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
            <text
              x={(fromNode.x + toNode.x) / 2}
              y={(fromNode.y + toNode.y) / 2 - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {nodePositions.map((node, index) => (
        <g
          key={node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className="cursor-pointer"
          onMouseEnter={() => onNodeHover(node.id)}
          onMouseLeave={() => onNodeHover(null)}
        >
          <motion.circle
            r={24}
            fill={getNodeColor(node.type)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: highlightedNode === node.id ? 1.12 : 1,
              opacity: 1
            }}
            transition={{
              scale: { duration: 0.2 },
              opacity: { duration: 0.4, delay: index * 0.1 }
            }}
          />
          <text y={4} textAnchor="middle" className="fill-white text-[10px] font-medium">
            {getNodeLabel(node.type)}
          </text>
          <text y={40} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
            {node.label}
          </text>
          <text y={52} textAnchor="middle" className="fill-muted-foreground text-[9px]">
            {Math.round(node.confidence * 100)}%
          </text>
        </g>
      ))}
    </svg>
  );
}

function DocumentFragment({ fragment }: { fragment: ReasoningChain['documents'][number] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderHighlightedContent = () => {
    let content = fragment.content;
    for (const highlight of fragment.highlights) {
      const regex = new RegExp(`(${highlight})`, 'gi');
      content = content.replace(regex, '|||$1|||');
    }

    return content.split('|||').map((part, index) => {
      const isHighlight = fragment.highlights.some((highlight) => part.toLowerCase() === highlight.toLowerCase());
      return isHighlight ? (
        <mark key={index} className="rounded bg-amber-200 px-0.5 dark:bg-amber-900/50">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-border/50"
    >
      <div
        className="flex cursor-pointer items-center justify-between bg-muted/30 p-3"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
          <span className="truncate text-sm font-medium">{fragment.source}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {Math.round(fragment.relevance * 100)}% 相关
          </Badge>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {isExpanded && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-border/50 p-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <Quote className="mr-1 inline-block h-4 w-4 text-muted-foreground/50" />
            {renderHighlightedContent()}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

interface ReasoningPanelProps {
  reviewItem?: ReviewItem | null;
  reasoning?: ReasoningData | null;
  isLoading?: boolean;
  onClose?: () => void;
}

export function ReasoningPanel({ reviewItem, reasoning, isLoading = false, onClose }: ReasoningPanelProps) {
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  if (!reviewItem) {
    return (
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="flex h-full flex-col border-l border-border/50 glass"
      >
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">推理与依据</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">选择一个评审要点后，这里会展示推理链和文档依据。</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="flex h-full w-[380px] flex-col border-l border-border/50 glass"
    >
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          <span className="font-semibold">推理与依据</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <Card>
            <CardContent className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{reviewItem.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  置信度 {Math.round(reviewItem.confidence * 100)}%
                </Badge>
                {reviewItem.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    评分 {reviewItem.score}/{reviewItem.maxScore}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">正在加载该评审项的推理链和依据文档...</CardContent>
            </Card>
          )}

          {!isLoading && reasoning && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    结论摘要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{reasoning.chain.conclusion}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-purple-500" />
                    推理链
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReasoningGraph
                    chain={reasoning.chain}
                    highlightedNode={highlightedNode}
                    onNodeHover={setHighlightedNode}
                  />

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {[
                      { label: '输入', color: 'bg-blue-500' },
                      { label: '本体', color: 'bg-orange-500' },
                      { label: '规则', color: 'bg-purple-500' },
                      { label: '结论', color: 'bg-green-500' }
                    ].map((legend) => (
                      <div key={legend.label} className="flex items-center gap-1">
                        <div className={cn('h-3 w-3 rounded-full', legend.color)} />
                        <span>{legend.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500" />
                    依据文档
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reasoning.chain.documents.map((document) => (
                    <DocumentFragment key={document.id} fragment={document} />
                  ))}
                </CardContent>
              </Card>

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
                            'cursor-pointer text-xs transition-colors hover:bg-blue-500/20',
                            index === reasoning.ontologyPathLabels.length - 1 && 'bg-blue-500/20 ring-1 ring-blue-500'
                          )}
                        >
                          {path}
                        </Badge>
                        {index < reasoning.ontologyPathLabels.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
