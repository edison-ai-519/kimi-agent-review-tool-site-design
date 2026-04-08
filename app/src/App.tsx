import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopNavigation } from '@/components/navigation/TopNavigation';
import { BottomStatusBar } from '@/components/navigation/BottomStatusBar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { OntologyPanel } from '@/components/panels/OntologyPanel';
import { ReviewWorkspace } from '@/components/panels/ReviewWorkspace';
import { ReasoningPanel } from '@/components/panels/ReasoningPanel';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { MobileOntologyDrawer } from '@/components/mobile/MobileOntologyDrawer';
import { MobileReasoningModal } from '@/components/mobile/MobileReasoningModal';
import { MobileChatModal } from '@/components/mobile/MobileChatModal';
import { MobileHomeView } from '@/components/mobile/MobileHomeView';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Network,
  CheckCircle2
} from 'lucide-react';
import type { UserRole, ReviewStage, ProjectInfo, ReviewItem, SystemStatus } from '@/types';
import './App.css';

// Mock data
const mockProject: ProjectInfo = {
  id: '1',
  name: '基于深度学习的智能医疗影像诊断系统',
  applicant: '清华大学计算机科学与技术系',
  budget: '500万元',
  duration: '2024.01 - 2026.12',
  field: '人工智能/医疗健康',
  stage: 'proposal'
};

const mockSystemStatus: SystemStatus = {
  version: '2.1.0',
  lastUpdate: new Date(),
  ontologyVersion: '3.5.2',
  confidence: 0.87,
  isOnline: true
};

type MobileTab = 'home' | 'ontology' | 'review' | 'reasoning' | 'chat';

// Login Page Component
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl"
          style={{ top: '-200px', left: '-200px' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-3xl"
          style={{ bottom: '-150px', right: '-150px' }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Network className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
            >
              本体智能评审系统
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-blue-200 text-sm sm:text-base"
            >
              透明 · 可解释 · 高效
            </motion.p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, rotateX: 90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl text-white text-center">用户登录</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-blue-200 mb-1.5 block">用户名</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="请输入用户名"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 h-11"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-blue-200 mb-1.5 block">密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 h-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-11"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        登录
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>评审专家入口</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>申报方入口</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            {[
              { icon: Network, label: '本体驱动' },
              { icon: Sparkles, label: '智能推理' },
              { icon: CheckCircle2, label: '透明可解释' },
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-blue-300" />
                </div>
                <span className="text-sm text-blue-200">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Desktop Dashboard Component
function DesktopDashboard() {
  const [userRole, setUserRole] = useState<UserRole>('expert');
  const [currentStage, setCurrentStage] = useState<ReviewStage>('proposal');
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewItem | null>(null);
  const [isOntologyPanelCollapsed, setIsOntologyPanelCollapsed] = useState(false);
  const [highlightedOntologyPath, setHighlightedOntologyPath] = useState<string[]>([]);

  const handleShowReasoning = (item: ReviewItem) => {
    setSelectedReviewItem(item);
    setHighlightedOntologyPath(['feasibility', 'tech-maturity', 'risk']);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <TopNavigation
        userRole={userRole}
        currentStage={currentStage}
        project={mockProject}
        ontologyVersion={mockSystemStatus.ontologyVersion}
        onRoleChange={setUserRole}
        onStageChange={setCurrentStage}
      />

      {/* Main Content */}
      <div className="flex-1 flex pt-16 pb-8 overflow-hidden">
        {/* Left: Ontology Panel */}
        <AnimatePresence mode="wait">
          {!isOntologyPanelCollapsed && (
            <OntologyPanel 
              highlightedPath={highlightedOntologyPath}
              isCollapsed={isOntologyPanelCollapsed}
              onToggleCollapse={() => setIsOntologyPanelCollapsed(!isOntologyPanelCollapsed)}
            />
          )}
        </AnimatePresence>
        
        {/* Collapsed toggle button */}
        {isOntologyPanelCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOntologyPanelCollapsed(false)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-r-lg glass border border-l-0 border-border/50 hover:bg-muted/50 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}

        {/* Center: Review Workspace */}
        <div className="flex-1 overflow-hidden px-4 py-4">
          <ReviewWorkspace 
            project={mockProject}
            onShowReasoning={handleShowReasoning}
          />
        </div>

        {/* Right: Reasoning Panel */}
        <AnimatePresence mode="wait">
          <ReasoningPanel 
            reviewItem={selectedReviewItem}
            onClose={() => setSelectedReviewItem(null)}
          />
        </AnimatePresence>
      </div>

      {/* Bottom Status Bar */}
      <BottomStatusBar status={mockSystemStatus} />

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}

// Mobile Dashboard Component
function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewItem | null>(null);
  const [isOntologyDrawerOpen, setIsOntologyDrawerOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);

  const handleShowReasoning = (item: ReviewItem) => {
    setSelectedReviewItem(item);
    setIsReasoningModalOpen(true);
  };

  // Handle tab changes
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm truncate max-w-[150px]">
              {mockProject.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">在线</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {activeTab === 'home' && (
          <MobileHomeView 
            onViewReview={() => setActiveTab('review')}
            onViewOntology={() => setIsOntologyDrawerOpen(true)}
          />
        )}
        
        {activeTab === 'review' && (
          <div className="pb-20">
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => setActiveTab('home')}
                className="p-2 -ml-2 rounded-lg hover:bg-muted/50"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <h2 className="font-semibold text-lg">评审工作区</h2>
            </div>
            <ReviewWorkspace 
              project={mockProject}
              onShowReasoning={handleShowReasoning}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasReasoning={!!selectedReviewItem}
      />

      {/* Mobile Modals/Drawers */}
      <MobileOntologyDrawer 
        isOpen={isOntologyDrawerOpen}
        onClose={() => {
          setIsOntologyDrawerOpen(false);
          if (activeTab === 'ontology') setActiveTab('home');
        }}
      />

      <MobileReasoningModal
        isOpen={isReasoningModalOpen}
        onClose={() => setIsReasoningModalOpen(false)}
        reviewItem={selectedReviewItem}
      />

      <MobileChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          if (activeTab === 'chat') setActiveTab('home');
        }}
      />
    </div>
  );
}

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isMobile = useIsMobile();

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div
          key="login"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <LoginPage onLogin={() => setIsLoggedIn(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {isMobile ? <MobileDashboard /> : <DesktopDashboard />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
