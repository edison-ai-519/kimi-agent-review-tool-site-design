import { normalizeLlmCompletionResult } from '../contracts.mjs';

function summarizeKnowledgeDocuments(knowledgeDocuments) {
  if (!Array.isArray(knowledgeDocuments) || knowledgeDocuments.length === 0) {
    return '当前没有命中知识库材料，请先按通用评审结构组织回答。';
  }

  return knowledgeDocuments
    .slice(0, 3)
    .map((document, index) => {
      const sourceLabel = document.tags?.includes('project-evidence') ? '项目材料' : '知识库';
      return `${index + 1}. [${sourceLabel}] ${document.title}：${document.summary}`;
    })
    .join('\n');
}

function summarizeContext(context) {
  if (!Array.isArray(context) || context.length === 0) {
    return '当前未传入额外上下文。';
  }

  const normalized = context.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  const ontologyLines = normalized.filter((entry) => entry.includes('本体'));
  const otherLines = normalized.filter((entry) => !entry.includes('本体')).slice(0, 3);

  return [...otherLines, ...ontologyLines].slice(0, 6).join('；');
}

function buildMockCompletion({ prompt, context, knowledgeDocuments, useCase, metadata }) {
  const contextSummary = summarizeContext(context);
  const knowledgeSummary = summarizeKnowledgeDocuments(knowledgeDocuments);
  const targetName = metadata?.reviewItemTitle ? `“${metadata.reviewItemTitle}”` : '当前问题';

  if (useCase === 'review-suggestion') {
    return [
      '以下内容由预留 AI 接口生成，当前为模拟输出，可直接替换为真实模型调用。',
      `${targetName}建议先给出明确结论，再补充 2-3 条来自知识库或评审材料的依据，最后说明风险边界与后续动作。`,
      `任务提示：${prompt}`,
      `知识库摘要：\n${knowledgeSummary}`,
      `补充上下文：${contextSummary}`
    ].join('\n');
  }

  if (useCase === 'chat') {
    return [
      '以下内容由预留 AI 接口生成，当前为模拟输出。',
      `针对你的问题“${prompt}”，建议按“结论 -> 依据 -> 风险 -> 建议动作”四段式理解。`,
      `可参考的知识库材料：\n${knowledgeSummary}`,
      `当前上下文：${contextSummary}`
    ].join('\n');
  }

  if (useCase === 'review-evaluation') {
    return [
      '以下内容由预留 AI 接口生成，当前为模拟评审输出。',
      `${targetName}建议按“评审结论 -> 本体校验 -> 证据依据 -> 缺口提示 -> 下一步动作”五段式整理。`,
      `任务提示：${prompt}`,
      `知识库摘要：\n${knowledgeSummary}`,
      `本体与评审上下文：${contextSummary}`
    ].join('\n');
  }

  if (useCase === 'reasoning-summary') {
    return [
      '以下内容由预留 AI 接口生成，当前为模拟推理总结。',
      `${targetName}的推理结论应同时引用本体规则、知识库证据和当前阶段状态。`,
      `任务提示：${prompt}`,
      `知识库摘要：\n${knowledgeSummary}`,
      `本体与评审上下文：${contextSummary}`
    ].join('\n');
  }

  return [
    '以下内容由预留 AI 接口生成，当前为模拟输出。',
    `任务提示：${prompt}`,
    `知识库摘要：\n${knowledgeSummary}`,
    `上下文摘要：${contextSummary}`
  ].join('\n');
}

export function createMockLlmProvider() {
  const provider = process.env.LLM_PROVIDER ?? 'mock';
  const model = process.env.LLM_MODEL ?? 'mock-review-assistant-v1';

  return {
    name: 'mock',

    async complete({ prompt, context = [], knowledgeDocuments = [], useCase = 'general', metadata = {} }) {
      const trimmedPrompt = String(prompt ?? '').trim();
      if (!trimmedPrompt) {
        throw new Error('Prompt is required.');
      }

      return normalizeLlmCompletionResult(
        {
          provider,
          model,
          useCase,
          text: buildMockCompletion({
            prompt: trimmedPrompt,
            context,
            knowledgeDocuments,
            useCase,
            metadata
          }),
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
  };
}
