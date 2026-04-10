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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

const appStateSeed = readJson('app-state.json');
const reasoningSeedMap = readJson('reasoning-map.json');
const knowledgeBaseClient = createKnowledgeBaseClient({
  knowledgeBase: readJson('knowledge-base.json')
});
const llmClient = createLlmClient();
const reviewStageSeeds = createStageSeeds(appStateSeed);
const stateStore = createStateStore({
  dataDir,
  stageSeeds: reviewStageSeeds,
  defaultStage: appStateSeed.project.stage
});

const HOST = process.env.API_HOST ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? 8787);
const REVIEW_STATUSES = ['draft', 'pending', 'in_review', 'needs_revision', 'reviewed', 'disputed'];

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

function getCurrentStage() {
  return stateStore.getCurrentStage();
}

function getReviewItems(stage = getCurrentStage()) {
  return stateStore.getReviewItems(stage);
}

function getActivityFeed(stage = getCurrentStage()) {
  return stateStore.getActivityFeed(stage);
}

function getReviewItemState(itemId) {
  const stage = getStageByItemId(itemId);
  if (!stage) {
    return null;
  }

  const item = getReviewItems(stage).find((reviewItem) => reviewItem.id === itemId) ?? null;
  return item ? { stage, item } : null;
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
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'itemId 必须是非空字符串。');
  }

  return value;
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

function getLastUpdateIsoString(stage = getCurrentStage()) {
  const activityFeed = getActivityFeed(stage);
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

function getAppStatePayload(stage = getCurrentStage()) {
  const stageSeed = reviewStageSeeds[stage];

  return {
    ...clone(appStateSeed),
    project: clone(stageSeed.project),
    systemStatus: {
      ...clone(appStateSeed.systemStatus),
      lastUpdate: getLastUpdateIsoString(stage)
    },
    reviewItems: getReviewItems(stage),
    activityFeed: getActivityFeed(stage),
    knowledgeBase: knowledgeBaseClient.getKnowledgeBase(),
    chatConfig: clone(stageSeed.chatConfig)
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

function buildStageOverview(stage) {
  const reviewItems = getReviewItems(stage);
  const total = reviewItems.length;
  const completed = reviewItems.filter((item) => item.status === 'reviewed').length;
  const pending = reviewItems.filter((item) => ['draft', 'pending', 'in_review'].includes(item.status)).length;
  const disputed = reviewItems.filter((item) => item.status === 'disputed').length;
  const needsRevision = reviewItems.filter((item) => item.status === 'needs_revision').length;
  const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  let status = 'not_started';
  if (total > 0 && completed === total) {
    status = 'completed';
  } else if (disputed > 0 || needsRevision > 0) {
    status = 'blocked';
  } else if (completed > 0 || pending > 0) {
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

function buildStageTransitionDecision(fromStage, toStage) {
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
    const stageOverview = buildStageOverview(prerequisiteStage);
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

function buildReviewStageOverviewPayload(currentStage = getCurrentStage()) {
  return {
    currentStage,
    stages: REVIEW_STAGES.map((stage) => {
      const overview = buildStageOverview(stage);
      const decision = buildStageTransitionDecision(currentStage, stage);

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

async function resolveKnowledgeSearch({ query = '', itemId, limit = 3, ontologyPathLabels = [] }) {
  const reviewItem = itemId ? getReviewItemStateOrThrow(itemId).item : null;
  return knowledgeBaseClient.search({
    query,
    reviewItem,
    ontologyPathLabels,
    limit
  });
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

  const knowledgeSearch = await resolveKnowledgeSearch({
    query: reviewItemState.item.title,
    itemId,
    limit: 3,
    ontologyPathLabels: seed.ontologyPathLabels
  });

  const knowledgeDocuments = knowledgeSearch.documents.map((document, index) =>
    knowledgeBaseClient.toDocumentFragment(document, {
      terms: [reviewItemState.item.title, reviewItemState.item.description, seed.ontologyPathLabels],
      relevance: Math.max(0.7, 0.96 - index * 0.08)
    })
  );

  return {
    ...clone(seed),
    chain: {
      ...clone(seed.chain),
      documents: knowledgeDocuments.length > 0 ? knowledgeDocuments : clone(seed.chain.documents)
    }
  };
}

async function buildAiResponse({ prompt, itemId, stage, useCase = 'general', context = [] }) {
  const reviewItemState = itemId ? getReviewItemStateOrThrow(itemId) : null;
  const resolvedStage = reviewItemState?.stage ?? stage ?? getCurrentStage();
  const ontologyPathLabels = itemId
    ? reasoningSeedMap[itemId]?.ontologyPathLabels ?? getStageItemContext(itemId)?.ontologyPathLabels ?? []
    : [];
  const knowledgeSearch = await resolveKnowledgeSearch({
    query: prompt,
    itemId,
    limit: 3,
    ontologyPathLabels
  });

  return llmClient.complete({
    prompt,
    useCase,
    context: [
      `当前评审阶段：${REVIEW_STAGE_LABELS[resolvedStage]}`,
      ...context,
      reviewItemState ? `评审项：${reviewItemState.item.title}` : null,
      reviewItemState?.item.description ?? null,
      ontologyPathLabels.length > 0 ? `本体路径：${ontologyPathLabels.join(' -> ')}` : null
    ].filter(Boolean),
    knowledgeDocuments: knowledgeSearch.documents,
    metadata: {
      stage: resolvedStage,
      stageLabel: REVIEW_STAGE_LABELS[resolvedStage],
      reviewItemId: reviewItemState?.item.id,
      reviewItemTitle: reviewItemState?.item.title
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
        currentStage: getCurrentStage(),
        integrations: {
          knowledgeBaseProvider: knowledgeBaseClient.name,
          llmProvider: llmClient.name,
          availableKnowledgeBaseProviders: listKnowledgeBaseProviders(),
          availableLlmProviders: listLlmProviders()
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

      const role = username.toLowerCase().includes('admin')
        ? 'admin'
        : username.toLowerCase().includes('apply')
          ? 'applicant'
          : 'expert';

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

    if (method === 'GET' && pathname === '/api/app-state') {
      const stage = parseOptionalReviewStage(requestUrl.searchParams.get('stage')) ?? getCurrentStage();
      sendJson(res, 200, getAppStatePayload(stage));
      return;
    }

    if (method === 'GET' && pathname === '/api/review-stage/overview') {
      sendJson(res, 200, buildReviewStageOverviewPayload());
      return;
    }

    if (method === 'POST' && pathname === '/api/review-stage') {
      const body = await readRequestBody(req);
      const stage = parseRequiredReviewStage(body.stage);
      const currentStage = getCurrentStage();
      const decision = buildStageTransitionDecision(currentStage, stage);

      if (!decision.allowed) {
        sendJson(res, 409, { message: decision.message });
        return;
      }

      stateStore.setCurrentStage(stage);
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
      stateStore.prependActivity(buildActivity('查看依据', reviewItemState.item.title, 'info'), reviewItemState.stage);

      sendJson(res, 200, reasoning);
      return;
    }

    if (routeMatch?.type === 'review-history' && method === 'GET') {
      const reviewItemState = getReviewItemStateOrThrow(routeMatch.itemId);

      sendJson(res, 200, {
        itemId: routeMatch.itemId,
        entries: stateStore.getReviewHistory(routeMatch.itemId, reviewItemState.stage)
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
        stage: reviewItemState.stage,
        activity,
        historyEntry
      });

      if (!updatedItem) {
        sendJson(res, 500, { message: '更新评审项失败。' });
        return;
      }

      sendJson(res, 200, {
        item: updatedItem,
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
