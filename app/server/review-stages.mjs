export const REVIEW_STAGES = ['proposal', 'midterm', 'final'];

export const REVIEW_STAGE_LABELS = {
  proposal: '立项评审',
  midterm: '中期检查',
  final: '结题验收'
};

const proposalChatConfig = {
  welcomeMessage: '当前处于立项评审阶段，我可以协助你判断创新性、可行性、团队支撑能力和预算合理性。',
  quickActions: ['概括创新亮点', '评估技术路线可行性', '解释预算争议', '生成立项意见']
};

const midtermReviewItems = [
  {
    id: 'midterm-1',
    title: '阶段目标达成度',
    description: '评估当前阶段里程碑、关键指标和任务拆解是否按计划推进，是否存在明显偏差。',
    status: 'reviewed',
    confidence: 0.84,
    score: 24,
    maxScore: 30,
    comment: '主要技术里程碑已按计划完成，建议补充与申报书目标的逐项映射，便于阶段性验收。'
  },
  {
    id: 'midterm-2',
    title: '样机与数据交付质量',
    description: '评估阶段样机、原型系统、数据集和实验结果是否达到承诺水平，交付物是否可复核。',
    status: 'in_review',
    confidence: 0.79,
    score: 18,
    maxScore: 25,
    comment: '原型系统已具备演示能力，但需要补充核心指标复现实验和样本来源说明。'
  },
  {
    id: 'midterm-3',
    title: '风险整改与问题闭环',
    description: '评估前期识别出的技术风险、资源风险与协同问题是否形成闭环，整改节奏是否清晰。',
    status: 'needs_revision',
    confidence: 0.68,
    score: 12,
    maxScore: 20,
    comment: '针对数据质量波动和模型泛化不足的问题已有整改方案，但还需补充验证结果。'
  },
  {
    id: 'midterm-4',
    title: '阶段经费执行与资源利用',
    description: '评估阶段经费执行进度、资源投入结构和设备利用情况是否与任务推进匹配。',
    status: 'pending',
    confidence: 0.72,
    maxScore: 25
  }
];

const midtermActivityFeed = [
  {
    id: 'midterm-activity-1',
    action: '完成阶段目标复核',
    target: '阶段目标达成度',
    type: 'success',
    createdAt: '2026-04-09T09:20:00.000Z'
  },
  {
    id: 'midterm-activity-2',
    action: '要求补充阶段材料',
    target: '风险整改与问题闭环',
    type: 'warning',
    createdAt: '2026-04-09T08:55:00.000Z'
  },
  {
    id: 'midterm-activity-3',
    action: '查看阶段依据',
    target: '样机与数据交付质量',
    type: 'info',
    createdAt: '2026-04-09T08:10:00.000Z'
  }
];

const finalReviewItems = [
  {
    id: 'final-1',
    title: '成果完成度与目标兑现',
    description: '评估项目最终成果是否覆盖申报目标，关键指标和交付承诺是否兑现。',
    status: 'reviewed',
    confidence: 0.9,
    score: 28,
    maxScore: 30,
    comment: '主要目标基本完成，建议在终验结论中明确目标兑现范围和未完成项边界。'
  },
  {
    id: 'final-2',
    title: '成果质量与可推广性',
    description: '评估最终模型、系统、实验结论和示范效果是否稳定，是否具备推广应用基础。',
    status: 'in_review',
    confidence: 0.8,
    score: 19,
    maxScore: 25,
    comment: '整体结果较好，但还需要补充不同场景下的稳定性验证和推广资源配套说明。'
  },
  {
    id: 'final-3',
    title: '知识产权与成果转化准备',
    description: '评估专利、软件著作权、论文和成果转化计划是否完整，是否具备后续落地路径。',
    status: 'pending',
    confidence: 0.7,
    maxScore: 25
  },
  {
    id: 'final-4',
    title: '结题材料完整性与经费决算',
    description: '评估结题报告、验收附件、决算说明和支撑材料是否完整，是否满足终验要求。',
    status: 'needs_revision',
    confidence: 0.64,
    score: 14,
    maxScore: 20,
    comment: '结题附件基本齐备，但经费决算说明还需要补充设备折旧、运维和剩余预算处理依据。'
  }
];

const finalActivityFeed = [
  {
    id: 'final-activity-1',
    action: '完成成果兑现初审',
    target: '成果完成度与目标兑现',
    type: 'success',
    createdAt: '2026-04-09T09:35:00.000Z'
  },
  {
    id: 'final-activity-2',
    action: '转入终验复核',
    target: '成果质量与可推广性',
    type: 'info',
    createdAt: '2026-04-09T09:00:00.000Z'
  },
  {
    id: 'final-activity-3',
    action: '要求补充验收材料',
    target: '结题材料完整性与经费决算',
    type: 'warning',
    createdAt: '2026-04-09T08:40:00.000Z'
  }
];

const reviewStageDefinitions = {
  proposal: {
    chatConfig: proposalChatConfig,
    itemContexts: {
      '1': {
        ontologyPathIds: ['root', 'innovation', 'novelty'],
        ontologyPathLabels: ['创新性', '技术新颖性'],
        reasoningHint: '需要重点判断方案是否具有明确创新点和可比优势。'
      },
      '2': {
        ontologyPathIds: ['root', 'feasibility', 'tech-maturity'],
        ontologyPathLabels: ['可行性', '技术成熟度'],
        reasoningHint: '需要核验关键技术、数据来源和实施路径是否具备落地条件。'
      },
      '3': {
        ontologyPathIds: ['root', 'team', 'team-structure'],
        ontologyPathLabels: ['团队能力', '团队结构'],
        reasoningHint: '需要判断团队构成、负责人经验和协作机制是否能够支撑立项。'
      },
      '4': {
        ontologyPathIds: ['root', 'budget', 'procurement'],
        ontologyPathLabels: ['预算结构', '设备采购'],
        reasoningHint: '需要判断预算分配、设备采购和数据成本是否与研究目标一致。'
      }
    }
  },
  midterm: {
    chatConfig: {
      welcomeMessage: '当前处于中期检查阶段，我可以帮助你核对里程碑进展、样机交付质量、风险整改和经费执行。',
      quickActions: ['核对里程碑达成度', '分析阶段风险闭环', '梳理样机交付问题', '生成中期检查结论']
    },
    reviewItems: midtermReviewItems,
    activityFeed: midtermActivityFeed,
    itemContexts: {
      'midterm-1': {
        ontologyPathIds: ['root', 'feasibility', 'deployment-path'],
        ontologyPathLabels: ['可行性', '实施路径'],
        reasoningHint: '重点核验阶段里程碑、任务偏差和计划闭环。'
      },
      'midterm-2': {
        ontologyPathIds: ['root', 'feasibility', 'data-readiness'],
        ontologyPathLabels: ['可行性', '数据准备度'],
        reasoningHint: '重点判断样机、原型和数据交付是否达到中期复核标准。'
      },
      'midterm-3': {
        ontologyPathIds: ['root', 'risk', 'tech-risk'],
        ontologyPathLabels: ['风险控制', '技术风险'],
        reasoningHint: '重点核验风险整改措施是否形成闭环并得到验证。'
      },
      'midterm-4': {
        ontologyPathIds: ['root', 'budget', 'annotation-cost'],
        ontologyPathLabels: ['预算结构', '数据与标注成本'],
        reasoningHint: '重点判断阶段经费执行节奏和资源投入是否与任务推进匹配。'
      }
    }
  },
  final: {
    chatConfig: {
      welcomeMessage: '当前处于结题验收阶段，我可以帮助你判断成果完成度、推广价值、转化准备和结题材料完整性。',
      quickActions: ['总结终验亮点', '评估成果推广性', '梳理转化准备情况', '生成结题验收意见']
    },
    reviewItems: finalReviewItems,
    activityFeed: finalActivityFeed,
    itemContexts: {
      'final-1': {
        ontologyPathIds: ['root', 'innovation', 'advancement'],
        ontologyPathLabels: ['创新性', '技术先进性'],
        reasoningHint: '重点判断最终成果是否兑现项目目标并保持技术先进性。'
      },
      'final-2': {
        ontologyPathIds: ['root', 'feasibility', 'deployment-path'],
        ontologyPathLabels: ['可行性', '实施路径'],
        reasoningHint: '重点判断成果质量是否稳定，以及是否具备推广应用条件。'
      },
      'final-3': {
        ontologyPathIds: ['root', 'team', 'coordination'],
        ontologyPathLabels: ['团队能力', '协作机制'],
        reasoningHint: '重点核验知识产权布局、成果转化路径和协同机制是否完善。'
      },
      'final-4': {
        ontologyPathIds: ['root', 'risk', 'management-risk'],
        ontologyPathLabels: ['风险控制', '管理风险'],
        reasoningHint: '重点核验结题材料、决算说明和验收附件是否完整可核查。'
      }
    }
  }
};

const stageStatusLabels = {
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

const stageActionLabels = {
  proposal: {
    reviewed: '提交立项意见',
    disputed: '标记需会审事项',
    needs_revision: '要求补充论证',
    in_review: '转入专家会商',
    draft: '保存立项草稿',
    pending: '更新立项评审项'
  },
  midterm: {
    reviewed: '提交中期检查结论',
    disputed: '标记阶段风险',
    needs_revision: '要求补充阶段材料',
    in_review: '转入阶段复核',
    draft: '保存中检草稿',
    pending: '更新中期检查项'
  },
  final: {
    reviewed: '提交结题验收结论',
    disputed: '标记终验争议',
    needs_revision: '要求补充验收材料',
    in_review: '转入终验复核',
    draft: '保存终验草稿',
    pending: '更新结题验收项'
  }
};

const itemContextById = new Map();

for (const stage of REVIEW_STAGES) {
  const stageDefinition = reviewStageDefinitions[stage];
  for (const [itemId, context] of Object.entries(stageDefinition.itemContexts)) {
    itemContextById.set(itemId, {
      stage,
      ...context
    });
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapBaseReviewItems(reviewItems) {
  return reviewItems.map((item) => ({
    ...item
  }));
}

function mapBaseActivityFeed(activityFeed) {
  return activityFeed.map((activity) => ({
    ...activity
  }));
}

function mapSubmittedReviewItems(reviewItems) {
  return reviewItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: 'pending',
    confidence: Math.min(Math.max(Number(item.confidence ?? 0.72), 0.62), 0.78),
    maxScore: item.maxScore
  }));
}

function buildSubmittedActivityFeed(project, submittedAt, stage) {
  if (stage !== 'proposal') {
    return [];
  }

  return [
    {
      id: `activity-${project.id}-submitted`,
      action: '提交项目',
      target: project.name,
      type: 'info',
      createdAt: submittedAt
    }
  ];
}

export function isReviewStage(value) {
  return REVIEW_STAGES.includes(value);
}

export function createStageSeeds(appStateSeed, options = {}) {
  const project = options.project ?? appStateSeed.project;
  const mode = options.mode ?? 'demo';
  const submittedAt = options.submittedAt ?? new Date().toISOString();
  const mapReviewItems = mode === 'submitted' ? mapSubmittedReviewItems : mapBaseReviewItems;
  const mapActivityFeed =
    mode === 'submitted'
      ? (_activityFeed, stage) => buildSubmittedActivityFeed(project, submittedAt, stage)
      : (activityFeed) => mapBaseActivityFeed(activityFeed);

  return {
    proposal: {
      project: {
        ...project,
        stage: 'proposal'
      },
      chatConfig: clone(reviewStageDefinitions.proposal.chatConfig),
      reviewItems: mapReviewItems(appStateSeed.reviewItems),
      activityFeed: mapActivityFeed(appStateSeed.activityFeed, 'proposal')
    },
    midterm: {
      project: {
        ...project,
        stage: 'midterm'
      },
      chatConfig: clone(reviewStageDefinitions.midterm.chatConfig),
      reviewItems: mapReviewItems(reviewStageDefinitions.midterm.reviewItems),
      activityFeed: mapActivityFeed(reviewStageDefinitions.midterm.activityFeed, 'midterm')
    },
    final: {
      project: {
        ...project,
        stage: 'final'
      },
      chatConfig: clone(reviewStageDefinitions.final.chatConfig),
      reviewItems: mapReviewItems(reviewStageDefinitions.final.reviewItems),
      activityFeed: mapActivityFeed(reviewStageDefinitions.final.activityFeed, 'final')
    }
  };
}

export function getStageByItemId(itemId) {
  return itemContextById.get(itemId)?.stage ?? null;
}

export function getStageItemContext(itemId) {
  const context = itemContextById.get(itemId);
  return context ? clone(context) : null;
}

export function getStageReviewStatusLabel(stage, status) {
  return stageStatusLabels[stage]?.[status] ?? status;
}

export function getStageActionLabel(stage, status) {
  return stageActionLabels[stage]?.[status] ?? '更新评审项';
}

export function buildFallbackReasoningSeed(itemId, reviewItem) {
  const itemContext = getStageItemContext(itemId);
  if (!itemContext) {
    return null;
  }

  const stageLabel = REVIEW_STAGE_LABELS[itemContext.stage];
  const ontologyLabel = itemContext.ontologyPathLabels.at(-1) ?? reviewItem.title;

  return {
    itemId,
    ontologyPathIds: clone(itemContext.ontologyPathIds),
    ontologyPathLabels: clone(itemContext.ontologyPathLabels),
    chain: {
      nodes: [
        {
          id: `${itemId}-input`,
          label: reviewItem.title,
          type: 'input',
          confidence: Math.max(0.62, reviewItem.confidence - 0.08)
        },
        {
          id: `${itemId}-ontology`,
          label: ontologyLabel,
          type: 'ontology',
          confidence: Math.max(0.68, reviewItem.confidence - 0.04)
        },
        {
          id: `${itemId}-rule`,
          label: stageLabel,
          type: 'rule',
          confidence: Math.max(0.7, reviewItem.confidence)
        },
        {
          id: `${itemId}-conclusion`,
          label: reviewItem.status === 'reviewed' ? '已具备阶段结论' : '仍需补充判断',
          type: 'conclusion',
          confidence: reviewItem.confidence
        }
      ],
      edges: [
        {
          from: `${itemId}-input`,
          to: `${itemId}-ontology`,
          label: '对应本体要点',
          strength: 0.82
        },
        {
          from: `${itemId}-ontology`,
          to: `${itemId}-rule`,
          label: '纳入阶段规则',
          strength: 0.78
        },
        {
          from: `${itemId}-rule`,
          to: `${itemId}-conclusion`,
          label: '形成阶段判断',
          strength: 0.76
        }
      ],
      conclusion: `${stageLabel}下，“${reviewItem.title}”需要结合${itemContext.reasoningHint}`,
      documents: []
    }
  };
}
