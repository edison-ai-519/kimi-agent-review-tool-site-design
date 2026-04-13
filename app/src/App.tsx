import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Network,
  Shield,
  Sparkles,
  User,
  type LucideIcon
} from 'lucide-react';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { BottomStatusBar } from '@/components/navigation/BottomStatusBar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { TopNavigation } from '@/components/navigation/TopNavigation';
import { MobileChatModal } from '@/components/mobile/MobileChatModal';
import { MobileHomeView } from '@/components/mobile/MobileHomeView';
import { MobileOntologyDrawer } from '@/components/mobile/MobileOntologyDrawer';
import { MobileReasoningModal } from '@/components/mobile/MobileReasoningModal';
import { OntologyPanel } from '@/components/panels/OntologyPanel';
import { ProjectCenterPage } from '@/components/projects/ProjectCenterPage';
import { ReasoningPanel } from '@/components/panels/ReasoningPanel';
import { ReviewWorkspace } from '@/components/panels/ReviewWorkspace';
import { useReviewApp } from '@/hooks/useReviewApp';
import { getReviewWorkspacePermissions } from '@/lib/permissions';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { buildReviewStats } from '@/lib/review';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AuthSession, DesktopUiPreferences, ProjectSubmissionInput, ProjectSummary, ReviewItem, ReviewStage, UserRole } from '@/types';
import './App.css';

type MobileTab = 'home' | 'ontology' | 'review' | 'reasoning' | 'chat';
type DesktopPage = 'workspace' | 'projects';

const desktopPreferencesStorageKey = 'kimi-review-desktop-preferences';
const notificationReadAtStorageKey = 'kimi-review-notification-read-at';
const defaultDesktopPreferences: DesktopUiPreferences = {
  showFloatingChat: true,
  showBottomStatusBar: true
};

const loginEntryOptions: {
  role: UserRole;
  title: string;
  description: string;
  usernamePlaceholder: string;
  Icon: LucideIcon;
}[] = [
  {
    role: 'expert',
    title: '评审专家入口',
    description: '处理评分、意见、依据和阶段结论。',
    usernamePlaceholder: '例如 expert-zhang',
    Icon: CheckCircle2
  },
  {
    role: 'applicant',
    title: '申报方入口',
    description: '提交项目、补充材料、查看评审反馈。',
    usernamePlaceholder: '例如 applicant-li',
    Icon: User
  },
  {
    role: 'admin',
    title: '管理员入口',
    description: '跟踪流程状态、争议项和系统配置。',
    usernamePlaceholder: '例如 admin-wang',
    Icon: Shield
  }
];

function readStoredPreferences(): DesktopUiPreferences {
  if (typeof window === 'undefined') {
    return defaultDesktopPreferences;
  }

  try {
    const rawValue = window.localStorage.getItem(desktopPreferencesStorageKey);
    if (!rawValue) {
      return defaultDesktopPreferences;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<DesktopUiPreferences>;
    return {
      ...defaultDesktopPreferences,
      ...parsedValue
    };
  } catch {
    return defaultDesktopPreferences;
  }
}

function readStoredNotificationReadAt() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(notificationReadAtStorageKey);
}

function LoginPage({
  isLoading,
  errorMessage,
  onLogin
}: {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (username: string, password: string, role: UserRole) => Promise<void>;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('expert');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isMobile = useIsMobile();
  const selectedEntry = loginEntryOptions.find((entry) => entry.role === selectedRole) ?? loginEntryOptions[0];
  const SelectedEntryIcon = selectedEntry.Icon;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await onLogin(username, password, selectedRole);
    } catch {
      // Error state is surfaced by the hook and rendered in the form.
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="absolute inset-0">
        {Array.from({ length: 16 }).map((_, index) => (
          <motion.div
            key={index}
            className="absolute h-1 w-1 rounded-full bg-teal-300/30"
            style={{
              left: `${(index * 17) % 100}%`,
              top: `${(index * 11) % 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: 3 + (index % 4),
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}

        <motion.div
          className="absolute left-[-200px] top-[-200px] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[-150px] right-[-150px] h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-3xl"
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-3xl'}`}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 text-center">
            <motion.div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500 shadow-2xl shadow-teal-500/20"
              whileHover={{ scale: 1.04, rotate: 4 }}
            >
              <Network className="h-10 w-10 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-2 text-2xl font-bold text-white sm:text-3xl"
            >
              本体智能评审系统
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm text-teal-100 sm:text-base">
              透明、可解释、可联调
            </motion.p>
          </motion.div>

          <motion.div initial={{ opacity: 0, rotateX: 90 }} animate={{ opacity: 1, rotateX: 0 }} transition={{ duration: 0.8, delay: 0.35 }}>
            <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-center gap-2 text-center text-lg text-white sm:text-xl">
                  <SelectedEntryIcon className="h-5 w-5 text-teal-200" />
                  {selectedEntry.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-5 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="登录入口">
                  {loginEntryOptions.map((entry) => {
                    const EntryIcon = entry.Icon;
                    const isSelected = entry.role === selectedRole;

                    return (
                      <button
                        key={entry.role}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setSelectedRole(entry.role)}
                        className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-teal-300/60 bg-teal-300/15 text-white'
                            : 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <EntryIcon className="h-4 w-4" />
                          {entry.title.replace('入口', '')}
                        </span>
                        <span className="mt-2 block text-xs leading-relaxed text-zinc-300">{entry.description}</span>
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-teal-100">用户名</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-200" />
                      <Input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder={selectedEntry.usernamePlaceholder}
                        className="h-11 border-white/20 bg-white/10 pl-10 text-white placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm text-teal-100">密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-200" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="输入任意密码即可登录"
                        className="h-11 border-white/20 bg-white/10 pl-10 pr-10 text-white placeholder:text-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{errorMessage}</div>}

                  <Button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className="h-11 w-full bg-teal-500 text-zinc-950 hover:bg-teal-400"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : (
                      <>
                        进入{selectedEntry.title.replace('入口', '')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-teal-100">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{selectedEntry.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>演示入口，不启用正式 RBAC</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Network, label: '本体驱动' },
              { icon: Sparkles, label: '接口预留' },
              { icon: CheckCircle2, label: '可解释' }
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.08 }}
                className="text-center"
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <feature.icon className="h-6 w-6 text-blue-300" />
                </div>
                <span className="text-sm text-teal-100">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function LoadingPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="h-10 w-10 rounded-full border-2 border-blue-500/20 border-t-blue-500"
          />
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DesktopDashboard({
  session,
  currentStage,
  appState,
  projects,
  stageOverview,
  chatMessages,
  reasoningByItem,
  historyByItem,
  generatedReferencesByItem,
  isChatPending,
  isProjectSubmitting,
  savingItemId,
  generatingItemId,
  reasoningLoadingItemId,
  historyLoadingItemId,
  errorMessage,
  isLoadingAppState,
  onEnsureReasoning,
  onEnsureReviewHistory,
  onProjectChange,
  onProjectSubmit,
  onStageChange,
  onSendChat,
  onSaveReviewItem,
  onGenerateComment
}: {
  session: AuthSession;
  currentStage: ReviewStage;
  appState: NonNullable<ReturnType<typeof useReviewApp>['appState']>;
  projects: ProjectSummary[];
  stageOverview: ReturnType<typeof useReviewApp>['stageOverview'];
  chatMessages: ReturnType<typeof useReviewApp>['chatMessages'];
  reasoningByItem: ReturnType<typeof useReviewApp>['reasoningByItem'];
  historyByItem: ReturnType<typeof useReviewApp>['historyByItem'];
  generatedReferencesByItem: ReturnType<typeof useReviewApp>['generatedReferencesByItem'];
  isChatPending: boolean;
  isProjectSubmitting: boolean;
  savingItemId: string | null;
  generatingItemId: string | null;
  reasoningLoadingItemId: string | null;
  historyLoadingItemId: string | null;
  errorMessage: string | null;
  isLoadingAppState: boolean;
  onEnsureReasoning: (item: ReviewItem) => Promise<unknown>;
  onEnsureReviewHistory: (itemId: string) => Promise<unknown>;
  onProjectChange: (projectId: string) => Promise<void>;
  onProjectSubmit: (payload: ProjectSubmissionInput) => Promise<unknown>;
  onStageChange: (stage: ReviewStage) => Promise<void>;
  onSendChat: (message: string, itemId?: string) => void;
  onSaveReviewItem: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}) {
  const userRole = session.user.role;
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [activeReviewItemId, setActiveReviewItemId] = useState<string | null>(null);
  const [isOntologyPanelCollapsed, setIsOntologyPanelCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<DesktopPage>('workspace');
  const [uiPreferences, setUiPreferences] = useState<DesktopUiPreferences>(() => readStoredPreferences());
  const [lastNotificationReadAt, setLastNotificationReadAt] = useState<string | null>(() => readStoredNotificationReadAt());

  const currentProject = appState.project;
  const selectedReviewItem = appState.reviewItems.find((item) => item.id === selectedReviewItemId) ?? null;
  const activeReviewItem = appState.reviewItems.find((item) => item.id === activeReviewItemId) ?? null;
  const selectedReasoning = selectedReviewItem ? reasoningByItem[selectedReviewItem.id] ?? null : null;
  const highlightedOntologyPath = selectedReasoning?.ontologyPathIds ?? [];
  const reviewPermissions = getReviewWorkspacePermissions(userRole);
  const unreadNotificationCount = appState.activityFeed.filter((activity) => {
    if (!lastNotificationReadAt) {
      return true;
    }

    return new Date(activity.createdAt).getTime() > new Date(lastNotificationReadAt).getTime();
  }).length;

  useEffect(() => {
    window.localStorage.setItem(desktopPreferencesStorageKey, JSON.stringify(uiPreferences));
  }, [uiPreferences]);

  useEffect(() => {
    if (lastNotificationReadAt) {
      window.localStorage.setItem(notificationReadAtStorageKey, lastNotificationReadAt);
      return;
    }

    window.localStorage.removeItem(notificationReadAtStorageKey);
  }, [lastNotificationReadAt]);

  const handleShowReasoning = (item: ReviewItem) => {
    setSelectedReviewItemId(item.id);
    setActiveReviewItemId(item.id);
    void onEnsureReasoning(item).catch(() => undefined);
  };

  const handleNotificationsViewed = () => {
    if (appState.activityFeed[0]?.createdAt) {
      setLastNotificationReadAt(appState.activityFeed[0].createdAt);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNavigation
        userRole={userRole}
        currentStage={currentStage}
        project={currentProject}
        currentUserName={session.user.name}
        activityFeed={appState.activityFeed}
        unreadNotificationCount={unreadNotificationCount}
        ontologyVersion={appState.systemStatus.ontologyVersion}
        systemStatus={appState.systemStatus}
        stageOverview={stageOverview?.stages}
        uiPreferences={uiPreferences}
        onOpenProjectCenter={() => setActivePage('projects')}
        onStageChange={(stage) => {
          setSelectedReviewItemId(null);
          setActiveReviewItemId(null);
          setActivePage('workspace');
          void onStageChange(stage).catch(() => undefined);
        }}
        onNotificationsViewed={handleNotificationsViewed}
        onPreferencesChange={(patch) =>
          setUiPreferences((current) => ({
            ...current,
            ...patch
          }))
        }
      />

      {activePage === 'projects' ? (
        <div className="flex flex-1 overflow-hidden pb-8 pt-16">
          <ProjectCenterPage
            projects={projects}
            currentProject={currentProject}
            isSubmitting={isProjectSubmitting}
            onProjectChange={async (projectId) => {
              setSelectedReviewItemId(null);
              setActiveReviewItemId(null);
              await onProjectChange(projectId);
            }}
            onProjectSubmit={async (payload) => {
              setSelectedReviewItemId(null);
              setActiveReviewItemId(null);
              await onProjectSubmit(payload);
            }}
            onOpenWorkspace={() => setActivePage('workspace')}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden pb-8 pt-16">
          <AnimatePresence mode="wait">
            {!isOntologyPanelCollapsed && (
              <OntologyPanel
                ontology={appState.ontology}
                highlightedPath={highlightedOntologyPath}
                isCollapsed={isOntologyPanelCollapsed}
                onToggleCollapse={() => setIsOntologyPanelCollapsed((current) => !current)}
              />
            )}
          </AnimatePresence>

          {isOntologyPanelCollapsed && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setIsOntologyPanelCollapsed(false)}
              className="fixed left-0 top-1/2 z-30 -translate-y-1/2 rounded-r-lg border border-l-0 border-border/50 p-2 transition-colors hover:bg-muted/50 glass"
            >
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          )}

          <div className="min-w-0 flex-1 overflow-hidden px-4 py-4">
            {errorMessage && <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">{errorMessage}</div>}
            {isLoadingAppState && (
              <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-700">
                正在切换评审阶段并加载对应数据...
              </div>
            )}

            <ReviewWorkspace
              project={currentProject}
              reviewItems={appState.reviewItems}
              reviewHistoryByItem={historyByItem}
              generatedReferencesByItem={generatedReferencesByItem}
              stageOverview={stageOverview?.stages}
              userRole={userRole}
              permissions={reviewPermissions}
              savingItemId={savingItemId}
              generatingItemId={generatingItemId}
              historyLoadingItemId={historyLoadingItemId}
              isReasoningVisible={Boolean(selectedReviewItem)}
              onShowReasoning={handleShowReasoning}
              onLoadHistory={onEnsureReviewHistory}
              onActiveReviewItemChange={setActiveReviewItemId}
              onSaveReviewItem={onSaveReviewItem}
              onGenerateComment={onGenerateComment}
            />
          </div>

          <AnimatePresence mode="wait">
            <ReasoningPanel
              reviewItem={selectedReviewItem}
              reasoning={selectedReasoning}
              isLoading={reasoningLoadingItemId === selectedReviewItem?.id}
              onClose={() => setSelectedReviewItemId(null)}
            />
          </AnimatePresence>
        </div>
      )}

      {uiPreferences.showBottomStatusBar && <BottomStatusBar status={appState.systemStatus} />}

      {activePage === 'workspace' && uiPreferences.showFloatingChat && (
        <FloatingChat
          messages={chatMessages}
          quickActions={appState.chatConfig.quickActions}
          isPending={isChatPending}
          activeReviewItem={activeReviewItem}
          onSendMessage={(message) => onSendChat(message, activeReviewItem?.id)}
        />
      )}
    </div>
  );
}

function MobileDashboard({
  appState,
  chatMessages,
  reasoningByItem,
  historyByItem,
  generatedReferencesByItem,
  isChatPending,
  savingItemId,
  generatingItemId,
  reasoningLoadingItemId,
  historyLoadingItemId,
  errorMessage,
  onEnsureReasoning,
  onEnsureReviewHistory,
  onSendChat,
  onSaveReviewItem,
  onGenerateComment
}: {
  appState: NonNullable<ReturnType<typeof useReviewApp>['appState']>;
  chatMessages: ReturnType<typeof useReviewApp>['chatMessages'];
  reasoningByItem: ReturnType<typeof useReviewApp>['reasoningByItem'];
  historyByItem: ReturnType<typeof useReviewApp>['historyByItem'];
  generatedReferencesByItem: ReturnType<typeof useReviewApp>['generatedReferencesByItem'];
  isChatPending: boolean;
  savingItemId: string | null;
  generatingItemId: string | null;
  reasoningLoadingItemId: string | null;
  historyLoadingItemId: string | null;
  errorMessage: string | null;
  onEnsureReasoning: (item: ReviewItem) => Promise<unknown>;
  onEnsureReviewHistory: (itemId: string) => Promise<unknown>;
  onSendChat: (message: string, itemId?: string) => void;
  onSaveReviewItem: (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => Promise<unknown> | void;
  onGenerateComment: (item: ReviewItem) => Promise<string | void> | string | void;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [activeReviewItemId, setActiveReviewItemId] = useState<string | null>(null);
  const [isOntologyDrawerOpen, setIsOntologyDrawerOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);
  const stats = buildReviewStats(appState.reviewItems);
  const selectedReviewItem = appState.reviewItems.find((item) => item.id === selectedReviewItemId) ?? null;
  const activeReviewItem = appState.reviewItems.find((item) => item.id === activeReviewItemId) ?? null;
  const selectedReasoning = selectedReviewItem ? reasoningByItem[selectedReviewItem.id] ?? null : null;

  const handleShowReasoning = (item: ReviewItem) => {
    setSelectedReviewItemId(item.id);
    setActiveReviewItemId(item.id);
    setIsReasoningModalOpen(true);
    void onEnsureReasoning(item).catch(() => undefined);
  };

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);

    switch (tab) {
      case 'ontology':
        setIsOntologyDrawerOpen(true);
        break;
      case 'chat':
        setIsChatModalOpen(true);
        break;
      case 'reasoning':
        if (selectedReviewItem) {
          setIsReasoningModalOpen(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 glass-strong">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Network className="h-4 w-4 text-white" />
            </div>
            <span className="max-w-[150px] truncate text-sm font-semibold">{appState.project.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">{appState.systemStatus.isOnline ? '在线' : '离线'}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {errorMessage && <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">{errorMessage}</div>}

        {activeTab === 'home' && (
          <MobileHomeView
            project={appState.project}
            stats={stats}
            activityFeed={appState.activityFeed}
            systemStatus={appState.systemStatus}
            onViewReview={() => setActiveTab('review')}
            onViewOntology={() => setIsOntologyDrawerOpen(true)}
          />
        )}

        {activeTab === 'review' && (
          <div className="pb-20">
            <div className="mb-4 flex items-center gap-2">
              <button onClick={() => setActiveTab('home')} className="-ml-2 rounded-lg p-2 hover:bg-muted/50">
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <h2 className="text-lg font-semibold">评审工作区</h2>
            </div>

            <ReviewWorkspace
              project={appState.project}
              reviewItems={appState.reviewItems}
              reviewHistoryByItem={historyByItem}
              generatedReferencesByItem={generatedReferencesByItem}
              savingItemId={savingItemId}
              generatingItemId={generatingItemId}
              historyLoadingItemId={historyLoadingItemId}
              onShowReasoning={handleShowReasoning}
              onLoadHistory={onEnsureReviewHistory}
              onActiveReviewItemChange={setActiveReviewItemId}
              onSaveReviewItem={onSaveReviewItem}
              onGenerateComment={onGenerateComment}
            />
          </div>
        )}
      </main>

      <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} hasReasoning={!!selectedReviewItem} />

      <MobileOntologyDrawer
        isOpen={isOntologyDrawerOpen}
        ontology={appState.ontology}
        onClose={() => {
          setIsOntologyDrawerOpen(false);
          if (activeTab === 'ontology') {
            setActiveTab('home');
          }
        }}
      />

      <MobileReasoningModal
        isOpen={isReasoningModalOpen}
        onClose={() => setIsReasoningModalOpen(false)}
        reviewItem={selectedReviewItem}
        reasoning={selectedReasoning}
        isLoading={reasoningLoadingItemId === selectedReviewItem?.id}
      />

      <MobileChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          if (activeTab === 'chat') {
            setActiveTab('home');
          }
        }}
        messages={chatMessages}
        quickActions={appState.chatConfig.quickActions}
        isPending={isChatPending}
        activeReviewItem={activeReviewItem}
        onSendMessage={(message) => onSendChat(message, activeReviewItem?.id)}
      />
    </div>
  );
}

function App() {
  const isMobile = useIsMobile();
  const {
    session,
    currentStage,
    appState,
    projects,
    stageOverview,
    chatMessages,
    reasoningByItem,
    historyByItem,
    generatedReferencesByItem,
    isAuthenticating,
    isLoadingAppState,
    isChatPending,
    isSubmittingProject,
    savingItemId,
    generatingItemId,
    reasoningLoadingItemId,
    historyLoadingItemId,
    errorMessage,
    reloadAppState,
    login,
    changeStage,
    changeProject,
    submitProject,
    ensureReasoning,
    ensureReviewHistory,
    saveReviewItem,
    generateReviewComment,
    sendChat
  } = useReviewApp();

  if (!session) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }}>
          <LoginPage isLoading={isAuthenticating} errorMessage={errorMessage} onLogin={login} />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!appState) {
    return (
      <div>
        <LoadingPage title="正在连接评审服务" message="正在拉取项目、评审项和模拟知识库数据..." />
        {!isLoadingAppState && errorMessage && (
          <div className="fixed inset-x-0 bottom-6 flex justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-background p-4 shadow-lg">
              <p className="text-sm text-amber-700">{errorMessage}</p>
              <Button
                className="mt-3 w-full"
                onClick={() => {
                  void reloadAppState().catch(() => undefined);
                }}
              >
                重试加载
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        {isMobile ? (
          <MobileDashboard
            appState={appState}
            chatMessages={chatMessages}
            reasoningByItem={reasoningByItem}
            historyByItem={historyByItem}
            generatedReferencesByItem={generatedReferencesByItem}
            isChatPending={isChatPending}
            savingItemId={savingItemId}
            generatingItemId={generatingItemId}
            reasoningLoadingItemId={reasoningLoadingItemId}
            historyLoadingItemId={historyLoadingItemId}
            errorMessage={errorMessage}
            onEnsureReasoning={ensureReasoning}
            onEnsureReviewHistory={ensureReviewHistory}
            onSendChat={sendChat}
            onSaveReviewItem={saveReviewItem}
            onGenerateComment={generateReviewComment}
          />
        ) : (
          <DesktopDashboard
            session={session}
            currentStage={currentStage}
            appState={appState}
            projects={projects}
            stageOverview={stageOverview}
            chatMessages={chatMessages}
            reasoningByItem={reasoningByItem}
            historyByItem={historyByItem}
            generatedReferencesByItem={generatedReferencesByItem}
            isChatPending={isChatPending}
            isProjectSubmitting={isSubmittingProject}
            savingItemId={savingItemId}
            generatingItemId={generatingItemId}
            reasoningLoadingItemId={reasoningLoadingItemId}
            historyLoadingItemId={historyLoadingItemId}
            errorMessage={errorMessage}
            isLoadingAppState={isLoadingAppState}
            onEnsureReasoning={ensureReasoning}
            onEnsureReviewHistory={ensureReviewHistory}
            onProjectChange={changeProject}
            onProjectSubmit={submitProject}
            onStageChange={changeStage}
            onSendChat={sendChat}
            onSaveReviewItem={saveReviewItem}
            onGenerateComment={generateReviewComment}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default App;
