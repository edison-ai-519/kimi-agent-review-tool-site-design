import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDown, 
  User, 
  Settings, 
  Bell, 
  BookOpen, 
  Layers, 
  CheckCircle2,
  Clock,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole, ReviewStage, ProjectInfo } from '@/types';

interface TopNavigationProps {
  userRole: UserRole;
  currentStage: ReviewStage;
  project: ProjectInfo;
  ontologyVersion: string;
  onRoleChange?: (role: UserRole) => void;
  onStageChange?: (stage: ReviewStage) => void;
  onProjectChange?: (project: ProjectInfo) => void;
}

const roleLabels: Record<UserRole, string> = {
  expert: '评审专家',
  applicant: '申报方',
  admin: '管理员'
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  expert: <CheckCircle2 className="w-4 h-4" />,
  applicant: <User className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />
};

const stageLabels: Record<ReviewStage, string> = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收'
};

const stageColors: Record<ReviewStage, string> = {
  proposal: 'bg-blue-500',
  midterm: 'bg-amber-500',
  final: 'bg-emerald-500'
};

export function TopNavigation({
  userRole,
  currentStage,
  project,
  ontologyVersion,
  onRoleChange,
  onStageChange,
}: TopNavigationProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 h-16"
    >
      <div className="glass-strong h-full px-4 lg:px-6 flex items-center justify-between border-b border-border/50">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">本体智能评审系统</span>
          </motion.div>
        </div>

        {/* Center: Project & Stage */}
        <div className="flex items-center gap-4">
          {/* Project Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="max-w-[150px] truncate hidden sm:inline">{project.name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <DropdownMenuLabel>切换评审项目</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.applicant}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stage Selector */}
          <DropdownMenu open={isStageMenuOpen} onOpenChange={setIsStageMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <Badge className={`${stageColors[currentStage]} text-white text-xs`}>
                  {stageLabels[currentStage]}
                </Badge>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>切换评审阶段</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(stageLabels) as ReviewStage[]).map((stage) => (
                <DropdownMenuItem
                  key={stage}
                  onClick={() => onStageChange?.(stage)}
                  className="gap-2"
                >
                  <div className={`w-2 h-2 rounded-full ${stageColors[stage]}`} />
                  {stageLabels[stage]}
                  {stage === currentStage && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Role, Notifications, Settings */}
        <div className="flex items-center gap-2">
          {/* Ontology Version */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50">
            <Clock className="w-3 h-3" />
            <span>本体 v{ontologyVersion}</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-muted/50">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </Button>

          {/* Role Selector */}
          <DropdownMenu open={isRoleMenuOpen} onOpenChange={setIsRoleMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                {roleIcons[userRole]}
                <span className="hidden sm:inline">{roleLabels[userRole]}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>切换用户角色</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => onRoleChange?.(role)}
                  className="gap-2"
                >
                  {roleIcons[role]}
                  {roleLabels[role]}
                  {role === userRole && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button variant="ghost" size="icon" className="hover:bg-muted/50">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
