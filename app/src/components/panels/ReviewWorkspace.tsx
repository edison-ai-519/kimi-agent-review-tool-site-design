import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Sparkles,
  ChevronRight,
  FileText,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ProjectInfo, ReviewItem, ReviewStatus, ChatMessage } from '@/types';

// Mock project data
const mockProject: ProjectInfo = {
  id: '1',
  name: '基于深度学习的智能医疗影像诊断系统',
  applicant: '清华大学计算机科学与技术系',
  budget: '500万元',
  duration: '2024.01 - 2026.12',
  field: '人工智能/医疗健康',
  stage: 'proposal'
};

// Mock review items
const mockReviewItems: ReviewItem[] = [
  {
    id: '1',
    title: '技术创新性',
    description: '评估项目在技术层面的创新程度，包括技术路线的新颖性、技术难点的突破等',
    status: 'reviewed',
    confidence: 0.85,
    score: 28,
    maxScore: 30,
    comment: '技术路线具有较好的创新性，采用了最新的深度学习架构...'
  },
  {
    id: '2',
    title: '技术可行性',
    description: '评估项目技术方案的可实现性，包括技术成熟度、技术风险等',
    status: 'pending',
    confidence: 0.72,
    maxScore: 25
  },
  {
    id: '3',
    title: '团队实力',
    description: '评估项目团队的研发能力、经验积累和人员配置',
    status: 'reviewed',
    confidence: 0.90,
    score: 22,
    maxScore: 25,
    comment: '团队实力雄厚，负责人具有丰富的研究经验...'
  },
  {
    id: '4',
    title: '预算合理性',
    description: '评估项目经费预算的合理性和科学性',
    status: 'disputed',
    confidence: 0.65,
    score: 15,
    maxScore: 20,
    comment: '设备购置费用偏高，建议重新评估...'
  }
];

// Mock chat messages
const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: '您好！我是您的AI评审助手。我可以帮助您分析项目的技术风险、创新点等方面。请问有什么可以帮助您的？',
    timestamp: new Date(Date.now() - 3600000)
  }
];

const statusConfig: Record<ReviewStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: {
    label: '待评审',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  reviewed: {
    label: '已评审',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  },
  disputed: {
    label: '有争议',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10'
  }
};

interface ReviewItemCardProps {
  item: ReviewItem;
  isExpanded: boolean;
  onToggle: () => void;
  onShowReasoning: () => void;
}

function ReviewItemCard({ item, isExpanded, onToggle, onShowReasoning }: ReviewItemCardProps) {
  const status = statusConfig[item.status];
  const confidencePercent = Math.round(item.confidence * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border transition-all duration-300 cursor-pointer',
        'hover:shadow-lg hover:-translate-y-0.5',
        isExpanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-border/50'
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            status.bgColor
          )}>
            {status.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{item.title}</h3>
              <Badge variant="secondary" className={cn('text-xs', status.color, status.bgColor)}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

            {/* Confidence Bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">置信度</span>
                  <span className={cn(
                    'font-medium',
                    confidencePercent >= 80 ? 'text-emerald-500' :
                    confidencePercent >= 60 ? 'text-amber-500' : 'text-rose-500'
                  )}>
                    {confidencePercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePercent}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={cn(
                      'h-full rounded-full',
                      confidencePercent >= 80 ? 'bg-emerald-500' :
                      confidencePercent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                  />
                </div>
              </div>

              {/* Score */}
              {item.score !== undefined && (
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {item.score}<span className="text-sm text-muted-foreground">/{item.maxScore}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expand Icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-muted-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
                {/* Score Input */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium min-w-[80px]">评分</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={item.maxScore}
                      defaultValue={item.score}
                      className="w-20 text-center"
                    />
                    <span className="text-muted-foreground">/ {item.maxScore} 分</span>
                  </div>
                </div>

                {/* Comment Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">评审意见</label>
                  <Textarea
                    placeholder="请输入您的评审意见..."
                    defaultValue={item.comment}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      生成辅助意见
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowReasoning();
                    }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    查看依据
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">暂存</Button>
                    <Button size="sm" className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      提交
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Agent Chat Component
function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '根据本体推理和文档检索，该项目在技术成熟度方面存在以下风险：1. 核心算法依赖第三方库；2. 数据集获取存在不确定性。建议重点关注技术路线的可替代性方案。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 2000);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Agentic RAG 问答助手
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-2">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                )}>
                  {message.role === 'user' ? (
                    <Users className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-md' 
                    : 'bg-muted rounded-bl-md'
                )}>
                  {message.content}
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="w-2 h-2 rounded-full bg-blue-500"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-blue-500"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              placeholder="输入问题，例如：这个项目的技术风险有哪些？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReviewWorkspaceProps {
  project?: ProjectInfo;
  onShowReasoning?: (item: ReviewItem) => void;
}

export function ReviewWorkspace({ project = mockProject, onShowReasoning }: ReviewWorkspaceProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Project Info Card */}
      <Card className="mb-4 shrink-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">{project.name}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {project.applicant}
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  {project.budget}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {project.duration}
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {project.field}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {project.stage}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Review Items List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  评审要点清单
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>进度</span>
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="w-2/3 h-full bg-blue-500 rounded-full" />
                  </div>
                  <span>2/4</span>
                </div>
              </div>

              {mockReviewItems.map((item) => (
                <ReviewItemCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedItem === item.id}
                  onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  onShowReasoning={() => onShowReasoning?.(item)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Agent Chat */}
        <div className="w-80 shrink-0 hidden lg:block">
          <AgentChat />
        </div>
      </div>
    </motion.div>
  );
}
