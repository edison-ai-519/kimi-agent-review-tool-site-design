# Integration Contracts

This project now separates these replaceable integration layers:

- `Knowledge Base Provider`
- `LLM Provider`
- `Ontology Validation Provider`
- `Project Evidence Provider`

The default runtime still uses mock providers, but the code now includes HTTP template providers so a real service can be connected later without rewriting the application layer.

`Project Evidence Provider` is intentionally a local development adapter in this version. It defines the storage and evidence-index contract without binding the application to Postgres, S3, OSS, MinIO, or another vendor.

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
    "reviewItemTitle": "预算合理性",
    "ontologyKnowledgeBaseVersion": "1.0.0",
    "ontologyMatchedConcepts": ["预算结构", "设备采购"],
    "ontologyRequiredEvidence": ["预算拆分说明", "成本与研究目标关联"]
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

## Project Evidence

Current provider:

- `local-project-evidence`

The provider is shaped around four operations:

- `prepareProject(project)`: stores uploaded file objects, parses supported attachments, and writes `materials.evidenceDocuments`.
- `listProjectEvidence(project)`: returns structured materials and parsed attachment evidence as normalized knowledge documents.
- `searchProjectEvidence({ project, query, reviewItem, ontologyPathLabels, limit })`: retrieves current project evidence for ontology validation, AI scoring, auxiliary suggestions, and chat.
- `supportedExtensions`: currently `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`.

Evidence document shape matches the knowledge base document contract:

```json
{
  "id": "project-evidence:project-001:attachment:attachment-001:v1",
  "title": "项目名称 - proposal.pdf",
  "category": "proposal",
  "summary": "解析后的摘要文本",
  "content": "解析后的完整文本片段",
  "tags": ["project-evidence", "upload", "proposal"],
  "updatedAt": "2026-04-13T00:00:00.000Z"
}
```

Attachment status is stored back on the project material:

```json
{
  "id": "attachment-001",
  "name": "proposal.pdf",
  "size": 1024,
  "type": "application/pdf",
  "version": 1,
  "storageKey": "project-evidence/files/project-001/1-attachment-001-proposal.pdf",
  "parseStatus": "parsed",
  "parsedAt": "2026-04-13T00:00:00.000Z",
  "evidenceDocumentId": "project-evidence:project-001:attachment:attachment-001:v1",
  "extractedTextPreview": "解析后的文本预览"
}
```

Failure is non-blocking:

```json
{
  "parseStatus": "failed",
  "parseError": "Invalid PDF structure."
}
```

## Replacement Path

If you later connect real services, you have two options:

1. Keep using the HTTP template providers and make your external services follow the JSON contracts above.
2. Add a brand-new provider file under:
   - `server/services/knowledge-base/providers/`
   - `server/services/llm/providers/`
   - `server/services/project-evidence/providers/`

Then register it in:

- `server/services/knowledge-base/index.mjs`
- `server/services/llm/index.mjs`
- `server/services/project-evidence/index.mjs`

## Ontology Validation

Runtime switch:

- `ONTOLOGY_VALIDATION_PROVIDER=mock-json`
- `ONTOLOGY_VALIDATION_PROVIDER=http-template`

Optional environment variables for the HTTP template provider:

- `ONTOLOGY_VALIDATION_ENDPOINT`
- `ONTOLOGY_CONTEXT_VECTORS_ENDPOINT`
- `ONTOLOGY_VALIDATION_API_KEY`
- `ONTOLOGY_VALIDATION_NAMESPACE`

### Metadata endpoint used by the app

The app exposes:

- `GET /api/ontology-validation/knowledge-base`

Example response:

```json
{
  "id": "ontology-review-kb",
  "name": "科研项目评审本体知识库",
  "version": "1.0.0",
  "updatedAt": "2026-04-10T14:30:00.000Z",
  "description": "面向科研项目立项、中期和结题评审的本体知识库。"
}
```

### Request payload sent by the HTTP template ontology validation provider

```json
{
  "stage": "proposal",
  "item": {
    "id": "4",
    "title": "预算合理性",
    "description": "评估经费结构是否清晰、投入比例是否合理，以及关键设备与数据成本说明是否充分。",
    "status": "reviewed",
    "confidence": 0.82,
    "score": 15,
    "maxScore": 20,
    "comment": "设备采购和标注成本占比较高，建议进一步拆分采购项并说明与研究目标的直接关系。"
  },
  "ontologyPathLabels": ["预算结构", "设备采购", "数据与标注成本", "风险控制"],
  "knowledgeDocuments": [
    {
      "id": "kb-003",
      "title": "预算说明模板（模拟）",
      "category": "finance",
      "summary": "预算应明确设备采购、标注成本、测试成本和运行维护边界。",
      "content": "完整文档内容或外部服务需要的文本片段。",
      "tags": ["预算", "设备采购", "标注成本"],
      "updatedAt": "2026-04-09T09:00:00.000Z"
    }
  ],
  "namespace": "default",
  "ontologyKnowledgeBase": {
    "id": "ontology-review-kb",
    "name": "科研项目评审本体知识库",
    "version": "1.0.0",
    "updatedAt": "2026-04-10T14:30:00.000Z",
    "description": "面向科研项目立项、中期和结题评审的本体知识库。"
  }
}
```

### Expected response shape

```json
{
  "status": "warn",
  "summary": "已命中 4 个核心概念，但还需补充 2 项关键证据或资料类型。",
  "ontologyVersion": "1.0.0",
  "ontologyPathLabels": ["预算结构", "设备采购", "数据与标注成本", "风险控制"],
  "matchedConcepts": ["预算结构", "设备采购", "数据与标注成本", "管理风险"],
  "matchedDocumentCategories": ["finance"],
  "missingDocumentCategories": ["proposal"],
  "evidenceChecks": [
    {
      "id": "budget-breakdown",
      "label": "预算拆分说明",
      "matched": true,
      "matchedIn": "both",
      "matchedTerms": ["拆分", "预算说明", "采购项"]
    }
  ],
  "findings": [
    {
      "id": "finding-4-document-category",
      "severity": "warn",
      "severityLabel": "待补充",
      "title": "支撑资料类型不完整",
      "message": "当前缺少以下类型的支撑资料：proposal。",
      "suggestion": "建议补充对应类别的文档，以满足本体规则要求。"
    }
  ],
  "knowledgeDocumentIds": ["kb-003"]
}
```

### Context vectors request

When `/api/app-state` is assembled, the backend can also ask the ontology provider for dynamic context vectors. If `ONTOLOGY_CONTEXT_VECTORS_ENDPOINT` is not configured, the HTTP template provider reuses `ONTOLOGY_VALIDATION_ENDPOINT`.

Example request payload:

```json
{
  "project": {
    "id": "project-001",
    "name": "基于多模态学习的智能评审系统",
    "stage": "proposal"
  },
  "stage": "proposal",
  "reviewItems": [
    {
      "id": "1",
      "title": "技术创新性",
      "status": "reviewed",
      "score": 27,
      "maxScore": 30,
      "comment": "建议补充对比实验。"
    }
  ],
  "activeReviewItem": null,
  "namespace": "default",
  "ontologyKnowledgeBase": {
    "id": "ontology-review-kb",
    "name": "科研项目评审本体知识库",
    "version": "1.0.0"
  },
  "task": "context-vectors"
}
```

Expected response shape:

```json
{
  "vectors": [
    { "name": "需求本体", "value": 0.62, "color": "#3b82f6" },
    { "name": "方案本体", "value": 0.41, "color": "#f97316" },
    { "name": "风险本体", "value": 0.35, "color": "#ef4444" }
  ]
}
```

### Current app behavior

- The backend computes ontology validation for each review item before returning `/api/app-state`.
- The backend computes ontology context vectors through the same ontology provider before returning `/api/app-state`, and falls back to seed vectors if the provider is unavailable.
- The backend also computes `llmParticipation` and read-only `aiScore` for each review item, so the review card itself carries `ontologyValidation + LLM summary + AI score + relatedDocuments`.
- `/api/chat` and `/api/llm/complete` now both inject static knowledge-base retrieval, current project evidence, and ontology context before calling the LLM provider.
- `/api/review-items/:id/reasoning` reuses the same review intelligence context, so reasoning output is also driven by ontology knowledge and LLM participation.
- The mock provider reads a local mocked ontology knowledge base only for testing and interface simulation.
- Later, the real ontology team only needs to implement the JSON contract above, and the app can switch to `http-template` without changing page logic.
