import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, FileText, GitBranch, Quote, Target, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ReasoningChain, ReviewItem } from '@/types';

// Mock reasoning chain data
const mockReasoningChain: ReasoningChain = {
  nodes: [
    { id: 'input', label: '项目：使用未成熟技术', type: 'input', confidence: 1 },
    { id: 'ontology', label: '风险本体:技术成熟度低', type: 'ontology', confidence: 0.85 },
    { id: 'rule', label: '关联规则:可行性扣分', type: 'rule', confidence: 0.8 },
    { id: 'conclusion', label: '评审结论:建议谨慎', type: 'conclusion', confidence: 0.72 }
  ],
  edges: [
    { from: 'input', to: 'ontology', label: '属于', strength: 0.9 },
    { from: 'ontology', to: 'rule', label: '触发', strength: 0.85 },
    { from: 'rule', to: 'conclusion', label: '得出', strength: 0.8 }
  ],
  conclusion: '该项目在技术成熟度方面存在较高风险，建议要求申报方提供技术验证方案或替代技术路线。',
  documents: [
    {
      id: '1',
      source: '项目申报书 - 技术方案部分',
      content: '本项目拟采用最新的Transformer架构进行医疗影像分析，该架构在公开数据集上取得了SOTA性能。',
      highlights: ['Transformer架构', 'SOTA性能'],
      relevance: 0.92
    },
    {
      id: '2',
      source: '对比文献 - Nature Medicine 2023',
      content: '研究表明，在医疗影像领域，传统CNN架构在数据量有限时表现更稳定，Transformer需要大量标注数据。',
      highlights: ['CNN架构', '数据量有限', 'Transformer'],
      relevance: 0.88
    },
    {
      id: '3',
      source: '历史评审记录 - 2023-AI-015',
      content: '类似项目因技术路线过于前沿，在实际部署中遇到兼容性问题，导致项目延期6个月。',
      highlights: ['技术路线过于前沿', '兼容性问题'],
      relevance: 0.75
    }
  ]
};

// Simplified reasoning flow for mobile
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
          };
          
          const icons = {
            input: <FileText className="w-4 h-4" />,
            ontology: <Target className="w-4 h-4" />,
            rule: <GitBranch className="w-4 h-4" />,
            conclusion: <Lightbulb className="w-4 h-4" />
          };
          
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {index < chain.nodes.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-6 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10" />
              )}
              
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  colors[node.type]
                )}>
                  {icons[node.type]}
                </div>
                <div className="flex-1 pt-1">
                  <div className="font-medium text-sm">{node.label}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      置信度 {(node.confidence * 100).toFixed(0)}%
                    </Badge>
                    {index < chain.nodes.length - 1 && chain.edges[index] && (
                      <span className="text-[10px] text-muted-foreground">
                        → {chain.edges[index].label}
                      </span>
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

// Document fragment component
function DocumentFragment({ fragment }: { fragment: ReasoningChain['documents'][0] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderHighlightedContent = () => {
    let content = fragment.content;
    fragment.highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      content = content.replace(regex, '|||$1|||');
    });
    
    return content.split('|||').map((part, index) => {
      const isHighlight = fragment.highlights.some(h => 
        part.toLowerCase() === h.toLowerCase()
      );
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
      className="rounded-xl border border-border/50 overflow-hidden"
    >
      <div 
        className="p-3 bg-muted/30 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{fragment.source}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {(fragment.relevance * 100).toFixed(0)}%
          </Badge>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <Quote className="w-3 h-3 inline-block mr-1 text-muted-foreground/50" />
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
}

export function MobileReasoningModal({ isOpen, onClose, reviewItem }: MobileReasoningModalProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'docs' | 'path'>('flow');
  const chain = mockReasoningChain;

  if (!reviewItem) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">推理依据</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Item Info */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{reviewItem.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  置信度 {(reviewItem.confidence * 100).toFixed(0)}%
                </Badge>
                {reviewItem.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    评分 {reviewItem.score}/{reviewItem.maxScore}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex px-4 gap-1">
              {[
                { id: 'flow', label: '推理链' },
                { id: 'docs', label: '文档' },
                { id: 'path', label: '本体路径' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-muted-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-4 space-y-4">
              {/* Conclusion Summary */}
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    结论摘要
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {chain.conclusion}
                  </p>
                </CardContent>
              </Card>
              
              {/* Flow Tab */}
              {activeTab === 'flow' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-500" />
                      推理流程
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MobileReasoningFlow chain={chain} />
                  </CardContent>
                </Card>
              )}
              
              {/* Docs Tab */}
              {activeTab === 'docs' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    共检索到 {chain.documents.length} 个相关文档片段
                  </div>
                  {chain.documents.map((doc) => (
                    <DocumentFragment key={doc.id} fragment={doc} />
                  ))}
                </div>
              )}
              
              {/* Path Tab */}
              {activeTab === 'path' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      本体路径
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                      {['风险本体', '技术成熟度', '可行性评估', '评审结论'].map((path, index, arr) => (
                        <div key={path} className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'text-xs py-1.5',
                              index === 1 && 'bg-blue-500/20 text-blue-700 ring-1 ring-blue-500'
                            )}
                          >
                            {path}
                          </Badge>
                          {index < arr.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        当前推理涉及 <span className="font-medium text-foreground">4</span> 个本体节点，
                        路径深度为 <span className="font-medium text-foreground">3</span> 层
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
