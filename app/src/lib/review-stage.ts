import type { ReviewStage, ReviewStageOverview, ReviewStageStatus, ReviewStatus } from '@/types';

export const reviewStageOrder: ReviewStage[] = ['proposal', 'midterm', 'final'];

export const reviewStageLabelMap: Record<ReviewStage, string> = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收'
};

export interface ReviewStageConfig {
  label: string;
  title: string;
  description: string;
  focusAreas: string[];
  workflowSteps: string[];
  assistantHint: string;
  progressLabel: string;
  saveLabel: string;
  submitLabel: string;
  secondaryActionLabel: string;
  secondaryActionStatus: ReviewStatus;
}

const stageAwareStatusLabels: Record<ReviewStage, Record<ReviewStatus, string>> = {
  proposal: {
    draft: '立项草稿',
    pending: '待立项评审',
    in_review: '专家会商中',
    needs_revision: '待补论证材料',
    reviewed: '已形成立项意见',
    disputed: '需会审决策'
  },
  midterm: {
    draft: '阶段草稿',
    pending: '待中期检查',
    in_review: '阶段复核中',
    needs_revision: '待补阶段材料',
    reviewed: '已完成中检',
    disputed: '存在阶段风险'
  },
  final: {
    draft: '终验草稿',
    pending: '待结题验收',
    in_review: '终验复核中',
    needs_revision: '待补验收材料',
    reviewed: '已完成结题',
    disputed: '需终验复议'
  }
};

const reviewStageConfigMap: Record<ReviewStage, ReviewStageConfig> = {
  proposal: {
    label: reviewStageLabelMap.proposal,
    title: '立项阶段重点判断项目是否值得进入执行期',
    description: '这一阶段需要聚焦创新性、技术可行性、团队支撑和预算合理性，形成是否建议立项的明确意见。',
    focusAreas: ['创新亮点', '技术落地', '团队支撑', '预算匹配'],
    workflowSteps: ['材料受理与分发', '专家打分与依据核验', '形成立项意见'],
    assistantHint: '更适合追问创新点、预算争议、技术路线可行性和立项风险。',
    progressLabel: '立项意见形成度',
    saveLabel: '保存立项草稿',
    submitLabel: '提交立项意见',
    secondaryActionLabel: '要求补充论证',
    secondaryActionStatus: 'needs_revision'
  },
  midterm: {
    label: reviewStageLabelMap.midterm,
    title: '中期阶段重点判断项目是否按计划推进',
    description: '这一阶段需要核对里程碑达成度、样机与数据交付质量、风险整改闭环以及阶段经费执行情况。',
    focusAreas: ['里程碑进展', '样机交付', '风险闭环', '经费执行'],
    workflowSteps: ['核对阶段成果', '复查风险与偏差', '形成中期检查结论'],
    assistantHint: '更适合追问阶段成果是否达标、偏差原因、风险整改效果和资源投入合理性。',
    progressLabel: '中期检查完成度',
    saveLabel: '保存中检草稿',
    submitLabel: '提交中期检查结论',
    secondaryActionLabel: '要求补充阶段材料',
    secondaryActionStatus: 'needs_revision'
  },
  final: {
    label: reviewStageLabelMap.final,
    title: '结题阶段重点判断成果是否达到验收标准',
    description: '这一阶段需要核对成果完成度、质量与推广价值、知识产权与转化准备，以及结题材料完整性。',
    focusAreas: ['成果兑现', '推广价值', '转化准备', '验收材料'],
    workflowSteps: ['核验最终成果', '组织终验复核', '形成验收结论'],
    assistantHint: '更适合追问终验结论边界、成果推广性、知识产权准备和决算材料完整性。',
    progressLabel: '终验结论达成度',
    saveLabel: '保存终验草稿',
    submitLabel: '提交结题验收结论',
    secondaryActionLabel: '转入终验复核',
    secondaryActionStatus: 'in_review'
  }
};

const reviewStageStatusLabelMap: Record<ReviewStageStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  blocked: '存在阻塞',
  completed: '已完成'
};

export function getReviewStageConfig(stage: ReviewStage) {
  return reviewStageConfigMap[stage];
}

export function getStageAwareStatusLabel(stage: ReviewStage, status: ReviewStatus) {
  return stageAwareStatusLabels[stage][status];
}

export function getReviewStageStatusLabel(status: ReviewStageStatus) {
  return reviewStageStatusLabelMap[status];
}

export function buildStageRecommendation(stageOverview: ReviewStageOverview) {
  if (stageOverview.disputed > 0) {
    return `当前阶段还有 ${stageOverview.disputed} 个争议项，建议先组织会审后再流转。`;
  }

  if (stageOverview.needsRevision > 0) {
    return `当前阶段还有 ${stageOverview.needsRevision} 个待补材料项，建议先补齐支撑材料。`;
  }

  if (stageOverview.pending > 0) {
    return `当前阶段还有 ${stageOverview.pending} 个待处理项，建议继续完成评审清单。`;
  }

  if (stageOverview.total > 0 && stageOverview.completed === stageOverview.total) {
    return '当前阶段评审项已全部完成，可以进入下一阶段。';
  }

  return stageOverview.recommendation;
}
