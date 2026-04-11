function normalizeSeverity(value, fallback = 'warn') {
  return ['pass', 'warn', 'fail'].includes(value) ? value : fallback;
}

export function normalizeOntologyValidationKnowledgeBase(payload) {
  return {
    id: String(payload?.id ?? 'ontology-review-kb'),
    name: String(payload?.name ?? 'Ontology Review KB'),
    version: String(payload?.version ?? '1.0.0'),
    updatedAt: String(payload?.updatedAt ?? new Date().toISOString()),
    description: String(payload?.description ?? '')
  };
}

function normalizeContextVectorValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numericValue));
}

export function normalizeOntologyContextVectors(vectors, fallback = []) {
  const source = Array.isArray(vectors) && vectors.length > 0 ? vectors : fallback;
  return source
    .map((vector) => ({
      name: String(vector?.name ?? ''),
      value: normalizeContextVectorValue(vector?.value),
      color: String(vector?.color ?? '#3b82f6')
    }))
    .filter((vector) => vector.name);
}

export function normalizeOntologyValidationResult(result, fallback = {}) {
  return {
    status: normalizeSeverity(result?.status, fallback.status ?? 'warn'),
    summary: String(result?.summary ?? fallback.summary ?? ''),
    ontologyVersion: String(result?.ontologyVersion ?? fallback.ontologyVersion ?? 'unknown'),
    ontologyPathLabels: Array.isArray(result?.ontologyPathLabels)
      ? result.ontologyPathLabels.map((label) => String(label))
      : [],
    matchedConcepts: Array.isArray(result?.matchedConcepts)
      ? result.matchedConcepts.map((concept) => String(concept))
      : [],
    matchedDocumentCategories: Array.isArray(result?.matchedDocumentCategories)
      ? result.matchedDocumentCategories.map((category) => String(category))
      : [],
    missingDocumentCategories: Array.isArray(result?.missingDocumentCategories)
      ? result.missingDocumentCategories.map((category) => String(category))
      : [],
    evidenceChecks: Array.isArray(result?.evidenceChecks)
      ? result.evidenceChecks.map((check) => ({
          id: String(check?.id ?? ''),
          label: String(check?.label ?? ''),
          matched: Boolean(check?.matched),
          matchedIn: ['comment', 'knowledge', 'both', 'none'].includes(check?.matchedIn) ? check.matchedIn : 'none',
          matchedTerms: Array.isArray(check?.matchedTerms) ? check.matchedTerms.map((term) => String(term)) : []
        }))
      : [],
    findings: Array.isArray(result?.findings)
      ? result.findings.map((finding) => ({
          id: String(finding?.id ?? ''),
          severity: normalizeSeverity(finding?.severity),
          severityLabel: String(finding?.severityLabel ?? ''),
          title: String(finding?.title ?? ''),
          message: String(finding?.message ?? ''),
          suggestion: finding?.suggestion ? String(finding.suggestion) : undefined
        }))
      : [],
    knowledgeDocumentIds: Array.isArray(result?.knowledgeDocumentIds)
      ? result.knowledgeDocumentIds.map((documentId) => String(documentId))
      : []
  };
}
