import { normalizeLlmCompletionResult } from '../contracts.mjs';

export function createHttpTemplateLlmProvider() {
  const endpoint = process.env.LLM_ENDPOINT ?? '';
  const apiKey = process.env.LLM_API_KEY ?? '';
  const provider = process.env.LLM_PROVIDER ?? 'http-template';
  const model = process.env.LLM_MODEL ?? 'external-model';

  return {
    name: 'http-template',

    async complete({ prompt, context = [], knowledgeDocuments = [], useCase = 'general', metadata = {} }) {
      const trimmedPrompt = String(prompt ?? '').trim();
      if (!trimmedPrompt) {
        throw new Error('Prompt is required.');
      }

      if (!endpoint) {
        return normalizeLlmCompletionResult(
          {
            provider,
            model,
            useCase,
            text: [
              '当前启用了 HTTP 模板 LLM provider，但尚未配置 LLM_ENDPOINT。',
              '后续只要让你的模型服务按约定接收 JSON 并返回 { text, provider, model, relatedDocuments }，这里就可以直接接上。'
            ].join('\n'),
            createdAt: new Date().toISOString(),
            relatedDocuments: knowledgeDocuments
          },
          {
            provider,
            model,
            useCase
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
          prompt: trimmedPrompt,
          useCase,
          context,
          knowledgeDocuments,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error(`LLM provider request failed with status ${response.status}.`);
      }

      const payload = await response.json();
      return normalizeLlmCompletionResult(payload, {
        provider,
        model,
        useCase
      });
    }
  };
}
