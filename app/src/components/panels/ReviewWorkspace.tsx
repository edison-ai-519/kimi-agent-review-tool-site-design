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
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ProjectInfo, ReviewItem, ReviewStatus, ChatMessage } from '@/types';

const stageLabelMap: Record<ProjectInfo['stage'], string> = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收',
};

const mockProject: ProjectInfo = {
  id: '1',
  name: '基于深度学习的智能医疗影像诊断系统',
  applicant: '清华大学计算机科学与技术系',
  budget: '500万元',
  duration: '2024.01 - 2026.12',
  field: '人工智能 / 医疗健康',
  stage: 'proposal',
};

const mockReviewItems: ReviewItem[] = [
  {
    id: '1',
    title: '技术创新性',
    description: '评估项目在技术层面的创新程度，包括技术路线的新颖性、关键技术突破和原创贡献。',
    status: 'reviewed',
    confidence: 0.85,
    score: 28,
    maxScore: 30,
    comment: '技术路线具备较强创新性，采用了较新的深度学习架构，建议补充与现有方案的差异化论证。',
  },
  {
    id: '2',
    title: '技术可行性',
    description: '评估项目技术方案的落地可行性，包括技术成熟度、实施路径与潜在风险。',
    status: 'pending',
    confidence: 0.72,
    maxScore: 25,
  },
  {
    id: '3',
    title: '团队实力',
    description: '评估项目团队的研发能力、项目经验与协作配置。',
    status: 'reviewed',
    confidence: 0.9,
    score: 22,
    maxScore: 25,
    comment: '团队核心成员结构完整，负责人具备相关研究积累，执行基础较好。',
  },
  {
    id: '4',
    title: '预算合理性',
    description: '评估项目经费安排的合理性、完整性与使用效率。',
    status: 'disputed',
    confidence: 0.65,
    score: 15,
    maxScore: 20,
    comment: '设备购置费用占比偏高，建议进一步说明采购必要性并优化经费结构。',
  },
];

const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: '您好，我是您的 AI 评审助手，可以帮助您分析技术风险、创新亮点和评审依据。请告诉我您想查看的内容。',
    timestamp: new Date(Date.now() - 3600000),
  },
];

const statusConfig: Record<
  ReviewStatus,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  pending: {
    label: '待评审',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  reviewed: {
    label: '已评审',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  disputed: {
    label: '有争议',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
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
        isExpanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-border/50',
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', status.bgColor)}>
            {status.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{item.title}</h3>
              <Badge variant="secondary" className={cn('text-xs', status.color, status.bgColor)}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">置信度</span>
                  <span
                    className={cn(
                      'font-medium',
                      confidencePercent >= 80
                        ? 'text-emerald-500'
                        : confidencePercent >= 60
                          ? 'text-amber-500'
                          : 'text-rose-500',
                    )}
                  >
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
                      confidencePercent >= 80
                        ? 'bg-emerald-500'
                        : confidencePercent >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500',
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
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium min-w-[80px]">评分</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={item.maxScore} defaultValue={item.score} className="w-20 text-center" />
                    <span className="text-muted-foreground">/ {item.maxScore} 分</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">评审意见</label>
                  <Textarea
                    placeholder="请输入评审意见，支持引用依据和风险说明..."
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

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowReasoning();
                    }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    查看依据
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      暂存
                    </Button>
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

function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = () => {
    if (!input.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '基于当前本体推理和文档检索结果，该项目在技术成熟度方面存在三点风险：一是核心算法依赖较新的模型架构，二是数据集获取与标注成本较高，三是缺少备选技术路线。建议重点核实验证方案和替代路径。',
        timestamp: new Date(),
      };
      setMessages((previous) => [...previous, assistantMessage]);
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
                className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-500',
                  )}
                >
                  {message.role === 'user' ? (
                    <Users className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    message.role === 'user' ? 'bg-blue-500 text-white rounded-br-md' : 'bg-muted rounded-bl-md',
                  )}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
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
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSend()}
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
              {stageLabelMap[project.stage]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 flex gap-4 overflow-hidden">
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

        <div className="w-80 shrink-0 hidden lg:block">
          <AgentChat />
        </div>
      </div>
    </motion.div>
  );
}
