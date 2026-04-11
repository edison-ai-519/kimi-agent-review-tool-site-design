import { createOntologyValidationEngine } from '../../../ontology-validation.mjs';
import {
  normalizeOntologyValidationKnowledgeBase,
  normalizeOntologyValidationResult
} from '../contracts.mjs';

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
    }
  };
}
