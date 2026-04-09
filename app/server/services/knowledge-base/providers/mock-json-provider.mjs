import { clone, normalizeKnowledgeBase, normalizeKnowledgeSearchResult } from '../contracts.mjs';

function collectTerms(parts) {
  const terms = new Set();

  for (const part of parts.flat()) {
    const text = String(part ?? '').trim();
    if (!text) {
      continue;
    }

    terms.add(text);

    const tokens = text
      .split(/[\s,.;:，。；：、/()（）-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);

    for (const token of tokens) {
      terms.add(token);
    }
  }

  return [...terms];
}

function buildHighlights(document, terms) {
  const matchedTerms = terms.filter((term) => {
    const normalizedTerm = term.toLowerCase();
    return (
      document.title.toLowerCase().includes(normalizedTerm) ||
      document.summary.toLowerCase().includes(normalizedTerm) ||
      document.content.toLowerCase().includes(normalizedTerm) ||
      document.tags.some((tag) => tag.toLowerCase().includes(normalizedTerm))
    );
  });

  const highlights = matchedTerms.length > 0 ? matchedTerms : document.tags.slice(0, 3);
  return highlights.slice(0, 3);
}

function scoreDocument(document, terms) {
  const haystack = [
    document.title,
    document.category,
    document.summary,
    document.content,
    ...document.tags
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;

  for (const term of terms) {
    const normalizedTerm = term.toLowerCase();
    if (!normalizedTerm) {
      continue;
    }

    if (document.tags.some((tag) => tag.toLowerCase().includes(normalizedTerm))) {
      score += 5;
    }

    if (document.title.toLowerCase().includes(normalizedTerm)) {
      score += 4;
    }

    if (document.summary.toLowerCase().includes(normalizedTerm)) {
      score += 3;
    }

    if (haystack.includes(normalizedTerm)) {
      score += 1;
    }
  }

  return score;
}

export function createMockJsonKnowledgeBaseProvider({ knowledgeBase }) {
  const base = normalizeKnowledgeBase(knowledgeBase);

  return {
    name: 'mock-json',

    getKnowledgeBase() {
      return clone(base);
    },

    async search({ query = '', reviewItem = null, ontologyPathLabels = [], limit = 3 } = {}) {
      const terms = collectTerms([query, reviewItem?.title, reviewItem?.description, ontologyPathLabels]);

      const rankedDocuments = base.documents
        .map((document) => ({
          document,
          score: scoreDocument(document, terms)
        }))
        .sort((left, right) => right.score - left.score);

      const topDocuments = rankedDocuments
        .filter((entry) => entry.score > 0)
        .slice(0, limit)
        .map((entry) => clone(entry.document));

      return normalizeKnowledgeSearchResult(
        {
          query: query || reviewItem?.title || '',
          source: 'mock-json',
          total: topDocuments.length,
          documents: topDocuments
        },
        query
      );
    },

    toDocumentFragment(document, { terms = [], relevance = 0.8 } = {}) {
      return {
        id: `fragment-${document.id}`,
        source: document.title,
        content: document.content,
        highlights: buildHighlights(document, collectTerms(terms)),
        relevance
      };
    }
  };
}
