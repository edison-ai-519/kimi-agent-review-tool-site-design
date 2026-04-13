import { useMemo, useState, type ReactElement } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FolderOpen,
  Lock,
  Settings,
  Shield,
  Sparkles,
  User,
  Workflow
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  getReviewStageConfig,
  getReviewStageStatusLabel,
  reviewStageLabelMap
} from '@/lib/review-stage';
import type {
  DesktopUiPreferences,
  ProjectInfo,
  ReviewActivity,
  ReviewStage,
  ReviewStageOverview,
  SystemStatus,
  UserRole
} from '@/types';

interface TopNavigationProps {
  userRole: UserRole;
  currentStage: ReviewStage;
  project: ProjectInfo;
  ontologyVersion: string;
  currentUserName?: string;
  activityFeed?: ReviewActivity[];
  unreadNotificationCount?: number;
  systemStatus: SystemStatus;
  stageOverview?: ReviewStageOverview[];
  uiPreferences: DesktopUiPreferences;
  onOpenProjectCenter?: () => void;
  onStageChange?: (stage: ReviewStage) => void;
  onNotificationsViewed?: () => void;
  onPreferencesChange?: (patch: Partial<DesktopUiPreferences>) => void;
}

const roleLabels: Record<UserRole, string> = {
  expert: '评审专家',
  applicant: '申报方',
  admin: '系统管理员'
};

const roleIcons: Record<UserRole, ReactElement> = {
  expert: <CheckCircle2 className="h-4 w-4" />,
  applicant: <User className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />
};

const stageColors: Record<ReviewStage, string> = {
  proposal: 'bg-blue-500',
  midterm: 'bg-amber-500',
  final: 'bg-emerald-500'
};

const activityTypeStyles: Record<ReviewActivity['type'], string> = {
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  info: 'bg-blue-500/10 text-blue-600'
};

function formatActivityTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function TopNavigation({
  userRole,
  currentStage,
  project,
  ontologyVersion,
  currentUserName,
  activityFeed = [],
  unreadNotificationCount = 0,
  systemStatus,
  stageOverview = [],
  uiPreferences,
  onOpenProjectCenter,
  onStageChange,
  onNotificationsViewed,
  onPreferencesChange
}: TopNavigationProps) {
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentStageConfig = getReviewStageConfig(currentStage);

  const stageOverviewByStage = useMemo(
    () => new Map(stageOverview.map((overview) => [overview.stage, overview])),
    [stageOverview]
  );

  const handleNotificationMenuChange = (open: boolean) => {
    setIsNotificationMenuOpen(open);
    if (open) {
      onNotificationsViewed?.();
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 right-0 top-0 z-50 h-16"
    >
      <div className="glass-strong flex h-full items-center justify-between border-b border-border/50 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-lg font-semibold sm:block">本体智能评审系统</span>
          </motion.div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="gap-2 hover:bg-muted/50" onClick={onOpenProjectCenter}>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="hidden max-w-[150px] truncate sm:inline">{project.name}</span>
            <Badge variant="secondary" className="text-[10px]">项目中心</Badge>
          </Button>

          <DropdownMenu open={isStageMenuOpen} onOpenChange={setIsStageMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <Badge className={`${stageColors[currentStage]} text-xs text-white`}>{reviewStageLabelMap[currentStage]}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-[26rem]">
              <DropdownMenuLabel className="space-y-1">
                <div>切换评审阶段</div>
                <div className="text-xs font-normal text-muted-foreground">{currentStageConfig.description}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(reviewStageLabelMap) as ReviewStage[]).map((stage) => {
                const stageConfig = getReviewStageConfig(stage);
                const overview = stageOverviewByStage.get(stage);

                return (
                  <DropdownMenuItem
                    key={stage}
                    disabled={Boolean(overview && !overview.canEnter && stage !== currentStage)}
                    onClick={() => onStageChange?.(stage)}
                    className="items-start gap-3 py-3"
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full ${stageColors[stage]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{reviewStageLabelMap[stage]}</span>
                        {overview && (
                          <Badge variant="secondary" className="text-[10px]">
                            {getReviewStageStatusLabel(overview.status)}
                          </Badge>
                        )}
                        {stage === currentStage && <CheckCircle2 className="ml-auto h-4 w-4 text-blue-500" />}
                        {overview && !overview.canEnter && stage !== currentStage && <Lock className="ml-auto h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{stageConfig.title}</div>
                      {overview && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>完成 {overview.completed}/{overview.total}</span>
                          <span>待处理 {overview.pending}</span>
                          <span>待补材料 {overview.needsRevision}</span>
                          <span>争议 {overview.disputed}</span>
                        </div>
                      )}
                      {overview?.blockedReason && stage !== currentStage && (
                        <div className="mt-2 text-[11px] leading-relaxed text-amber-600">{overview.blockedReason}</div>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <Clock className="h-3 w-3" />
            <span>本体 v{ontologyVersion}</span>
          </div>

          <DropdownMenu open={isNotificationMenuOpen} onOpenChange={handleNotificationMenuChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-muted/50" aria-label="查看通知">
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {Math.min(unreadNotificationCount, 9)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>通知中心</span>
                <Badge variant="secondary" className="text-[10px]">
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} 条未读` : '已读'}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activityFeed.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">当前没有新的系统通知。</div>}
              {activityFeed.length > 0 && (
                <div className="max-h-80 space-y-2 overflow-y-auto p-2">
                  {activityFeed.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{activity.action}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{activity.target}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activityTypeStyles[activity.type]}`}>
                          {activity.type === 'success' ? '完成' : activity.type === 'warning' ? '关注' : '更新'}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">{formatActivityTime(activity.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {roleIcons[userRole]}
            <span className="hidden sm:inline">{roleLabels[userRole]}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50"
            aria-label="打开设置"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>工作台设置</DialogTitle>
            <DialogDescription>这里的设置会立即作用在当前桌面工作区，并保存在本机浏览器中。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <div className="text-sm font-medium">当前会话</div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>当前用户：{currentUserName ?? '演示账号'}</div>
                <div>当前角色：{roleLabels[userRole]}</div>
                <div>评审阶段：{reviewStageLabelMap[currentStage]}</div>
                <div>项目名称：{project.name}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-purple-500" />
                <div className="text-sm font-medium">界面偏好</div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">显示悬浮评审助手</div>
                    <div className="text-xs text-muted-foreground">关闭后右下角悬浮聊天入口会隐藏。</div>
                  </div>
                  <Switch
                    checked={uiPreferences.showFloatingChat}
                    onCheckedChange={(checked) => onPreferencesChange?.({ showFloatingChat: checked })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">显示底部状态栏</div>
                    <div className="text-xs text-muted-foreground">控制页面底部系统在线状态和置信度条的展示。</div>
                  </div>
                  <Switch
                    checked={uiPreferences.showBottomStatusBar}
                    onCheckedChange={(checked) => onPreferencesChange?.({ showBottomStatusBar: checked })}
                  />
                </div>

              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <div className="text-sm font-medium">系统状态</div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>服务状态：{systemStatus.isOnline ? '在线' : '离线'}</div>
                <div>系统版本：{systemStatus.version}</div>
                <div>本体版本：v{systemStatus.ontologyVersion}</div>
                <div>最近更新：{systemStatus.lastUpdate.toLocaleString('zh-CN')}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
