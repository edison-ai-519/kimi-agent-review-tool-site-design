import type { ReviewItem, ReviewStats, ReviewStatus } from '@/types';

export type ReviewListFilter = 'all' | 'pending' | 'needs_revision' | 'disputed' | 'reviewed';
export type ReviewListSort = 'priority' | 'confidence-desc' | 'score-desc' | 'title-asc';

export const reviewStatusLabelMap: Record<ReviewStatus, string> = {
  draft: '草稿',
  pending: '待评审',
  in_review: '复核中',
  needs_revision: '待补材料',
  reviewed: '已评审',
  disputed: '有争议'
};

const pendingStatuses: ReviewStatus[] = ['draft', 'pending', 'in_review', 'needs_revision'];

export function isCompletedReviewStatus(status: ReviewStatus) {
  return status === 'reviewed';
}

export function isPendingReviewStatus(status: ReviewStatus) {
  return pendingStatuses.includes(status);
}

export function buildReviewStats(reviewItems: ReviewItem[]): ReviewStats {
  const completed = reviewItems.filter((item) => isCompletedReviewStatus(item.status)).length;
  const pending = reviewItems.filter((item) => isPendingReviewStatus(item.status)).length;
  const disputed = reviewItems.filter((item) => item.status === 'disputed').length;
  const avgConfidence =
    reviewItems.length === 0 ? 0 : reviewItems.reduce((sum, item) => sum + item.confidence, 0) / reviewItems.length;

  return {
    total: reviewItems.length,
    completed,
    pending,
    disputed,
    avgConfidence
  };
}

export function matchesReviewFilter(item: ReviewItem, filter: ReviewListFilter) {
  switch (filter) {
    case 'pending':
      return isPendingReviewStatus(item.status);
    case 'needs_revision':
      return item.status === 'needs_revision';
    case 'disputed':
      return item.status === 'disputed';
    case 'reviewed':
      return isCompletedReviewStatus(item.status);
    default:
      return true;
  }
}

function getReviewSortPriority(status: ReviewStatus) {
  switch (status) {
    case 'disputed':
      return 0;
    case 'needs_revision':
      return 1;
    case 'pending':
      return 2;
    case 'in_review':
      return 3;
    case 'draft':
      return 4;
    case 'reviewed':
      return 5;
    default:
      return 6;
  }
}

export function sortReviewItems(reviewItems: ReviewItem[], sortBy: ReviewListSort) {
  return [...reviewItems].sort((left, right) => {
    switch (sortBy) {
      case 'confidence-desc':
        return right.confidence - left.confidence;
      case 'score-desc':
        return (right.score ?? -1) - (left.score ?? -1);
      case 'title-asc':
        return left.title.localeCompare(right.title, 'zh-CN');
      case 'priority':
      default: {
        const priorityDiff = getReviewSortPriority(left.status) - getReviewSortPriority(right.status);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const updatedAtDiff =
          new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
        if (updatedAtDiff !== 0) {
          return updatedAtDiff;
        }

        return right.confidence - left.confidence;
      }
    }
  });
}
