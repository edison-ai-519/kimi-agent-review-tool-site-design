import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle2, Clock, Database, Server, Wifi } from 'lucide-react';
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
      transition={{ duration: 0.6, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-40 h-8"
    >
      <div className="glass flex h-full items-center justify-between border-t border-border/50 px-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {status.isOnline ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600">系统在线</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-600">系统离线</span>
              </>
            )}
          </div>

          <div className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
            <Server className="h-3 w-3" />
            <span>版本 {status.version}</span>
          </div>

          <div className="hidden items-center gap-1.5 text-muted-foreground md:flex">
            <Database className="h-3 w-3" />
            <span>本体 v{status.ontologyVersion}</span>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-muted-foreground lg:flex">
          <Clock className="h-3 w-3" />
          <span>最后更新：{status.lastUpdate.toLocaleString('zh-CN')}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="hidden text-muted-foreground sm:inline">系统置信度</span>
            <div className="flex items-center gap-1.5">
              <Activity
                className={cn(
                  'h-3 w-3',
                  confidencePercent >= 80 ? 'text-emerald-500' : confidencePercent >= 60 ? 'text-amber-500' : 'text-red-500'
                )}
              />
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    'h-full rounded-full',
                    confidencePercent >= 80 ? 'bg-emerald-500' : confidencePercent >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                />
              </div>
              <span
                className={cn(
                  'font-medium',
                  confidencePercent >= 80 ? 'text-emerald-600' : confidencePercent >= 60 ? 'text-amber-600' : 'text-red-600'
                )}
              >
                {confidencePercent}%
              </span>
            </div>
          </div>

          <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            所有服务正常
          </Badge>
        </div>
      </div>
    </motion.footer>
  );
}
