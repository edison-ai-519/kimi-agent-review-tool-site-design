import type { UserRole } from '@/types';

export interface ReviewWorkspacePermissions {
  canEditScore: boolean;
  canEditComment: boolean;
  canChangeStatus: boolean;
  canGenerateComment: boolean;
  canSaveDraft: boolean;
  canMarkDisputed: boolean;
  canSubmitReview: boolean;
  canViewReasoning: boolean;
  canUseChat: boolean;
  summary: string;
}

export function getReviewWorkspacePermissions(role: UserRole): ReviewWorkspacePermissions {
  switch (role) {
    case 'applicant':
      return {
        canEditScore: false,
        canEditComment: false,
        canChangeStatus: false,
        canGenerateComment: false,
        canSaveDraft: false,
        canMarkDisputed: false,
        canSubmitReview: false,
        canViewReasoning: true,
        canUseChat: true,
        summary: '申报方视角下仅可查看评审结果、依据和历史，不可直接修改评分或结论。'
      };
    case 'admin':
      return {
        canEditScore: false,
        canEditComment: false,
        canChangeStatus: true,
        canGenerateComment: false,
        canSaveDraft: true,
        canMarkDisputed: true,
        canSubmitReview: false,
        canViewReasoning: true,
        canUseChat: true,
        summary: '管理员视角可跟踪流程状态和争议项，但不直接参与专家评分。'
      };
    case 'expert':
    default:
      return {
        canEditScore: true,
        canEditComment: true,
        canChangeStatus: true,
        canGenerateComment: true,
        canSaveDraft: true,
        canMarkDisputed: true,
        canSubmitReview: true,
        canViewReasoning: true,
        canUseChat: true,
        summary: '评审专家视角可执行完整评审，包括评分、生成辅助意见和提交结论。'
      };
  }
}
