import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, Copy, Maximize2, Minimize2, Send, Sparkles, User, X } from 'lucide-react';
import { RelatedDocumentsList } from '@/components/chat/RelatedDocumentsList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChatMessage, ReviewItem } from '@/types';

function MessageBubble({
  message,
  onCopy
}: {
  message: ChatMessage;
  onCopy: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'
        )}
      >
        {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className="max-w-[80%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser ? 'rounded-br-md bg-blue-500 text-white' : 'rounded-bl-md bg-muted'
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {!isUser && <RelatedDocumentsList documents={message.relatedDocuments} compact className="bg-background/90" />}

        {!isUser && (
          <div className="mt-1 flex items-center gap-1">
            <button onClick={handleCopy} className="rounded p-1 transition-colors hover:bg-muted" title="复制内容">
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </button>
          </div>
        )}

        <div className={cn('mt-1 text-[10px] text-muted-foreground', isUser ? 'text-right' : 'text-left')}>
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

interface FloatingChatProps {
  messages: ChatMessage[];
  quickActions: string[];
  isPending: boolean;
  activeReviewItem?: ReviewItem | null;
  onSendMessage: (message: string) => void;
}

export function FloatingChat({ messages, quickActions, isPending, activeReviewItem, onSendMessage }: FloatingChatProps) {
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const isOpen = isManuallyOpen || (messages.length > 1 && !isDismissed);

  const handleSend = () => {
    if (!input.trim() || isPending) {
      return;
    }

    onSendMessage(input);
    setInput('');
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          setIsDismissed(false);
          setIsManuallyOpen(true);
        }}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-blue-500/30'
        )}
      >
        <Sparkles className="h-6 w-6 text-white" />
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: isMinimized ? 280 : 380,
          height: isMinimized ? 60 : 500
        }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-border/50',
          'glass-strong shadow-2xl shadow-black/20'
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium">评审助手</span>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">在线</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {activeReviewItem ? `当前聚焦：${activeReviewItem.title}` : '当前为全局问答'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized((current) => !current)} className="rounded-lg p-1.5 transition-colors hover:bg-muted/50">
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                setIsManuallyOpen(false);
                setIsDismissed(true);
              }}
              className="rounded-lg p-1.5 transition-colors hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} onCopy={handleCopy} />
                ))}

                {isPending && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((dot) => (
                          <motion.div
                            key={dot}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: dot * 0.2 }}
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
                {quickActions.map((action) => (
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
                  placeholder="输入问题..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-muted/50"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={isPending || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
