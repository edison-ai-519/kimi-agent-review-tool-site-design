import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStateStore } from './state-store.mjs';
import {
  REVIEW_STAGE_LABELS,
  REVIEW_STAGES,
  buildFallbackReasoningSeed,
  createStageSeeds,
  getStageActionLabel,
  getStageByItemId,
  getStageItemContext,
  getStageReviewStatusLabel,
  isReviewStage
} from './review-stages.mjs';
import { createKnowledgeBaseClient, listKnowledgeBaseProviders } from './services/knowledge-base/index.mjs';
import { createLlmClient, listLlmProviders } from './services/llm/index.mjs';
import {
  createOntologyValidationClient,
  listOntologyValidationProviders
} from './services/ontology-validation/index.mjs';
import { createProjectEvidenceProvider, listProjectEvidenceProviders } from './services/project-evidence/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

const appStateSeed = readJson('app-state.json');
const ontologyKnowledgeBase = readJson('ontology-knowledge-base.json');
const reasoningSeedMap = readJson('reasoning-map.json');
const knowledgeBaseClient = createKnowledgeBaseClient({
  knowledgeBase: readJson('knowledge-base.json')
});
const llmClient = createLlmClient();
const ontologyValidationClient = createOntologyValidationClient({
  ontologyKnowledgeBase
});
const projectEvidenceProvider = createProjectEvidenceProvider({
  dataDir
});
const reviewStageSeeds = createStageSeeds(appStateSeed);
const stateStore = createStateStore({
  dataDir,
  stageSeeds: reviewStageSeeds,
  defaultProject: appStateSeed.project
});

const HOST = process.env.API_HOST ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? 8787);
const REVIEW_STATUSES = ['draft', 'pending', 'in_review', 'needs_revision', 'reviewed', 'disputed'];
const USER_ROLES = ['expert', 'applicant', 'admin'];
const MAX_PROJECT_ATTACHMENTS = 20;
const MAX_PROJECT_ATTACHMENT_BYTES = 100 * 1024 * 1024;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

function readJson(filename) {
  const filePath = path.join(dataDir, filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isReviewStatus(value) {
  return REVIEW_STATUSES.includes(value);
}

function inferDemoUserRole(username) {
  const normalizedUsername = username.toLowerCase();

  if (normalizedUsername.includes('admin')) {
    return 'admin';
  }

  if (normalizedUsername.includes('apply') || normalizedUsername.includes('applicant')) {
    return 'applicant';
  }

  return 'expert';
}

function parseOptionalUserRole(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !USER_ROLES.includes(value)) {
    throw new HttpError(400, `role 必须是 ${USER_ROLES.join(' / ')} 之一。`);
  }

  return value;
}

function getCurrentProjectId() {
  return stateStore.getCurrentProjectId();
}

function getCurrentProject() {
  return stateStore.getProject();
}

function getCurrentStage(projectId = getCurrentProjectId()) {
  return stateStore.getCurrentStage(projectId);
}

function getReviewItems(stage = getCurrentStage(), projectId = getCurrentProjectId()) {
  return stateStore.getReviewItems(stage, projectId);
}

function getActivityFeed(stage = getCurrentStage(), projectId = getCurrentProjectId()) {
  return stateStore.getActivityFeed(stage, projectId);
}

function getReviewItemState(itemId) {
  const stage = getStageByItemId(itemId);
  if (!stage) {
    return null;
  }

  const projectId = getCurrentProjectId();
  const item = getReviewItems(stage, projectId).find((reviewItem) => reviewItem.id === itemId) ?? null;
  return item ? { projectId, stage, item } : null;
}

function getReviewItemStateOrThrow(itemId) {
  const reviewItemState = getReviewItemState(itemId);
  if (!reviewItemState) {
    throw new HttpError(404, '未找到评审项。');
  }

  return reviewItemState;
}

function parseOptionalReviewStage(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !isReviewStage(value)) {
    throw new HttpError(400, `stage 必须是 ${REVIEW_STAGES.join(' / ')} 之一。`);
  }

  return value;
}

function parseRequiredReviewStage(value) {
  const stage = parseOptionalReviewStage(value);
  if (!stage) {
    throw new HttpError(400, `stage 必须是 ${REVIEW_STAGES.join(' / ')} 之一。`);
  }

  return stage;
}

function parseOptionalItemId(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'itemId 必须是非空字符串。');
  }

  return value;
}

function parseRequiredNonEmptyString(value, label, maxLength = 120) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new HttpError(400, `${label}不能为空。`);
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${label}不能超过 ${maxLength} 个字符。`);
  }

  return normalized;
}

function parseOptionalString(value, maxLength = 600) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `文本不能超过 ${maxLength} 个字符。`);
  }

  return normalized;
}

function parseOptionalRawString(value, label) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${label} must be a string.`);
  }

  return value.trim();
}

function parseOptionalAttachmentParseStatus(value, label) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (!['pending', 'parsed', 'failed'].includes(value)) {
    throw new HttpError(400, `${label} must be pending / parsed / failed.`);
  }

  return value;
}

function parseOptionalPositiveInteger(value, label) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new HttpError(400, `${label}必须是非负整数。`);
  }

  return normalized;
}

function parseProjectAttachments(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, '附件必须是数组。');
  }

  if (value.length > MAX_PROJECT_ATTACHMENTS) {
    throw new HttpError(400, `附件不能超过 ${MAX_PROJECT_ATTACHMENTS} 个。`);
  }

  return value.map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
      throw new HttpError(400, `第 ${index + 1} 个附件信息不合法。`);
    }

    const size = parseOptionalPositiveInteger(attachment.size, `第 ${index + 1} 个附件大小`) ?? 0;
    if (size > MAX_PROJECT_ATTACHMENT_BYTES) {
      throw new HttpError(400, `第 ${index + 1} 个附件不能超过 100MB。`);
    }

    return {
      id: parseOptionalString(attachment.id, 120) ?? `attachment-${randomUUID()}`,
      name: parseRequiredNonEmptyString(attachment.name, `第 ${index + 1} 个附件名称`, 180),
      size,
      type: parseOptionalString(attachment.type, 120),
      lastModified: parseOptionalPositiveInteger(attachment.lastModified, `第 ${index + 1} 个附件更新时间`),
      uploadedAt: parseOptionalString(attachment.uploadedAt, 80) ?? new Date().toISOString(),
      contentBase64: parseOptionalRawString(attachment.contentBase64, `attachment ${index + 1} contentBase64`),
      materialType: parseOptionalString(attachment.materialType, 80),
      version: parseOptionalPositiveInteger(attachment.version, `attachment ${index + 1} version`),
      storageKey: parseOptionalString(attachment.storageKey, 240),
      parseStatus: parseOptionalAttachmentParseStatus(attachment.parseStatus, `attachment ${index + 1} parseStatus`),
      parseError: parseOptionalString(attachment.parseError, 600),
      parsedAt: parseOptionalString(attachment.parsedAt, 80),
      evidenceDocumentId: parseOptionalString(attachment.evidenceDocumentId, 240),
      extractedTextPreview: parseOptionalString(attachment.extractedTextPreview, 600)
    };
  });
}

function parseProjectMaterials(value) {
  const materials = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    summary: parseRequiredNonEmptyString(materials.summary, '项目摘要', 1000),
    objectives: parseRequiredNonEmptyString(materials.objectives, '研究目标', 1200),
    technicalRoute: parseRequiredNonEmptyString(materials.technicalRoute, '技术路线', 1600),
    innovation: parseOptionalString(materials.innovation, 1200),
    milestones: parseOptionalString(materials.milestones, 1200),
    teamProfile: parseOptionalString(materials.teamProfile, 1200),
    budgetBreakdown: parseOptionalString(materials.budgetBreakdown, 1200),
    expectedOutcomes: parseOptionalString(materials.expectedOutcomes, 1200),
    riskPlan: parseOptionalString(materials.riskPlan, 1200),
    ethicsAndCompliance: parseOptionalString(materials.ethicsAndCompliance, 1000),
    attachmentsDescription: parseOptionalString(materials.attachmentsDescription, 1000),
    attachments: parseProjectAttachments(materials.attachments)
  };
}

async function parseProjectSubmission(body) {
  const submittedAt = new Date().toISOString();
  const materials = parseProjectMaterials(body.materials);

  const project = {
    id: `project-${randomUUID()}`,
    name: parseRequiredNonEmptyString(body.name, '项目名称', 120),
    applicant: parseRequiredNonEmptyString(body.applicant, '申报单位', 120),
    budget: parseOptionalString(body.budget, 60) ?? '待补充',
    duration: parseOptionalString(body.duration, 80) ?? '待补充',
    field: parseOptionalString(body.field, 120) ?? '待补充',
    summary: materials.summary,
    contactName: parseOptionalString(body.contactName, 80),
    contactPhone: parseOptionalString(body.contactPhone, 40),
    contactEmail: parseOptionalString(body.contactEmail, 120),
    materials,
    source: 'submitted',
    submittedAt,
    stage: 'proposal'
  };

  return projectEvidenceProvider.prepareProject(project);
}

function parseLimit(value, fallback = 3) {
  if (value === undefined) {
    return fallback;
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new HttpError(400, 'limit 必须是 1 到 10 之间的整数。');
  }

  return limit;
}

function parseReviewItemUpdates(currentItem, body) {
  const nextUpdates = {
    score: currentItem.score,
    comment: currentItem.comment,
    status: currentItem.status
  };

  if (Object.hasOwn(body, 'score')) {
    if (body.score === null) {
      nextUpdates.score = undefined;
    } else {
      const nextScore = Number(body.score);
      if (!Number.isFinite(nextScore)) {
        throw new HttpError(400, '评分必须是数字。');
      }

      if (nextScore < 0 || nextScore > currentItem.maxScore) {
        throw new HttpError(400, `评分必须在 0 到 ${currentItem.maxScore} 之间。`);
      }

      nextUpdates.score = nextScore;
    }
  }

  if (Object.hasOwn(body, 'comment')) {
    if (body.comment !== null && typeof body.comment !== 'string') {
      throw new HttpError(400, '评审意见必须是字符串。');
    }

    nextUpdates.comment = body.comment ?? '';
  }

  if (Object.hasOwn(body, 'status')) {
    if (typeof body.status !== 'string' || !isReviewStatus(body.status)) {
      throw new HttpError(400, `status 必须是 ${REVIEW_STATUSES.join(' / ')} 之一。`);
    }

    nextUpdates.status = body.status;
  }

  return nextUpdates;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  setCorsHeaders(res);
  res.writeHead(204);
  res.end();
}

function getLastUpdateIsoString(stage = getCurrentStage(), projectId = getCurrentProjectId()) {
  const activityFeed = getActivityFeed(stage, projectId);
  return activityFeed[0]?.createdAt ?? appStateSeed.systemStatus.lastUpdate;
}

function buildActivity(action, target, type) {
  return {
    id: `activity-${randomUUID()}`,
    action,
    target,
    type,
    createdAt: new Date().toISOString()
  };
}

function getOntologyPathLabels(itemId) {
  return reasoningSeedMap[itemId]?.ontologyPathLabels ?? getStageItemContext(itemId)?.ontologyPathLabels ?? [];
}

function normalizeOntologySearchText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getOntologyProfile(stage, itemId) {
  return (
    ontologyKnowledgeBase.reviewProfiles?.find(
      (profile) => profile.stage === stage && Array.isArray(profile.itemIds) && profile.itemIds.includes(itemId)
    ) ?? null
  );
}

function getOntologyLabelsByIds(items, ids = []) {
  return ids
    .map((id) => items.find((item) => item.id === id)?.label)
    .filter(Boolean);
}

function buildOntologyContext(stage, { prompt = '', item = null, ontologyPathLabels = [] } = {}) {
  const searchText = normalizeOntologySearchText(
    [prompt, item?.title, item?.description, item?.comment, ontologyPathLabels].flat().filter(Boolean).join(' ')
  );

  const matchedConcepts = (ontologyKnowledgeBase.concepts ?? [])
    .filter((concept) =>
      [concept.label, ...(Array.isArray(concept.aliases) ? concept.aliases : [])]
        .map((term) => normalizeOntologySearchText(term))
        .some((term) => term && searchText.includes(term))
    )
    .slice(0, 6)
    .map((concept) => concept.label);

  const matchedEvidencePatterns = (ontologyKnowledgeBase.evidencePatterns ?? [])
    .filter((pattern) =>
      (Array.isArray(pattern.keywords) ? pattern.keywords : [])
        .map((term) => normalizeOntologySearchText(term))
        .some((term) => term && searchText.includes(term))
    )
    .slice(0, 4)
    .map((pattern) => pattern.label);

  const profile = item ? getOntologyProfile(stage, item.id) : null;
  const requiredConcepts = profile
    ? getOntologyLabelsByIds(ontologyKnowledgeBase.concepts ?? [], profile.conceptIds ?? [])
    : [];
  const requiredEvidence = profile
    ? getOntologyLabelsByIds(ontologyKnowledgeBase.evidencePatterns ?? [], profile.requiredEvidenceIds ?? [])
    : [];
  const requiredDocumentCategories = profile?.requiredDocumentCategories ?? [];

  const contextLines = [
    `本体知识库版本：${ontologyKnowledgeBase.version}`,
    matchedConcepts.length > 0 ? `本体命中概念：${matchedConcepts.join('、')}` : null,
    matchedEvidencePatterns.length > 0 ? `本体命中证据模式：${matchedEvidencePatterns.join('、')}` : null,
    requiredConcepts.length > 0 ? `本体规则关注概念：${requiredConcepts.join('、')}` : null,
    requiredEvidence.length > 0 ? `本体规则要求证据：${requiredEvidence.join('、')}` : null,
    requiredDocumentCategories.length > 0 ? `本体规则要求资料类型：${requiredDocumentCategories.join('、')}` : null,
    ontologyPathLabels.length > 0 ? `本体路径：${ontologyPathLabels.join(' -> ')}` : null
  ].filter(Boolean);

  return {
    matchedConcepts,
    matchedEvidencePatterns,
    requiredConcepts,
    requiredEvidence,
    requiredDocumentCategories,
    contextLines
  };
}

async function buildReviewItemOntologyValidation(item, stage, projectId = getCurrentProjectId()) {
  const ontologyPathLabels = getOntologyPathLabels(item.id);
  try {
    const knowledgeSearch = await resolveKnowledgeSearch({
      query: item.title,
      itemId: item.id,
      limit: 4,
      ontologyPathLabels,
      projectId
    });

    return ontologyValidationClient.validateReviewItem({
      item,
      stage,
      knowledgeDocuments: knowledgeSearch.documents,
      ontologyPathLabels
    });
  } catch (error) {
    return {
      status: 'warn',
      summary: '本体规则校验已降级执行，当前知识库检索异常，建议稍后重新校验。',
      ontologyVersion: ontologyValidationClient.getKnowledgeBase().version,
      ontologyPathLabels,
      matchedConcepts: [],
      matchedDocumentCategories: [],
      missingDocumentCategories: [],
      evidenceChecks: [],
      findings: [
        {
          id: `finding-${item.id}-ontology-validation-error`,
          severity: 'warn',
          severityLabel: '待补充',
          title: '知识库检索异常',
          message: error instanceof Error ? error.message : '知识库检索失败，当前只返回降级提示。',
          suggestion: '检查知识库 provider 状态后重新进入该评审项。'
        }
      ],
      knowledgeDocumentIds: []
    };
  }
}

async function buildReviewItemLlmParticipation({
  item,
  stage,
  ontologyValidation,
  knowledgeDocuments,
  ontologyPathLabels
}) {
  const ontologyContext = buildOntologyContext(stage, {
    prompt: [item.title, item.description, item.comment ?? ''].filter(Boolean).join(' '),
    item,
    ontologyPathLabels
  });

  try {
    const completion = await llmClient.complete({
      prompt: `请基于本体规则、知识库材料和当前评审状态，对“${item.title}”生成一段评审辅助建议，包含结论、依据、缺口和下一步动作。`,
      useCase: 'review-evaluation',
      context: [
        `当前评审阶段：${REVIEW_STAGE_LABELS[stage]}`,
        `当前评审状态：${getStageReviewStatusLabel(stage, item.status)}`,
        typeof item.score === 'number' ? `当前评分：${item.score}/${item.maxScore}` : null,
        item.comment ? `当前评审意见：${item.comment}` : '当前尚未填写正式评审意见。',
        `本体校验结论：${ontologyValidation.summary}`,
        ontologyValidation.findings.length > 0
          ? `本体校验重点：${ontologyValidation.findings.map((finding) => finding.title).join('；')}`
          : '本体校验重点：当前未发现阻塞性问题。',
        ...ontologyContext.contextLines
      ].filter(Boolean),
      knowledgeDocuments,
      metadata: {
        stage,
        stageLabel: REVIEW_STAGE_LABELS[stage],
        reviewItemId: item.id,
        reviewItemTitle: item.title,
        ontologyValidationStatus: ontologyValidation.status,
        ontologyKnowledgeBaseVersion: ontologyKnowledgeBase.version,
        ontologyMatchedConcepts: ontologyContext.matchedConcepts,
        ontologyRequiredEvidence: ontologyContext.requiredEvidence
      }
    });

    return {
      provider: completion.provider,
      model: completion.model,
      useCase: completion.useCase,
      createdAt: completion.createdAt,
      summary: completion.text,
      relatedDocuments: completion.relatedDocuments ?? knowledgeDocuments
    };
  } catch (error) {
    return {
      provider: llmClient.name,
      model: process.env.LLM_MODEL ?? 'unknown',
      useCase: 'review-evaluation',
      createdAt: new Date().toISOString(),
      summary:
        error instanceof Error
          ? `LLM 参与评审建议生成失败：${error.message}`
          : 'LLM 参与评审建议生成失败，请稍后重试。',
      relatedDocuments: knowledgeDocuments
    };
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildReviewItemAiScore({ item, ontologyValidation, llmParticipation }) {
  const relatedDocuments = Array.isArray(llmParticipation.relatedDocuments) ? llmParticipation.relatedDocuments : [];
  const projectDocumentCount = relatedDocuments.filter((document) => document.tags?.includes('project-evidence')).length;
  const missingCategoryCount = ontologyValidation.missingDocumentCategories?.length ?? 0;
  const findingPenalty = ontologyValidation.findings?.reduce((total, finding) => {
    if (finding.severity === 'fail') return total + 0.08;
    if (finding.severity === 'warn') return total + 0.04;
    return total;
  }, 0) ?? 0;
  const statusBaseRatio = {
    pass: 0.84,
    warn: 0.68,
    fail: 0.48
  }[ontologyValidation.status] ?? 0.62;
  const evidenceBonus = Math.min(0.08, relatedDocuments.length * 0.015 + projectDocumentCount * 0.02);
  const missingPenalty = Math.min(0.16, missingCategoryCount * 0.04);
  const ratio = clamp(statusBaseRatio + evidenceBonus - missingPenalty - findingPenalty, 0.25, 0.95);
  const confidence = clamp(0.56 + relatedDocuments.length * 0.04 + projectDocumentCount * 0.05 - missingCategoryCount * 0.05, 0.42, 0.9);
  const score = Math.round(item.maxScore * ratio);
  const rationaleParts = [
    `本体校验状态：${ontologyValidation.status}`,
    `命中参考资料：${relatedDocuments.length} 份`,
    projectDocumentCount > 0 ? `其中项目上传/结构化材料 ${projectDocumentCount} 份` : '尚未命中项目上传材料',
    missingCategoryCount > 0 ? `仍缺少 ${ontologyValidation.missingDocumentCategories.join('、')} 类证据` : '关键材料类型覆盖较完整'
  ];

  return {
    score: clamp(score, 0, item.maxScore),
    maxScore: item.maxScore,
    confidence,
    rationale: rationaleParts.join('；'),
    provider: llmParticipation.provider,
    model: llmParticipation.model,
    createdAt: llmParticipation.createdAt,
    relatedDocumentIds: relatedDocuments.map((document) => document.id)
  };
}

async function buildReviewItemIntelligence(item, stage, projectId = getCurrentProjectId()) {
  const ontologyPathLabels = getOntologyPathLabels(item.id);
  const knowledgeSearch = await resolveKnowledgeSearch({
    query: [item.title, item.description].filter(Boolean).join(' '),
    itemId: item.id,
    limit: 4,
    ontologyPathLabels,
    projectId
  });

  const ontologyValidation = await ontologyValidationClient.validateReviewItem({
    item,
    stage,
    knowledgeDocuments: knowledgeSearch.documents,
    ontologyPathLabels
  });

  const llmParticipation = await buildReviewItemLlmParticipation({
    item,
    stage,
    ontologyValidation,
    knowledgeDocuments: knowledgeSearch.documents,
    ontologyPathLabels
  });

  const aiScore = buildReviewItemAiScore({
    item,
    ontologyValidation,
    llmParticipation
  });

  return {
    ontologyValidation,
    llmParticipation,
    aiScore,
    knowledgeDocuments: knowledgeSearch.documents,
    ontologyPathLabels
  };
}

async function enrichReviewItem(item, stage, projectId = getCurrentProjectId()) {
  try {
    const intelligence = await buildReviewItemIntelligence(item, stage, projectId);
    return {
      ...clone(item),
      ontologyValidation: intelligence.ontologyValidation,
      llmParticipation: intelligence.llmParticipation,
      aiScore: intelligence.aiScore
    };
  } catch (error) {
    const ontologyValidation = await buildReviewItemOntologyValidation(item, stage, projectId);
    const llmParticipation = {
      provider: llmClient.name,
      model: process.env.LLM_MODEL ?? 'unknown',
      useCase: 'review-evaluation',
      createdAt: new Date().toISOString(),
      summary:
        error instanceof Error
          ? `LLM 参与评审建议生成失败：${error.message}`
          : 'LLM 参与评审建议生成失败，请稍后重试。',
      relatedDocuments: []
    };

    return {
      ...clone(item),
      ontologyValidation,
      llmParticipation,
      aiScore: buildReviewItemAiScore({ item, ontologyValidation, llmParticipation })
    };
  }
}

async function buildAppStatePayload(stage = getCurrentStage(), projectId = getCurrentProjectId()) {
  const stageSeed = reviewStageSeeds[stage];
  const project = stateStore.getProject(projectId) ?? stageSeed.project;
  const reviewItems = await Promise.all(getReviewItems(stage, projectId).map((item) => enrichReviewItem(item, stage, projectId)));
  const fallbackOntology = clone(appStateSeed.ontology);
  let ontology = fallbackOntology;

  try {
    ontology = {
      ...fallbackOntology,
      contextVectors: await ontologyValidationClient.getContextVectors({
        project: {
          ...project,
          stage
        },
        stage,
        reviewItems,
        fallbackVectors: fallbackOntology.contextVectors
      })
    };
  } catch {
    ontology = fallbackOntology;
  }

  return {
    ...clone(appStateSeed),
    project: {
      ...clone(project),
      stage
    },
    systemStatus: {
      ...clone(appStateSeed.systemStatus),
      lastUpdate: getLastUpdateIsoString(stage, projectId)
    },
    reviewItems,
    ontology,
    activityFeed: getActivityFeed(stage, projectId),
    knowledgeBase: knowledgeBaseClient.getKnowledgeBase(),
    chatConfig: clone(stageSeed.chatConfig),
    projects: stateStore.listProjects(),
    currentProjectId: projectId
  };
}

function buildStageCompletionRecommendation(stage, summary) {
  if (summary.disputed > 0) {
    return `${REVIEW_STAGE_LABELS[stage]}仍有 ${summary.disputed} 个争议项，建议先组织会审。`;
  }

  if (summary.needsRevision > 0) {
    return `${REVIEW_STAGE_LABELS[stage]}仍有 ${summary.needsRevision} 个待补材料项，建议先补齐支撑材料。`;
  }

  if (summary.pending > 0) {
    return `${REVIEW_STAGE_LABELS[stage]}仍有 ${summary.pending} 个待处理项，建议继续完成清单。`;
  }

  if (summary.total > 0 && summary.completed === summary.total) {
    return `${REVIEW_STAGE_LABELS[stage]}的评审项已全部完成，可以进入下一阶段。`;
  }

  return `${REVIEW_STAGE_LABELS[stage]}已创建评审上下文，可以开始处理该阶段任务。`;
}

function hasStageWorkStarted(reviewItems) {
  return reviewItems.some(
    (item) =>
      item.status === 'reviewed' ||
      item.status === 'disputed' ||
      item.status === 'needs_revision' ||
      item.status === 'in_review' ||
      typeof item.score === 'number' ||
      Boolean(String(item.comment ?? '').trim()) ||
      Boolean(item.updatedAt)
  );
}

function buildStageOverview(stage, projectId = getCurrentProjectId()) {
  const reviewItems = getReviewItems(stage, projectId);
  const total = reviewItems.length;
  const completed = reviewItems.filter((item) => item.status === 'reviewed').length;
  const pending = reviewItems.filter((item) => ['draft', 'pending', 'in_review'].includes(item.status)).length;
  const disputed = reviewItems.filter((item) => item.status === 'disputed').length;
  const needsRevision = reviewItems.filter((item) => item.status === 'needs_revision').length;
  const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const hasStarted = hasStageWorkStarted(reviewItems);

  let status = 'not_started';
  if (total > 0 && completed === total) {
    status = 'completed';
  } else if (disputed > 0 || needsRevision > 0) {
    status = 'blocked';
  } else if (hasStarted || completed > 0 || (pending > 0 && stage === getCurrentStage(projectId))) {
    status = 'in_progress';
  }

  const summary = {
    stage,
    label: REVIEW_STAGE_LABELS[stage],
    status,
    total,
    completed,
    pending,
    disputed,
    needsRevision,
    completionPercent
  };

  return {
    ...summary,
    recommendation: buildStageCompletionRecommendation(stage, summary)
  };
}

function getStageBlockingReason(stageOverview) {
  if (stageOverview.disputed > 0) {
    return `${stageOverview.label}还有 ${stageOverview.disputed} 个争议项未闭环。`;
  }

  if (stageOverview.needsRevision > 0) {
    return `${stageOverview.label}还有 ${stageOverview.needsRevision} 个待补材料项。`;
  }

  if (stageOverview.pending > 0) {
    return `${stageOverview.label}还有 ${stageOverview.pending} 个待处理项未完成。`;
  }

  return `${stageOverview.label}尚未满足进入下一阶段的条件。`;
}

function buildStageTransitionDecision(fromStage, toStage, projectId = getCurrentProjectId()) {
  if (fromStage === toStage) {
    return {
      allowed: true,
      message: `当前已处于${REVIEW_STAGE_LABELS[toStage]}。`
    };
  }

  const fromIndex = REVIEW_STAGES.indexOf(fromStage);
  const toIndex = REVIEW_STAGES.indexOf(toStage);

  if (toIndex <= fromIndex) {
    return {
      allowed: true,
      message: `已切换到${REVIEW_STAGE_LABELS[toStage]}。`
    };
  }

  for (const prerequisiteStage of REVIEW_STAGES.slice(0, toIndex)) {
    const stageOverview = buildStageOverview(prerequisiteStage, projectId);
    if (stageOverview.status !== 'completed') {
      return {
        allowed: false,
        message: `当前不能进入${REVIEW_STAGE_LABELS[toStage]}，因为${getStageBlockingReason(stageOverview)}`
      };
    }
  }

  return {
    allowed: true,
    message: `已切换到${REVIEW_STAGE_LABELS[toStage]}。`
  };
}

function buildReviewStageOverviewPayload(currentStage = getCurrentStage(), projectId = getCurrentProjectId()) {
  return {
    currentStage,
    stages: REVIEW_STAGES.map((stage) => {
      const overview = buildStageOverview(stage, projectId);
      const decision = buildStageTransitionDecision(currentStage, stage, projectId);

      return {
        ...overview,
        canEnter: decision.allowed,
        blockedReason: decision.allowed ? undefined : decision.message
      };
    })
  };
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    const parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      throw new HttpError(400, '请求体必须是 JSON 对象。');
    }

    return parsedBody;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, '请求体不是合法的 JSON。');
  }
}

function getRouteMatch(pathname) {
  const reasoningMatch = pathname.match(/^\/api\/review-items\/([^/]+)\/reasoning$/);
  if (reasoningMatch) {
    return { type: 'reasoning', itemId: reasoningMatch[1] };
  }

  const historyMatch = pathname.match(/^\/api\/review-items\/([^/]+)\/history$/);
  if (historyMatch) {
    return { type: 'review-history', itemId: historyMatch[1] };
  }

  const reviewItemMatch = pathname.match(/^\/api\/review-items\/([^/]+)$/);
  if (reviewItemMatch) {
    return { type: 'review-item', itemId: reviewItemMatch[1] };
  }

  return null;
}

async function resolveKnowledgeSearch({ query = '', itemId, limit = 3, ontologyPathLabels = [], projectId = getCurrentProjectId() }) {
  const reviewItemState = itemId ? getReviewItemStateOrThrow(itemId) : null;
  const reviewItem = reviewItemState?.item ?? null;
  const resolvedProjectId = reviewItemState?.projectId ?? projectId;
  const project = stateStore.getProject(resolvedProjectId);
  const baseSearch = await knowledgeBaseClient.search({
    query,
    reviewItem,
    ontologyPathLabels,
    limit
  });
  const projectEvidenceSearch = projectEvidenceProvider.searchProjectEvidence({
    project,
    query,
    reviewItem,
    ontologyPathLabels,
    limit
  });
  const documentsById = new Map();

  for (const document of [...projectEvidenceSearch.documents, ...baseSearch.documents]) {
    if (!documentsById.has(document.id)) {
      documentsById.set(document.id, document);
    }
  }

  const documents = [...documentsById.values()].slice(0, Math.min(10, Math.max(limit, limit + (projectEvidenceSearch.documents.length > 0 ? 2 : 0))));

  return {
    query: baseSearch.query || projectEvidenceSearch.query || query,
    source: `${baseSearch.source}+${projectEvidenceSearch.source}`,
    total: documents.length,
    documents
  };
}

async function buildReasoningPayload(itemId) {
  const reviewItemState = getReviewItemState(itemId);
  if (!reviewItemState) {
    return null;
  }

  const seed = reasoningSeedMap[itemId] ?? buildFallbackReasoningSeed(itemId, reviewItemState.item);
  if (!seed) {
    return null;
  }

  const intelligence = await buildReviewItemIntelligence(reviewItemState.item, reviewItemState.stage, reviewItemState.projectId);
  const knowledgeDocuments = intelligence.knowledgeDocuments.map((document, index) =>
    knowledgeBaseClient.toDocumentFragment(document, {
      terms: [reviewItemState.item.title, reviewItemState.item.description, seed.ontologyPathLabels],
      relevance: Math.max(0.7, 0.96 - index * 0.08)
    })
  );

  return {
    ...clone(seed),
    chain: {
      ...clone(seed.chain),
      conclusion: intelligence.llmParticipation.summary || clone(seed.chain.conclusion),
      documents: knowledgeDocuments.length > 0 ? knowledgeDocuments : clone(seed.chain.documents)
    }
  };
}

async function buildAiResponse({ prompt, itemId, stage, useCase = 'general', context = [] }) {
  const reviewItemState = itemId ? getReviewItemStateOrThrow(itemId) : null;
  const resolvedStage = reviewItemState?.stage ?? stage ?? getCurrentStage();
  const projectId = reviewItemState?.projectId ?? getCurrentProjectId();
  const ontologyPathLabels = itemId
    ? reasoningSeedMap[itemId]?.ontologyPathLabels ?? getStageItemContext(itemId)?.ontologyPathLabels ?? []
    : [];
  const ontologyContext = buildOntologyContext(resolvedStage, {
    prompt,
    item: reviewItemState?.item ?? null,
    ontologyPathLabels
  });
  const knowledgeSearch = await resolveKnowledgeSearch({
    query: prompt,
    itemId,
    limit: 3,
    ontologyPathLabels,
    projectId
  });
  const ontologyValidation = reviewItemState
    ? await ontologyValidationClient.validateReviewItem({
        item: reviewItemState.item,
        stage: resolvedStage,
        knowledgeDocuments: knowledgeSearch.documents,
        ontologyPathLabels
      })
    : null;

  return llmClient.complete({
    prompt,
    useCase,
    context: [
      `当前评审阶段：${REVIEW_STAGE_LABELS[resolvedStage]}`,
      ...context,
      reviewItemState ? `评审项：${reviewItemState.item.title}` : null,
      reviewItemState?.item.description ?? null,
      ontologyValidation ? `本体校验：${ontologyValidation.summary}` : null,
      ontologyValidation?.findings?.length ? `本体关注点：${ontologyValidation.findings.map((finding) => finding.title).join('；')}` : null,
      ...ontologyContext.contextLines
    ].filter(Boolean),
    knowledgeDocuments: knowledgeSearch.documents,
    metadata: {
      stage: resolvedStage,
      stageLabel: REVIEW_STAGE_LABELS[resolvedStage],
      reviewItemId: reviewItemState?.item.id,
      reviewItemTitle: reviewItemState?.item.title,
      ontologyKnowledgeBaseVersion: ontologyKnowledgeBase.version,
      ontologyMatchedConcepts: ontologyContext.matchedConcepts,
      ontologyRequiredEvidence: ontologyContext.requiredEvidence
    }
  });
}

function getNextConfidence(currentConfidence, nextStatus) {
  switch (nextStatus) {
    case 'reviewed':
      return Math.max(currentConfidence, 0.82);
    case 'disputed':
      return Math.max(Math.min(currentConfidence, 0.74), 0.68);
    case 'in_review':
      return Math.max(currentConfidence, 0.76);
    case 'needs_revision':
      return Math.min(currentConfidence, 0.65);
    default:
      return currentConfidence;
  }
}

function buildReviewActivity(item, status, stage) {
  const action = getStageActionLabel(stage, status);
  const type = status === 'reviewed' ? 'success' : status === 'disputed' || status === 'needs_revision' ? 'warning' : 'info';
  return buildActivity(action, item.title, type);
}

function buildHistorySummary(previousItem, nextItem, stage) {
  const summaryParts = [];

  if (previousItem.status !== nextItem.status) {
    summaryParts.push(
      `状态：${getStageReviewStatusLabel(stage, previousItem.status)} -> ${getStageReviewStatusLabel(stage, nextItem.status)}`
    );
  } else {
    summaryParts.push(`状态：${getStageReviewStatusLabel(stage, nextItem.status)}`);
  }

  if (typeof nextItem.score === 'number') {
    summaryParts.push(`评分：${nextItem.score}/${nextItem.maxScore}`);
  }

  if (nextItem.comment) {
    const normalizedComment = nextItem.comment.replace(/\s+/g, ' ').trim();
    summaryParts.push(`意见：${normalizedComment.slice(0, 48)}${normalizedComment.length > 48 ? '...' : ''}`);
  }

  return summaryParts.join('；');
}

function buildReviewHistoryEntry(previousItem, nextItem, action, stage) {
  return {
    id: `history-${randomUUID()}`,
    itemId: nextItem.id,
    action,
    actorName: '当前用户',
    summary: buildHistorySummary(previousItem, nextItem, stage),
    fromStatus: previousItem.status,
    toStatus: nextItem.status,
    score: nextItem.score,
    commentPreview: nextItem.comment ? nextItem.comment.slice(0, 160) : undefined,
    createdAt: new Date().toISOString()
  };
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${HOST}:${PORT}`}`);
  const pathname = requestUrl.pathname;

  if (method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  try {
    if (method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'kimi-review-api',
        time: new Date().toISOString(),
        currentProjectId: getCurrentProjectId(),
        currentStage: getCurrentStage(),
        integrations: {
          knowledgeBaseProvider: knowledgeBaseClient.name,
          llmProvider: llmClient.name,
          ontologyValidationProvider: ontologyValidationClient.name,
          projectEvidenceProvider: projectEvidenceProvider.name,
          availableKnowledgeBaseProviders: listKnowledgeBaseProviders(),
          availableLlmProviders: listLlmProviders(),
          availableOntologyValidationProviders: listOntologyValidationProviders(),
          availableProjectEvidenceProviders: listProjectEvidenceProviders()
        }
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await readRequestBody(req);
      const username = String(body.username ?? '').trim();
      const password = String(body.password ?? '').trim();

      if (!username || !password) {
        sendJson(res, 400, { message: '用户名和密码不能为空。' });
        return;
      }

      const role = parseOptionalUserRole(body.role) ?? inferDemoUserRole(username);

      sendJson(res, 200, {
        token: `demo-${randomUUID()}`,
        user: {
          id: `user-${username}`,
          name: username,
          role
        }
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/projects') {
      sendJson(res, 200, {
        currentProjectId: getCurrentProjectId(),
        projects: stateStore.listProjects()
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/projects') {
      const body = await readRequestBody(req);
      const project = await parseProjectSubmission(body);
      const projectStageSeeds = createStageSeeds(appStateSeed, {
        project,
        mode: 'submitted',
        submittedAt: project.submittedAt
      });
      const createdProject = stateStore.addProject({
        project,
        stageSeeds: projectStageSeeds,
        submittedAt: project.submittedAt,
        source: 'submitted'
      });

      sendJson(res, 201, {
        project: createdProject,
        message: '项目已提交，并已生成立项评审清单。'
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/projects/current') {
      const body = await readRequestBody(req);
      const projectId = parseRequiredNonEmptyString(body.projectId, 'projectId', 120);
      const selectedProject = stateStore.setCurrentProject(projectId);

      if (!selectedProject) {
        sendJson(res, 404, { message: '未找到项目。' });
        return;
      }

      sendJson(res, 200, {
        project: selectedProject,
        currentProjectId: selectedProject.id
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/app-state') {
      const projectId = parseOptionalItemId(requestUrl.searchParams.get('projectId')) ?? getCurrentProjectId();
      const stage = parseOptionalReviewStage(requestUrl.searchParams.get('stage')) ?? getCurrentStage(projectId);
      sendJson(res, 200, await buildAppStatePayload(stage, projectId));
      return;
    }

    if (method === 'GET' && pathname === '/api/review-stage/overview') {
      sendJson(res, 200, buildReviewStageOverviewPayload());
      return;
    }

    if (method === 'GET' && pathname === '/api/ontology-validation/knowledge-base') {
      sendJson(res, 200, ontologyValidationClient.getKnowledgeBase());
      return;
    }

    if (method === 'POST' && pathname === '/api/review-stage') {
      const body = await readRequestBody(req);
      const stage = parseRequiredReviewStage(body.stage);
      const projectId = getCurrentProjectId();
      const currentStage = getCurrentStage();
      const decision = buildStageTransitionDecision(currentStage, stage, projectId);

      if (!decision.allowed) {
        sendJson(res, 409, { message: decision.message });
        return;
      }

      stateStore.setCurrentStage(stage, projectId);
      sendJson(res, 200, { stage, label: REVIEW_STAGE_LABELS[stage], message: decision.message });
      return;
    }

    if (method === 'GET' && pathname === '/api/knowledge-base') {
      sendJson(res, 200, knowledgeBaseClient.getKnowledgeBase());
      return;
    }

    if (method === 'POST' && pathname === '/api/knowledge-base/search') {
      const body = await readRequestBody(req);
      const query = String(body.query ?? '').trim();
      const itemId = parseOptionalItemId(body.itemId);
      const limit = parseLimit(body.limit);
      const ontologyPathLabels = itemId
        ? reasoningSeedMap[itemId]?.ontologyPathLabels ?? getStageItemContext(itemId)?.ontologyPathLabels ?? []
        : [];

      if (!query && !itemId) {
        sendJson(res, 400, { message: '知识库检索至少需要 query 或 itemId。' });
        return;
      }

      const result = await resolveKnowledgeSearch({
        query,
        itemId,
        limit: Number.isFinite(limit) ? limit : 3,
        ontologyPathLabels
      });

      sendJson(res, 200, result);
      return;
    }

    if (method === 'POST' && pathname === '/api/chat') {
      const body = await readRequestBody(req);
      const message = String(body.message ?? '').trim();
      const itemId = parseOptionalItemId(body.itemId);
      const stage = parseOptionalReviewStage(body.stage);

      if (!message) {
        sendJson(res, 400, { message: '消息内容不能为空。' });
        return;
      }

      const completion = await buildAiResponse({
        prompt: message,
        itemId,
        stage,
        useCase: 'chat'
      });

      sendJson(res, 200, {
        message: {
          id: `chat-${randomUUID()}`,
          role: 'assistant',
          content: completion.text,
          timestamp: completion.createdAt
        },
        relatedDocuments: completion.relatedDocuments ?? []
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/llm/complete') {
      const body = await readRequestBody(req);
      const prompt = String(body.prompt ?? '').trim();
      const itemId = parseOptionalItemId(body.itemId);
      const stage = parseOptionalReviewStage(body.stage);
      const useCase = typeof body.useCase === 'string' ? body.useCase : 'general';
      const context = Array.isArray(body.context) ? body.context : [];

      if (!prompt) {
        sendJson(res, 400, { message: 'prompt 不能为空。' });
        return;
      }

      const completion = await buildAiResponse({
        prompt,
        itemId,
        stage,
        useCase,
        context
      });

      sendJson(res, 200, completion);
      return;
    }

    const routeMatch = getRouteMatch(pathname);

    if (routeMatch?.type === 'reasoning' && method === 'GET') {
      const reasoning = await buildReasoningPayload(routeMatch.itemId);

      if (!reasoning) {
        sendJson(res, 404, { message: '未找到对应的推理链。' });
        return;
      }

      const reviewItemState = getReviewItemStateOrThrow(routeMatch.itemId);
      stateStore.prependActivity(buildActivity('查看依据', reviewItemState.item.title, 'info'), reviewItemState.stage, reviewItemState.projectId);

      sendJson(res, 200, reasoning);
      return;
    }

    if (routeMatch?.type === 'review-history' && method === 'GET') {
      const reviewItemState = getReviewItemStateOrThrow(routeMatch.itemId);

      sendJson(res, 200, {
        itemId: routeMatch.itemId,
        entries: stateStore.getReviewHistory(routeMatch.itemId, reviewItemState.stage, reviewItemState.projectId)
      });
      return;
    }

    if (routeMatch?.type === 'review-item' && method === 'PATCH') {
      const body = await readRequestBody(req);
      const reviewItemState = getReviewItemStateOrThrow(routeMatch.itemId);
      const nextUpdates = parseReviewItemUpdates(reviewItemState.item, body);
      const nextItem = {
        ...reviewItemState.item,
        score: nextUpdates.score,
        comment: nextUpdates.comment,
        status: nextUpdates.status,
        confidence: getNextConfidence(reviewItemState.item.confidence, nextUpdates.status),
        updatedAt: new Date().toISOString()
      };
      const activity = buildReviewActivity(nextItem, nextItem.status, reviewItemState.stage);
      const historyEntry = buildReviewHistoryEntry(reviewItemState.item, nextItem, activity.action, reviewItemState.stage);
      const updatedItem = stateStore.updateReviewItem(routeMatch.itemId, nextItem, {
        projectId: reviewItemState.projectId,
        stage: reviewItemState.stage,
        activity,
        historyEntry
      });

      if (!updatedItem) {
        sendJson(res, 500, { message: '更新评审项失败。' });
        return;
      }

      const enrichedItem = await enrichReviewItem(updatedItem, reviewItemState.stage, reviewItemState.projectId);

      sendJson(res, 200, {
        item: enrichedItem,
        historyEntry,
        activity
      });
      return;
    }

    sendJson(res, 404, { message: '未找到请求资源。' });
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.statusCode, { message: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : 'Server error';
    sendJson(res, 500, { message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`kimi-review-api listening at http://${HOST}:${PORT}`);
});
