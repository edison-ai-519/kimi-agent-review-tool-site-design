import { motion } from 'framer-motion';
import {
  Server,
  Clock,
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SystemStatus } from '@/types';

interface BottomStatusBarProps {
  status: SystemStatus;
}

export function BottomStatusBar({ status }: BottomStatusBarProps) {
  const confidencePercent = Math.round(status.confidence * 100);

  return (
    <motion.footer
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 left-0 right-0 z-40 h-8"
    >
      <div className="glass border-t border-border/50 h-full px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {status.isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600">系统在线</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-red-600">系统离线</span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <Server className="w-3 h-3" />
            <span>版本 {status.version}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-muted-foreground">
            <Database className="w-3 h-3" />
            <span>本体 v{status.ontologyVersion}</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>最后更新：{status.lastUpdate.toLocaleString('zh-CN')}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden sm:inline">系统置信度</span>
            <div className="flex items-center gap-1.5">
              <Activity
                className={cn(
                  'w-3 h-3',
                  confidencePercent >= 80 ? 'text-emerald-500' : confidencePercent >= 60 ? 'text-amber-500' : 'text-red-500',
                )}
              />
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={cn(
                    'h-full rounded-full',
                    confidencePercent >= 80 ? 'bg-emerald-500' : confidencePercent >= 60 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                />
              </div>
              <span
                className={cn(
                  'font-medium',
                  confidencePercent >= 80 ? 'text-emerald-600' : confidencePercent >= 60 ? 'text-amber-600' : 'text-red-600',
                )}
              >
                {confidencePercent}%
              </span>
            </div>
          </div>

          <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            所有服务正常
          </Badge>
        </div>
      </div>
    </motion.footer>
  );
}
