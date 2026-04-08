import { motion } from 'framer-motion';
import { Network, ClipboardList, Lightbulb, MessageSquare, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'home' | 'ontology' | 'review' | 'reasoning' | 'chat';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasReasoning: boolean;
}

const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'ontology', label: '本体', icon: Network },
  { id: 'review', label: '评审', icon: ClipboardList },
  { id: 'reasoning', label: '推理', icon: Lightbulb },
  { id: 'chat', label: '助手', icon: MessageSquare },
];

export function MobileBottomNav({ activeTab, onTabChange, hasReasoning }: MobileBottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-border/50 safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 pb-safe">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id === 'reasoning' && !hasReasoning;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                'transition-colors duration-200',
                isActive ? 'text-blue-500' : 'text-muted-foreground',
                isDisabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              <div className={cn('relative p-1.5 rounded-xl transition-all duration-200', isActive && 'bg-blue-500/10')}>
                <tab.icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
                {tab.id === 'chat' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
