# Integration Contracts

This project now separates two replaceable integration layers:

- `Knowledge Base Provider`
- `LLM Provider`

The default runtime still uses mock providers, but the code now includes HTTP template providers so a real service can be connected later without rewriting the application layer.

## Knowledge Base

Runtime switch:

- `KNOWLEDGE_BASE_PROVIDER=mock-json`
- `KNOWLEDGE_BASE_PROVIDER=http-template`

Optional environment variables for the HTTP template provider:

- `KNOWLEDGE_BASE_ENDPOINT`
- `KNOWLEDGE_BASE_API_KEY`
- `KNOWLEDGE_BASE_NAMESPACE`

Request payload sent by the HTTP template knowledge base provider:

```json
{
  "query": "预算争议",
  "reviewItem": {
    "id": "4",
    "title": "预算合理性",
    "description": "评估经费结构是否清晰...",
    "status": "disputed",
    "confidence": 0.66,
    "score": 15,
    "maxScore": 20,
    "comment": "设备采购和标注成本占比较高..."
  },
  "ontologyPathLabels": ["预算结构", "设备采购", "数据与标注成本"],
  "limit": 3,
  "namespace": "default"
}
```

Expected response shape:

```json
{
  "query": "预算争议",
  "source": "external-service",
  "total": 2,
  "documents": [
    {
      "id": "doc-1",
      "title": "预算说明",
      "category": "finance",
      "summary": "预算应明确设备采购与标注成本边界。",
      "content": "完整文档内容或截断后的正文。",
      "tags": ["预算", "设备采购"],
      "updatedAt": "2026-04-09T09:00:00.000Z"
    }
  ]
}
```

## LLM

Runtime switch:

- `LLM_PROVIDER=mock`
- `LLM_PROVIDER=http-template`

Optional environment variables for the HTTP template provider:

- `LLM_ENDPOINT`
- `LLM_API_KEY`
- `LLM_MODEL`

Request payload sent by the HTTP template LLM provider:

```json
{
  "prompt": "请为预算合理性生成一段评审辅助意见",
  "useCase": "review-suggestion",
  "context": ["预算说明待补充"],
  "knowledgeDocuments": [
    {
      "id": "doc-1",
      "title": "预算说明",
      "category": "finance",
      "summary": "预算应明确设备采购与标注成本边界。",
      "content": "完整文档内容",
      "tags": ["预算", "设备采购"],
      "updatedAt": "2026-04-09T09:00:00.000Z"
    }
  ],
  "metadata": {
    "reviewItemId": "4",
    "reviewItemTitle": "预算合理性"
  }
}
```

Expected response shape:

```json
{
  "provider": "your-provider",
  "model": "your-model",
  "useCase": "review-suggestion",
  "text": "这里返回真实模型生成的内容。",
  "createdAt": "2026-04-09T09:00:00.000Z",
  "relatedDocuments": [
    {
      "id": "doc-1",
      "title": "预算说明",
      "category": "finance",
      "summary": "预算应明确设备采购与标注成本边界。",
      "content": "完整文档内容",
      "tags": ["预算", "设备采购"],
      "updatedAt": "2026-04-09T09:00:00.000Z"
    }
  ]
}
```

## Replacement Path

If you later connect real services, you have two options:

1. Keep using the HTTP template providers and make your external services follow the JSON contracts above.
2. Add a brand-new provider file under:
   - `server/services/knowledge-base/providers/`
   - `server/services/llm/providers/`

Then register it in:

- `server/services/knowledge-base/index.mjs`
- `server/services/llm/index.mjs`
