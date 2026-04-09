export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeKnowledgeDocument(document) {
  return {
    id: String(document.id ?? ''),
    title: String(document.title ?? ''),
    category: String(document.category ?? 'general'),
    summary: String(document.summary ?? ''),
    content: String(document.content ?? ''),
    tags: Array.isArray(document.tags) ? document.tags.map((tag) => String(tag)) : [],
    updatedAt: String(document.updatedAt ?? new Date().toISOString())
  };
}

export function normalizeKnowledgeSearchResult(result, fallbackQuery = '') {
  return {
    query: String(result?.query ?? fallbackQuery),
    source: String(result?.source ?? 'unknown'),
    total: Number(result?.total ?? 0),
    documents: Array.isArray(result?.documents) ? result.documents.map(normalizeKnowledgeDocument) : []
  };
}

export function normalizeKnowledgeBase(base) {
  return {
    id: String(base?.id ?? 'knowledge-base'),
    name: String(base?.name ?? 'Knowledge Base'),
    description: String(base?.description ?? ''),
    updatedAt: String(base?.updatedAt ?? new Date().toISOString()),
    documents: Array.isArray(base?.documents) ? base.documents.map(normalizeKnowledgeDocument) : []
  };
}
