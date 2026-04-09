import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

let reviewItems = clone(appStateSeed.reviewItems);
let activityFeed = clone(appStateSeed.activityFeed);

const HOST = process.env.API_HOST ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? 8787);
const REVIEW_STATUSES = ['pending', 'reviewed', 'disputed'];

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

function getReviewItemOrThrow(itemId) {
  const reviewItem = getReviewItemById(itemId);
  if (!reviewItem) {
    throw new HttpError(404, '未找到评审项。');
  }

  return reviewItem;
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

function getReviewItemById(itemId) {
  return reviewItems.find((item) => item.id === itemId) ?? null;
}

function addActivity(action, target, type) {
  activityFeed = [
    {
      id: `activity-${randomUUID()}`,
      action,
      target,
      type,
      createdAt: new Date().toISOString()
    },
    ...activityFeed
  ].slice(0, 8);
}

function getAppStatePayload() {
  return {
    ...clone(appStateSeed),
    reviewItems: clone(reviewItems),
    activityFeed: clone(activityFeed),
    knowledgeBase: knowledgeBaseClient.getKnowledgeBase()
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

  const reviewItemMatch = pathname.match(/^\/api\/review-items\/([^/]+)$/);
  if (reviewItemMatch) {
    return { type: 'review-item', itemId: reviewItemMatch[1] };
  }

  return null;
}

async function resolveKnowledgeSearch({ query = '', itemId, limit = 3, ontologyPathLabels = [] }) {
  const reviewItem = itemId ? getReviewItemOrThrow(itemId) : null;
  return knowledgeBaseClient.search({
    query,
    reviewItem,
    ontologyPathLabels,
    limit
  });
}

async function buildReasoningPayload(itemId) {
  const seed = reasoningSeedMap[itemId];
  const reviewItem = getReviewItemById(itemId);

  if (!seed || !reviewItem) {
    return null;
  }

  const knowledgeSearch = await resolveKnowledgeSearch({
    query: reviewItem.title,
    itemId,
    limit: 3,
    ontologyPathLabels: seed.ontologyPathLabels
  });

  const knowledgeDocuments = knowledgeSearch.documents.map((document, index) =>
    knowledgeBaseClient.toDocumentFragment(document, {
      terms: [reviewItem.title, reviewItem.description, seed.ontologyPathLabels],
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

async function buildAiResponse({ prompt, itemId, useCase = 'general', context = [] }) {
  const reviewItem = itemId ? getReviewItemOrThrow(itemId) : null;
  const ontologyPathLabels = itemId ? reasoningSeedMap[itemId]?.ontologyPathLabels ?? [] : [];
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
      ...context,
      reviewItem ? `评审项：${reviewItem.title}` : null,
      reviewItem?.description ?? null,
      ontologyPathLabels.length > 0 ? `本体路径：${ontologyPathLabels.join(' -> ')}` : null
    ].filter(Boolean),
    knowledgeDocuments: knowledgeSearch.documents,
    metadata: {
      reviewItemId: reviewItem?.id,
      reviewItemTitle: reviewItem?.title
    }
  });
}

function updateReviewItem(itemId, updates) {
  let updatedItem = null;

  reviewItems = reviewItems.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    updatedItem = {
      ...item,
      ...updates
    };

    return updatedItem;
  });

  return updatedItem;
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
      sendJson(res, 200, getAppStatePayload());
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
      const ontologyPathLabels =
        itemId && reasoningSeedMap[itemId] ? reasoningSeedMap[itemId].ontologyPathLabels : [];

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

      if (!message) {
        sendJson(res, 400, { message: '消息内容不能为空。' });
        return;
      }

      const completion = await buildAiResponse({
        prompt: message,
        itemId,
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
      const useCase = typeof body.useCase === 'string' ? body.useCase : 'general';
      const context = Array.isArray(body.context) ? body.context : [];

      const completion = await buildAiResponse({
        prompt,
        itemId,
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

      addActivity('查看', `${getReviewItemById(routeMatch.itemId)?.title ?? '评审项'}依据`, 'info');
      sendJson(res, 200, reasoning);
      return;
    }

    if (routeMatch?.type === 'review-item' && method === 'PATCH') {
      const body = await readRequestBody(req);
      const currentItem = getReviewItemOrThrow(routeMatch.itemId);
      const nextUpdates = parseReviewItemUpdates(currentItem, body);
      const updatedItem = updateReviewItem(routeMatch.itemId, {
        score: nextUpdates.score,
        comment: nextUpdates.comment,
        status: nextUpdates.status,
        confidence:
          nextUpdates.status === 'reviewed'
            ? Math.max(currentItem.confidence, 0.82)
            : nextUpdates.status === 'disputed'
              ? Math.max(currentItem.confidence, 0.68)
              : currentItem.confidence
      });

      if (!updatedItem) {
        sendJson(res, 500, { message: '更新评审项失败。' });
        return;
      }

      addActivity(
        nextUpdates.status === 'reviewed' ? '提交' : '暂存',
        updatedItem.title,
        nextUpdates.status === 'disputed' ? 'warning' : 'success'
      );
      sendJson(res, 200, { item: clone(updatedItem) });
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
