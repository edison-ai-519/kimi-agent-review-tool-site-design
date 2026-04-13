import type {
  AppStatePayload,
  AuthSession,
  KnowledgeDocument,
  KnowledgeSearchResult,
  LlmCompletionResult,
  ProjectSubmissionInput,
  ProjectSummary,
  ReasoningData,
  ReviewActivity,
  ReviewHistoryEntry,
  ReviewHistoryPayload,
  ReviewItem,
  ReviewStage,
  ReviewStageOverviewPayload,
  UserRole
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

export function login(username: string, password: string, role: UserRole) {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  });
}

export function getAppState(stage?: ReviewStage) {
  const searchParams = new URLSearchParams();
  if (stage) {
    searchParams.set('stage', stage);
  }

  const search = searchParams.toString();
  return request<AppStatePayload>(`/api/app-state${search ? `?${search}` : ''}`);
}

export function getProjects() {
  return request<{ currentProjectId: string; projects: ProjectSummary[] }>('/api/projects');
}

export function submitProject(payload: ProjectSubmissionInput) {
  return request<{ project: ProjectSummary; message: string }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function selectProject(projectId: string) {
  return request<{ project: ProjectSummary; currentProjectId: string }>('/api/projects/current', {
    method: 'POST',
    body: JSON.stringify({ projectId })
  });
}

export function setReviewStage(stage: ReviewStage) {
  return request<{ stage: ReviewStage; label: string; message?: string }>('/api/review-stage', {
    method: 'POST',
    body: JSON.stringify({ stage })
  });
}

export function getReviewStageOverview() {
  return request<ReviewStageOverviewPayload>('/api/review-stage/overview');
}

export function getKnowledgeBase() {
  return request<AppStatePayload['knowledgeBase']>('/api/knowledge-base');
}

export function getReasoning(itemId: string) {
  return request<ReasoningData>(`/api/review-items/${itemId}/reasoning`);
}

export function updateReviewItem(itemId: string, payload: Partial<Pick<ReviewItem, 'score' | 'comment' | 'status'>>) {
  return request<{ item: ReviewItem; historyEntry?: ReviewHistoryEntry; activity?: ReviewActivity }>(`/api/review-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function sendChatMessage(message: string, itemId?: string, stage?: ReviewStage) {
  return request<ChatReplyPayload>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(stage ? { stage } : {}),
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
  stage?: ReviewStage;
  useCase?: string;
  context?: string[];
}) {
  return request<LlmCompletionResult>('/api/llm/complete', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
