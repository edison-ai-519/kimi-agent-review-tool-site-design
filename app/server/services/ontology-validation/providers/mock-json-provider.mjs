import { createOntologyValidationEngine } from '../../../ontology-validation.mjs';
import {
  normalizeOntologyContextVectors,
  normalizeOntologyValidationKnowledgeBase,
  normalizeOntologyValidationResult
} from '../contracts.mjs';

function roundVectorValue(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function calculateMockContextVectors({ fallbackVectors = [], reviewItems = [], stage }) {
  const total = Math.max(reviewItems.length, 1);
  const disputed = reviewItems.filter((item) => item.status === 'disputed').length;
  const needsRevision = reviewItems.filter((item) => item.status === 'needs_revision').length;
  const pending = reviewItems.filter((item) => ['draft', 'pending', 'in_review'].includes(item.status)).length;
  const reviewed = reviewItems.filter((item) => item.status === 'reviewed').length;
  const scoreCoverage = reviewItems.filter((item) => typeof item.score === 'number').length / total;
  const commentCoverage = reviewItems.filter((item) => String(item.comment ?? '').trim()).length / total;
  const stageBoost = stage === 'proposal' ? 0.08 : stage === 'midterm' ? 0.12 : 0.16;

  const vectorByName = new Map(fallbackVectors.map((vector) => [vector.name, vector]));

  return normalizeOntologyContextVectors([
    {
      name: '需求本体',
      color: vectorByName.get('需求本体')?.color ?? '#3b82f6',
      value: roundVectorValue(0.32 + reviewed / total * 0.34 + commentCoverage * 0.2 + stageBoost)
    },
    {
      name: '方案本体',
      color: vectorByName.get('方案本体')?.color ?? '#f97316',
      value: roundVectorValue(0.28 + scoreCoverage * 0.25 + pending / total * 0.18 + (stage === 'midterm' ? 0.12 : 0))
    },
    {
      name: '风险本体',
      color: vectorByName.get('风险本体')?.color ?? '#ef4444',
      value: roundVectorValue(0.18 + disputed / total * 0.36 + needsRevision / total * 0.28 + (stage === 'final' ? 0.1 : 0))
    }
  ]);
}

export function createMockJsonOntologyValidationProvider({ ontologyKnowledgeBase }) {
  const metadata = normalizeOntologyValidationKnowledgeBase(ontologyKnowledgeBase);
  const engine = createOntologyValidationEngine({ ontologyKnowledgeBase });

  return {
    name: 'mock-json',

    getKnowledgeBase() {
      return { ...metadata };
    },

    async validateReviewItem(input) {
      return normalizeOntologyValidationResult(engine.validateReviewItem(input), {
        ontologyVersion: metadata.version
      });
    },

    async getContextVectors(input) {
      return calculateMockContextVectors(input);
    }
  };
}
