import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Home, Lightbulb, MessageSquare, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'home' | 'ontology' | 'review' | 'reasoning' | 'chat';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasReasoning: boolean;
}

const tabs: { id: MobileTab; label: string; icon: ElementType }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'ontology', label: '本体', icon: Network },
  { id: 'review', label: '评审', icon: ClipboardList },
  { id: 'reasoning', label: '推理', icon: Lightbulb },
  { id: 'chat', label: '助手', icon: MessageSquare }
];

export function MobileBottomNav({ activeTab, onTabChange, hasReasoning }: MobileBottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-white/90 backdrop-blur-lg safe-area-bottom dark:bg-slate-900/90"
    >
      <div className="flex h-16 items-center justify-around pb-safe">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id === 'reasoning' && !hasReasoning;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isDisabled) {
                  onTabChange(tab.id);
                }
              }}
              disabled={isDisabled}
              className={cn(
                'flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200',
                isActive ? 'text-blue-500' : 'text-muted-foreground',
                isDisabled && 'cursor-not-allowed opacity-40'
              )}
            >
              <div className={cn('relative rounded-xl p-1.5 transition-all duration-200', isActive && 'bg-blue-500/10')}>
                <tab.icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />
                {tab.id === 'chat' && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500" />}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
