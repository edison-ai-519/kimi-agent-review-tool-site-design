import { motion } from 'framer-motion';
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ProjectInfo } from '@/types';

const mockProject: ProjectInfo = {
  id: '1',
  name: '基于深度学习的智能医疗影像诊断系统',
  applicant: '清华大学计算机科学与技术系',
  budget: '500万元',
  duration: '2024.01 - 2026.12',
  field: '人工智能 / 医疗健康',
  stage: 'proposal',
};

const mockStats = {
  total: 4,
  completed: 2,
  pending: 1,
  disputed: 1,
  avgConfidence: 0.78,
};

const recentActivities = [
  { id: '1', action: '完成', target: '技术创新性评审', time: '10分钟前', type: 'success' },
  { id: '2', action: '标记争议', target: '预算合理性', time: '30分钟前', type: 'warning' },
  { id: '3', action: '查看', target: '技术可行性依据', time: '1小时前', type: 'info' },
];

interface MobileHomeViewProps {
  onViewReview: () => void;
  onViewOntology: () => void;
}

export function MobileHomeView({ onViewReview, onViewOntology }: MobileHomeViewProps) {
  const progressPercent = (mockStats.completed / mockStats.total) * 100;

  return (
    <div className="space-y-4 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-bold text-lg leading-tight mb-1">{mockProject.name}</h2>
                <p className="text-sm text-muted-foreground">{mockProject.applicant}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                立项评审
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                {mockProject.budget}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {mockProject.duration}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                {mockProject.field}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                科研项目
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                评审进度
              </h3>
              <span className="text-sm text-muted-foreground">
                {mockStats.completed}/{mockStats.total}
              </span>
            </div>

            <Progress value={progressPercent} className="h-2 mb-4" />

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                <div className="text-2xl font-bold text-emerald-600">{mockStats.completed}</div>
                <div className="text-xs text-muted-foreground">已完成</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-500/10">
                <div className="text-2xl font-bold text-amber-600">{mockStats.pending}</div>
                <div className="text-xs text-muted-foreground">待评审</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-500/10">
                <div className="text-2xl font-bold text-rose-600">{mockStats.disputed}</div>
                <div className="text-xs text-muted-foreground">有争议</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <h3 className="font-semibold mb-3 px-1">快捷操作</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onViewReview}
            className={cn('p-4 rounded-xl bg-blue-500 text-white text-left', 'active:scale-95 transition-transform')}
          >
            <CheckCircle2 className="w-6 h-6 mb-2" />
            <div className="font-medium">继续评审</div>
            <div className="text-xs text-white/70">还有 {mockStats.pending} 项待完成</div>
          </button>

          <button
            onClick={onViewOntology}
            className={cn('p-4 rounded-xl bg-purple-500 text-white text-left', 'active:scale-95 transition-transform')}
          >
            <FileText className="w-6 h-6 mb-2" />
            <div className="font-medium">查看本体</div>
            <div className="text-xs text-white/70">浏览知识图谱</div>
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <h3 className="font-semibold mb-3 px-1">最近动态</h3>
        <div className="space-y-2">
          {recentActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  activity.type === 'success' && 'bg-emerald-500/10',
                  activity.type === 'warning' && 'bg-amber-500/10',
                  activity.type === 'info' && 'bg-blue-500/10',
                )}
              >
                {activity.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {activity.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {activity.type === 'info' && <Clock className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{activity.action}</span>
                  <span className="text-muted-foreground"> · {activity.target}</span>
                </div>
                <div className="text-xs text-muted-foreground">{activity.time}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">系统运行正常</span>
              </div>
              <div className="text-xs text-muted-foreground">本体 v3.5.2</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">系统置信度</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${mockStats.avgConfidence * 100}%` }} />
              </div>
              <span className="text-xs font-medium">{Math.round(mockStats.avgConfidence * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
