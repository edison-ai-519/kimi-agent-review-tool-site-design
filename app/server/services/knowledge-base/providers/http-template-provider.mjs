import { clone, normalizeKnowledgeBase, normalizeKnowledgeSearchResult } from '../contracts.mjs';

export function createHttpTemplateKnowledgeBaseProvider({ knowledgeBase }) {
  const base = normalizeKnowledgeBase(knowledgeBase);
  const endpoint = process.env.KNOWLEDGE_BASE_ENDPOINT ?? '';
  const apiKey = process.env.KNOWLEDGE_BASE_API_KEY ?? '';
  const namespace = process.env.KNOWLEDGE_BASE_NAMESPACE ?? '';

  return {
    name: 'http-template',

    getKnowledgeBase() {
      return {
        ...clone(base),
        description: endpoint
          ? `${base.description} 当前通过 HTTP 模板 provider 接入外部知识库。`
          : `${base.description} 当前为 HTTP 模板 provider，占位返回本地元数据。`
      };
    },

    async search({ query = '', reviewItem = null, ontologyPathLabels = [], limit = 3 } = {}) {
      if (!endpoint) {
        return normalizeKnowledgeSearchResult(
          {
            query: query || reviewItem?.title || '',
            source: 'http-template',
            total: 0,
            documents: []
          },
          query
        );
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          query,
          reviewItem,
          ontologyPathLabels,
          limit,
          namespace
        })
      });

      if (!response.ok) {
        throw new Error(`Knowledge base provider request failed with status ${response.status}.`);
      }

      const payload = await response.json();
      return normalizeKnowledgeSearchResult(payload, query);
    },

    toDocumentFragment(document, { terms = [], relevance = 0.8 } = {}) {
      const normalizedTerms = Array.isArray(terms) ? terms.flat().filter(Boolean) : [];

      return {
        id: `fragment-${document.id}`,
        source: document.title,
        content: document.content,
        highlights: normalizedTerms.slice(0, 3),
        relevance
      };
    }
  };
}
