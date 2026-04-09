import { useState, type ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Bell, BookOpen, CheckCircle2, ChevronDown, Clock, Layers, Settings, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { ProjectInfo, ReviewStage, UserRole } from '@/types';

interface TopNavigationProps {
  userRole: UserRole;
  currentStage: ReviewStage;
  project: ProjectInfo;
  ontologyVersion: string;
  onRoleChange?: (role: UserRole) => void;
  onStageChange?: (stage: ReviewStage) => void;
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

export function TopNavigation({ userRole, currentStage, project, ontologyVersion, onRoleChange, onStageChange }: TopNavigationProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="hidden max-w-[150px] truncate sm:inline">{project.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <DropdownMenuLabel>当前评审项目</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.applicant}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={isStageMenuOpen} onOpenChange={setIsStageMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                <Badge className={`${stageColors[currentStage]} text-white text-xs`}>{stageLabels[currentStage]}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>切换评审阶段</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(stageLabels) as ReviewStage[]).map((stage) => (
                <DropdownMenuItem key={stage} onClick={() => onStageChange?.(stage)} className="gap-2">
                  <div className={`h-2 w-2 rounded-full ${stageColors[stage]}`} />
                  {stageLabels[stage]}
                  {stage === currentStage && <CheckCircle2 className="ml-auto h-4 w-4 text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <Clock className="h-3 w-3" />
            <span>本体 v{ontologyVersion}</span>
          </div>

          <Button variant="ghost" size="icon" className="relative hover:bg-muted/50">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </Button>

          <DropdownMenu open={isRoleMenuOpen} onOpenChange={setIsRoleMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-muted/50">
                {roleIcons[userRole]}
                <span className="hidden sm:inline">{roleLabels[userRole]}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>切换用户角色</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <DropdownMenuItem key={role} onClick={() => onRoleChange?.(role)} className="gap-2">
                  {roleIcons[role]}
                  {roleLabels[role]}
                  {role === userRole && <CheckCircle2 className="ml-auto h-4 w-4 text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="hover:bg-muted/50">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
