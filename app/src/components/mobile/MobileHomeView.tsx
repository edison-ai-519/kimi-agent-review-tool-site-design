import { motion } from 'framer-motion';
import { AlertCircle, Building2, Calendar, CheckCircle2, ChevronRight, Clock, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ProjectInfo, ReviewActivity, ReviewStats, SystemStatus } from '@/types';

function formatRelativeTime(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 1);

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前`;
}

const stageLabelMap: Record<ProjectInfo['stage'], string> = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收'
};

interface MobileHomeViewProps {
  project: ProjectInfo;
  stats: ReviewStats;
  activityFeed: ReviewActivity[];
  systemStatus: SystemStatus;
  onViewReview: () => void;
  onViewOntology: () => void;
}

export function MobileHomeView({
  project,
  stats,
  activityFeed,
  systemStatus,
  onViewReview,
  onViewOntology
}: MobileHomeViewProps) {
  const progressPercent = stats.total === 0 ? 0 : (stats.completed / stats.total) * 100;

  return (
    <div className="space-y-4 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="mb-1 text-lg font-bold leading-tight">{project.name}</h2>
                <p className="text-sm text-muted-foreground">{project.applicant}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stageLabelMap[project.stage]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                {project.budget}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {project.duration}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                {project.field}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                科研项目
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                评审进度
              </h3>
              <span className="text-sm text-muted-foreground">
                {stats.completed}/{stats.total}
              </span>
            </div>

            <Progress value={progressPercent} className="mb-4 h-2" />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">已完成</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">待评审</div>
              </div>
              <div className="rounded-xl bg-rose-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-rose-600">{stats.disputed}</div>
                <div className="text-xs text-muted-foreground">有争议</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <h3 className="mb-3 px-1 font-semibold">快捷操作</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onViewReview} className={cn('rounded-xl bg-blue-500 p-4 text-left text-white transition-transform active:scale-95')}>
            <CheckCircle2 className="mb-2 h-6 w-6" />
            <div className="font-medium">继续评审</div>
            <div className="text-xs text-white/70">还有 {stats.pending} 项待完成</div>
          </button>

          <button onClick={onViewOntology} className={cn('rounded-xl bg-purple-500 p-4 text-left text-white transition-transform active:scale-95')}>
            <FileText className="mb-2 h-6 w-6" />
            <div className="font-medium">查看本体</div>
            <div className="text-xs text-white/70">浏览知识结构</div>
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <h3 className="mb-3 px-1 font-semibold">最近动态</h3>
        <div className="space-y-2">
          {activityFeed.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.06 }}
              className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                  activity.type === 'success' && 'bg-emerald-500/10',
                  activity.type === 'warning' && 'bg-amber-500/10',
                  activity.type === 'info' && 'bg-blue-500/10'
                )}
              >
                {activity.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {activity.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                {activity.type === 'info' && <Clock className="h-5 w-5 text-blue-500" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-medium">{activity.action}</span>
                  <span className="text-muted-foreground"> · {activity.target}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatRelativeTime(activity.createdAt)}</div>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', systemStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500')} />
                <span className="text-sm font-medium">{systemStatus.isOnline ? '系统运行正常' : '系统暂时离线'}</span>
              </div>
              <div className="text-xs text-muted-foreground">本体 v{systemStatus.ontologyVersion}</div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">系统置信度</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(stats.avgConfidence * 100)}%` }} />
              </div>
              <span className="text-xs font-medium">{Math.round(stats.avgConfidence * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
