import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, FileText, GitBranch, ChevronRight, Quote, Target, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReasoningChain, ReviewItem } from '@/types';

const mockReasoningChain: ReasoningChain = {
  nodes: [
    { id: 'input', label: '新型 Transformer 方案', type: 'input', confidence: 1 },
    { id: 'ontology', label: '技术成熟度偏低', type: 'ontology', confidence: 0.85 },
    { id: 'rule', label: '可行性扣分', type: 'rule', confidence: 0.8 },
    { id: 'conclusion', label: '建议谨慎推进', type: 'conclusion', confidence: 0.72 },
  ],
  edges: [
    { from: 'input', to: 'ontology', label: '映射到', strength: 0.9 },
    { from: 'ontology', to: 'rule', label: '触发', strength: 0.85 },
    { from: 'rule', to: 'conclusion', label: '推导出', strength: 0.8 },
  ],
  conclusion:
    '该项目在技术成熟度方面存在较高风险，建议要求申报方补充技术验证方案，并给出可替代技术路线，以降低后续实施不确定性。',
  documents: [
    {
      id: '1',
      source: '项目申报书 - 技术方案章节',
      content: '项目计划采用较新的 Transformer 架构进行医疗影像分析，前期实验在公开数据集上取得领先结果。',
      highlights: ['Transformer', '公开数据集', '领先结果'],
      relevance: 0.92,
    },
    {
      id: '2',
      source: '对比文献 - Nature Medicine 2023',
      content: '相关研究指出，在医疗影像任务中，CNN 在中小规模数据场景下通常更稳定，而 Transformer 往往需要更大规模的标注数据支持。',
      highlights: ['CNN', 'Transformer', '标注数据'],
      relevance: 0.88,
    },
    {
      id: '3',
      source: '历史评审记录 - 2023-AI-015',
      content: '类似项目曾因技术路线过于前沿，在部署阶段出现兼容性和算力成本问题，项目整体延期 6 个月。',
      highlights: ['技术路线过于前沿', '兼容性', '延期 6 个月'],
      relevance: 0.75,
    },
  ],
};

function ReasoningGraph({
  chain,
  highlightedNode,
  onNodeHover,
}: {
  chain: ReasoningChain;
  highlightedNode: string | null;
  onNodeHover: (nodeId: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  const nodePositions = chain.nodes.map((node, index) => {
    const x = (index / (chain.nodes.length - 1)) * (dimensions.width - 80) + 40;
    const y = dimensions.height / 2 + (index % 2 === 0 ? -20 : 20);
    return { ...node, x, y };
  });

  const getNodeColor = (type: string) => {
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

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'input':
        return <FileText className="w-4 h-4" />;
      case 'ontology':
        return <Target className="w-4 h-4" />;
      case 'rule':
        return <GitBranch className="w-4 h-4" />;
      case 'conclusion':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <svg ref={svgRef} className="w-full h-[200px]" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {chain.edges.map((edge, index) => {
        const fromNode = nodePositions.find((node) => node.id === edge.from);
        const toNode = nodePositions.find((node) => node.id === edge.to);
        if (!fromNode || !toNode) {
          return null;
        }

        return (
          <g key={`edge-${index}`}>
            <motion.line
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="url(#lineGradient)"
              strokeWidth={edge.strength * 3}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: index * 0.2 }}
            />
            <polygon
              points={`${toNode.x - 8},${toNode.y} ${toNode.x - 15},${toNode.y - 4} ${toNode.x - 15},${toNode.y + 4}`}
              fill={getNodeColor(toNode.type)}
            />
            <text
              x={(fromNode.x + toNode.x) / 2}
              y={(fromNode.y + toNode.y) / 2 - 8}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
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
              scale: highlightedNode === node.id ? 1.2 : 1,
              opacity: 1,
            }}
            transition={{
              scale: { duration: 0.2 },
              opacity: { duration: 0.5, delay: index * 0.15 },
            }}
            filter={highlightedNode === node.id ? 'url(#glow)' : undefined}
            className="transition-all duration-200"
          />
          <foreignObject x="-12" y="-12" width="24" height="24">
            <div className="flex items-center justify-center w-full h-full text-white">{getNodeIcon(node.type)}</div>
          </foreignObject>
          <text y={38} textAnchor="middle" className="text-[10px] fill-foreground font-medium">
            {node.label}
          </text>
          <text y={50} textAnchor="middle" className="text-[9px] fill-muted-foreground">
            {(node.confidence * 100).toFixed(0)}%
          </text>
        </g>
      ))}
    </svg>
  );
}

function DocumentFragment({ fragment }: { fragment: ReasoningChain['documents'][0] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderHighlightedContent = () => {
    let content = fragment.content;
    fragment.highlights.forEach((highlight) => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      content = content.replace(regex, '|||$1|||');
    });

    return content.split('|||').map((part, index) => {
      const isHighlight = fragment.highlights.some((highlight) => part.toLowerCase() === highlight.toLowerCase());
      return isHighlight ? (
        <mark key={index} className="bg-amber-200 dark:bg-amber-900/50 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/50 overflow-hidden"
    >
      <div className="p-3 bg-muted/30 cursor-pointer flex items-center justify-between" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium truncate max-w-[180px]">{fragment.source}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {(fragment.relevance * 100).toFixed(0)}% 相关
          </Badge>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {isExpanded && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-3 border-t border-border/50">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <Quote className="w-4 h-4 inline-block mr-1 text-muted-foreground/50" />
            {renderHighlightedContent()}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

interface ReasoningPanelProps {
  reviewItem?: ReviewItem | null;
  onClose?: () => void;
}

export function ReasoningPanel({ reviewItem, onClose }: ReasoningPanelProps) {
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const chain = mockReasoningChain;

  if (!reviewItem) {
    return (
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-full glass border-l border-border/50 flex flex-col"
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">推理与依据</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">选择一个评审要点查看推理依据</p>
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
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full glass border-l border-border/50 flex flex-col w-[380px]"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <span className="font-semibold">推理与依据</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{reviewItem.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  置信度 {(reviewItem.confidence * 100).toFixed(0)}%
                </Badge>
                {reviewItem.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    评分 {reviewItem.score}/{reviewItem.maxScore}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                结论摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{chain.conclusion}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-500" />
                推理链
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReasoningGraph chain={chain} highlightedNode={highlightedNode} onNodeHover={setHighlightedNode} />

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>输入</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>本体</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>规则</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>结论</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                检索文档片段
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chain.documents.map((document) => (
                <DocumentFragment key={document.id} fragment={document} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                本体路径
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {['风险本体', '技术成熟度', '可行性评估'].map((path, index) => (
                  <div key={path} className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs cursor-pointer hover:bg-blue-500/20 transition-colors',
                        index === 1 && 'bg-blue-500/20 ring-1 ring-blue-500',
                      )}
                    >
                      {path}
                    </Badge>
                    {index < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
