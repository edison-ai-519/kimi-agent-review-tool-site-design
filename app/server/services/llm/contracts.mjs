export function normalizeLlmCompletionResult(result, fallback = {}) {
  return {
    provider: String(result?.provider ?? fallback.provider ?? 'unknown'),
    model: String(result?.model ?? fallback.model ?? 'unknown'),
    useCase: String(result?.useCase ?? fallback.useCase ?? 'general'),
    text: String(result?.text ?? ''),
    createdAt: String(result?.createdAt ?? new Date().toISOString()),
    relatedDocuments: Array.isArray(result?.relatedDocuments) ? result.relatedDocuments : []
  };
}
