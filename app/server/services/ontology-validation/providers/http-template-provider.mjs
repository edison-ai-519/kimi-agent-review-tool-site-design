import {
  normalizeOntologyValidationKnowledgeBase,
  normalizeOntologyValidationResult
} from '../contracts.mjs';

export function createHttpTemplateOntologyValidationProvider({ ontologyKnowledgeBase }) {
  const endpoint = process.env.ONTOLOGY_VALIDATION_ENDPOINT ?? '';
  const apiKey = process.env.ONTOLOGY_VALIDATION_API_KEY ?? '';
  const namespace = process.env.ONTOLOGY_VALIDATION_NAMESPACE ?? 'default';
  const metadata = normalizeOntologyValidationKnowledgeBase(ontologyKnowledgeBase);

  return {
    name: 'http-template',

    getKnowledgeBase() {
      return {
        ...metadata,
        description: endpoint
          ? `${metadata.description} 当前通过 HTTP 模板本体验证 provider 接入外部服务。`
          : `${metadata.description} 当前启用 HTTP 模板本体验证 provider，但尚未配置 ONTOLOGY_VALIDATION_ENDPOINT。`
      };
    },

    async validateReviewItem({ item, stage, ontologyPathLabels = [], knowledgeDocuments = [] }) {
      if (!endpoint) {
        return normalizeOntologyValidationResult(
          {
            status: 'warn',
            summary: 'HTTP 模板本体验证 provider 尚未配置 ONTOLOGY_VALIDATION_ENDPOINT，当前返回占位校验结果。',
            ontologyVersion: metadata.version,
            ontologyPathLabels,
            matchedConcepts: [],
            matchedDocumentCategories: [],
            missingDocumentCategories: [],
            evidenceChecks: [],
            findings: [
              {
                id: `finding-${item.id}-http-template-unconfigured`,
                severity: 'warn',
                severityLabel: '待补充',
                title: '本体验证服务未配置',
                message: '后续只要让外部本体验证服务按约定接收 JSON 并返回标准结果，这里就能直接切换接入。',
                suggestion: '配置 ONTOLOGY_VALIDATION_ENDPOINT，或切回 mock-json provider。'
              }
            ],
            knowledgeDocumentIds: knowledgeDocuments.map((document) => document.id)
          },
          {
            ontologyVersion: metadata.version
          }
        );
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          stage,
          item,
          ontologyPathLabels,
          knowledgeDocuments,
          namespace,
          ontologyKnowledgeBase: metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Ontology validation provider request failed with status ${response.status}.`);
      }

      const payload = await response.json();
      return normalizeOntologyValidationResult(payload, {
        ontologyVersion: metadata.version
      });
    }
  };
}
