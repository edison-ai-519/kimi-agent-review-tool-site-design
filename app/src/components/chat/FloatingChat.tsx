import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Minimize2, Maximize2, Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      '您好，我是您的 AI 评审助手。\n\n我可以帮您：\n- 分析项目的技术风险与创新亮点\n- 检索相关文献和历史案例\n- 解释评审标准与评分依据\n- 生成评审意见草稿\n\n请告诉我您想先查看哪一部分。',
    timestamp: new Date(),
  },
];

function TypingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index += 1;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, 15);

    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <span>
      {displayText}
      {!isComplete && <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse" />}
    </span>
  );
}

function MessageBubble({
  message,
  isNew,
  onCopy,
}: {
  message: ChatMessage;
  isNew: boolean;
  onCopy: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
        )}
      >
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={cn('relative max-w-[80%] group', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser ? 'bg-blue-500 text-white rounded-br-md' : 'bg-muted rounded-bl-md',
          )}
        >
          {isNew && !isUser ? <TypingText text={message.content} /> : <div className="whitespace-pre-wrap">{message.content}</div>}
        </div>

        {!isUser && showActions && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-6 left-0 flex items-center gap-1">
            <button onClick={handleCopy} className="p-1 rounded hover:bg-muted transition-colors" title="复制内容">
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </button>
          </motion.div>
        )}

        <div className={cn('text-[10px] text-muted-foreground mt-1', isUser ? 'text-right' : 'text-left')}>
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) {
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
      const responses = [
        '基于当前本体推理结果，该项目在技术创新性方面表现较好，但需要进一步说明核心算法落地条件与验证边界。',
        '相关文献检索显示，类似项目常见风险包括过度依赖单一路线、缺少备选方案，以及验证样本规模不足。',
        '从评审标准看，该项目团队配置基本符合要求，建议进一步核实关键成员分工与协作机制。',
        '结合历史评审案例，这类项目的预算通常需要重点说明设备采购必要性，以及测试与运维成本的覆盖情况。',
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
      setNewMessageId(assistantMessage.id);
      setIsThinking(false);
    }, 1500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
          'flex items-center justify-center',
          'shadow-lg shadow-blue-500/30',
          'hover:shadow-xl hover:shadow-blue-500/40',
          'transition-shadow duration-300',
        )}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </motion.div>

        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: isMinimized ? 280 : 380,
          height: isMinimized ? 60 : 500,
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'glass-strong rounded-2xl',
          'shadow-2xl shadow-black/20',
          'flex flex-col overflow-hidden',
          'border border-border/50',
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-medium text-sm">AI 评审助手</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">在线</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isNew={message.id === newMessageId} onCopy={handleCopy} />
                ))}

                {isThinking && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                          className="w-2 h-2 rounded-full bg-blue-500"
                        />
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-purple-500"
                        />
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-pink-500"
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
                  placeholder="输入问题..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                  className="flex-1 bg-muted/50"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={isThinking || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin">
                {['分析技术风险', '检索相关文献', '生成评审意见', '解释评分标准'].map((action) => (
                  <button
                    key={action}
                    onClick={() => setInput(action)}
                    className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
