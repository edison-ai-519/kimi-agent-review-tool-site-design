import type {
  AppStatePayload,
  AuthSession,
  KnowledgeDocument,
  KnowledgeSearchResult,
  LlmCompletionResult,
  ReasoningData,
  ReviewHistoryEntry,
  ReviewHistoryPayload,
  ReviewItem
} from '@/types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');

interface ChatReplyPayload {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: string;
  };
  relatedDocuments?: KnowledgeDocument[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorPayload?.message ?? 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function getAppState() {
  return request<AppStatePayload>('/api/app-state');
}

export function getKnowledgeBase() {
  return request<AppStatePayload['knowledgeBase']>('/api/knowledge-base');
}

export function getReasoning(itemId: string) {
  return request<ReasoningData>(`/api/review-items/${itemId}/reasoning`);
}

export function updateReviewItem(itemId: string, payload: Partial<Pick<ReviewItem, 'score' | 'comment' | 'status'>>) {
  return request<{ item: ReviewItem; historyEntry?: ReviewHistoryEntry }>(`/api/review-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function sendChatMessage(message: string, itemId?: string) {
  return request<ChatReplyPayload>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(itemId ? { itemId } : {})
    })
  });
}

export function getReviewHistory(itemId: string) {
  return request<ReviewHistoryPayload>(`/api/review-items/${itemId}/history`);
}

export function searchKnowledgeBase(payload: {
  query?: string;
  itemId?: string;
  limit?: number;
}) {
  return request<KnowledgeSearchResult>('/api/knowledge-base/search', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function requestLlmCompletion(payload: {
  prompt: string;
  itemId?: string;
  useCase?: string;
  context?: string[];
}) {
  return request<LlmCompletionResult>('/api/llm/complete', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
