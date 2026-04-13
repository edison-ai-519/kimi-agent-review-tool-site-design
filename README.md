# Kimi Agent Review Tool Site Design

一个面向科研项目评审场景的 Web 工作台示例。当前版本已经不只是静态演示稿，而是一个包含前端界面、最小后端服务、本地运行态持久化和多阶段评审流程的可联调项目。

## 当前概览

- 支持 `立项评审 / 中期检查 / 结题验收` 三个阶段，并为每个阶段维护独立的评审项、动态、历史和聊天上下文。
- 支持独立项目中心。项目中心可以切换项目，也可以提交新项目并自动生成评审清单。
- 支持阶段总览与流转校验。上一阶段未完成、存在待补材料或争议项时，后续阶段会被阻止进入。
- 支持评审项编辑、评分、状态流转、辅助意见生成、推理依据查看和历史记录查看。
- 支持 AI 助手引用资料展示，辅助意见生成也会展示本次参考资料。
- 支持本体驱动规则校验，评审项会展示本体校验结果、LLM 参与建议和参考资料。
- 支持桌面端工作台设置、通知中心、入口角色展示和评审列表搜索/筛选/排序。
- 支持评审专家、申报方、管理员三类登录入口，当前入口只生成对应演示会话角色。
- 后端会将运行态写入本地 JSON 文件，服务重启后仍能保留评审修改结果。

## 已实现能力

### 评审流程

- 三阶段评审：`proposal`、`midterm`、`final`
- 阶段总览：完成数、待处理数、待补材料数、争议数、完成度
- 阶段流转规则校验
- 阶段结论建议与全阶段流转展示

### 评审工作台

- 评审项展开编辑
- 评分、评审意见、状态更新
- 状态枚举：`draft`、`pending`、`in_review`、`needs_revision`、`reviewed`、`disputed`
- 评审项搜索、筛选、排序
- 单项评审历史记录
- 推理依据面板
- 生成辅助意见并展示引用资料
- 本体校验状态、命中概念、证据检查和 LLM 评审建议展示

### 顶部导航与桌面体验

- 通知中心：展示最近评审动态与未读数量
- 入口角色展示：`评审专家 / 申报方 / 系统管理员`
- 设置面板：悬浮聊天、底部状态栏
- 桌面端只保留右下角悬浮评审助手，不再占用评审工作区中间栏
- 这些设置会保存在浏览器本地

### AI 与知识库

- 聊天助手走统一后端接口
- 支持知识库搜索
- 支持推理依据、文档引用和本体路径展示
- 支持本体验证 provider，`/api/app-state` 返回评审项时会带上 `ontologyValidation` 和 `llmParticipation`
- 支持通过本体 provider 动态返回 `contextVectors`，用于后续接入真实本体服务后的情境联合向量展示
- 当前默认 provider 仍为 mock，可切换为 HTTP 模板 provider

### 数据与持久化

- 本地种子数据：项目、知识库、推理映射
- 本地运行态持久化：阶段状态、评审项修改、活动流、历史记录
- 多项目运行态：项目列表、当前项目、每个项目独立的三阶段状态
- 重启后端后会继续读取上次运行态

## 当前限制

- 登录入口仍然是演示模式，不是正式账号体系
- 入口角色目前主要作用在前端交互与权限提示上，未接正式鉴权
- 持久化目前基于本地 JSON，不是数据库
- 项目提交当前保存结构化申报材料和附件清单，还没有接对象存储、材料解析、材料版本和补材料闭环
- 默认 AI 与知识库 provider 仍为 mock
- 还没有自动化测试
- 前端构建已通过，但仍有较大的 chunk 告警

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS、shadcn/ui、Framer Motion
- 后端：Node.js 原生 HTTP Server
- 数据：本地 JSON 种子数据 + 本地运行态 JSON

## 项目结构

```text
.
|-- README.md
`-- app/
    |-- README.md
    |-- package.json
    |-- server/
    |   |-- data/
    |   |   |-- app-state.json
    |   |   |-- knowledge-base.json
    |   |   |-- ontology-knowledge-base.json
    |   |   |-- reasoning-map.json
    |   |   `-- runtime-state.json
    |   |-- docs/
    |   |   `-- integration-contracts.md
    |   |-- services/
    |   |   |-- knowledge-base/
    |   |   |-- llm/
    |   |   `-- ontology-validation/
    |   |-- dev.mjs
    |   |-- index.mjs
    |   |-- ontology-validation.mjs
    |   |-- review-stages.mjs
    |   `-- state-store.mjs
    |-- src/
    |   |-- components/
    |   |-- hooks/
    |   |-- lib/
    |   `-- types/
    `-- vite.config.ts
```

## 本地运行

### 1. 安装依赖

```bash
cd app
npm install
```

### 2. 启动前后端

```bash
npm run dev
```

默认地址：

- 前端：[http://127.0.0.1:5173](http://127.0.0.1:5173)
- 后端：[http://127.0.0.1:8787](http://127.0.0.1:8787)
- 健康检查：[http://127.0.0.1:8787/health](http://127.0.0.1:8787/health)

### 3. 分别启动

```bash
# 前端
npm run dev:client -- --host 127.0.0.1 --port 5173

# 后端
npm run start:server
```

### 4. 构建

```bash
npm run build
```

### 5. 代码检查

```bash
npm run lint
```

## 常用脚本

在 `app/` 目录下可用：

- `npm run dev`：同时启动前后端
- `npm run dev:client`：启动前端开发服务器
- `npm run dev:server`：以 watch 模式启动后端
- `npm run start:server`：启动后端服务
- `npm run build`：构建前端并执行 TypeScript 检查
- `npm run lint`：运行 ESLint
- `npm run preview`：预览前端构建产物

## API 概览

- `GET /health`
  返回后端健康状态、当前阶段以及启用中的 provider 信息。

- `POST /api/auth/login`
  演示登录接口，支持 `expert`、`applicant`、`admin` 三类入口角色提示。

- `GET /api/projects`
  返回项目列表和当前项目。

- `POST /api/projects`
  提交新项目。最低只需要项目名称、申报单位、项目摘要、研究目标和技术路线；领域、预算、周期、创新点、里程碑、团队分工、预算拆分、预期成果、风险预案和附件清单可作为补充材料，并自动生成该项目的三阶段评审清单。

- `POST /api/projects/current`
  切换当前工作台项目。

- `GET /api/app-state?stage=proposal|midterm|final`
  返回当前项目指定阶段的项目、评审项、本体、活动流、聊天配置、项目列表和知识库基础信息。评审项会附带本体校验与 LLM 参与结果。

- `GET /api/review-stage/overview`
  返回全阶段概览、完成度、阻塞信息和建议结论。

- `POST /api/review-stage`
  切换当前阶段，并执行阶段流转校验。

- `GET /api/knowledge-base`
  返回当前知识库元数据与文档列表。

- `GET /api/ontology-validation/knowledge-base`
  返回当前本体验证 provider 暴露的本体知识库元数据。

- `POST /api/knowledge-base/search`
  按 `query`、`itemId` 和上下文检索知识库。

- `GET /api/review-items/:id/reasoning`
  返回评审项推理链、总结和引用文档。

- `GET /api/review-items/:id/history`
  返回单项评审历史。

- `PATCH /api/review-items/:id`
  更新评分、意见和状态，并写入活动流与历史记录。

- `POST /api/chat`
  聊天接口，会先检索知识库并注入本体上下文，再调用 AI provider。

- `POST /api/llm/complete`
  通用 AI 补全接口，支持 `prompt`、`itemId`、`stage`、`useCase` 和上下文。用于辅助意见生成时也会带上本体校验上下文。

## 持久化说明

运行态数据会写入：

- `app/server/data/runtime-state.json`

当前会保存的内容包括：

- 当前阶段
- 当前项目与项目列表
- 各阶段评审项最新状态
- 活动流
- 单项评审历史

这个文件已加入 `.gitignore`，不会进入版本库。若要重置到初始演示数据，可以删除该文件后重新启动后端。

## Provider 机制

### Knowledge Base Provider

当前内置：

- `mock-json`
- `http-template`

切换方式：

```bash
KNOWLEDGE_BASE_PROVIDER=mock-json
KNOWLEDGE_BASE_PROVIDER=http-template
```

`http-template` 支持读取：

- `KNOWLEDGE_BASE_ENDPOINT`
- `KNOWLEDGE_BASE_API_KEY`
- `KNOWLEDGE_BASE_NAMESPACE`

### LLM Provider

当前内置：

- `mock`
- `http-template`

切换方式：

```bash
LLM_PROVIDER=mock
LLM_PROVIDER=http-template
```

`http-template` 支持读取：

- `LLM_ENDPOINT`
- `LLM_API_KEY`
- `LLM_MODEL`

### Ontology Validation Provider

当前内置：

- `mock-json`
- `http-template`

切换方式：

```bash
ONTOLOGY_VALIDATION_PROVIDER=mock-json
ONTOLOGY_VALIDATION_PROVIDER=http-template
```

`http-template` 支持读取：

- `ONTOLOGY_VALIDATION_ENDPOINT`
- `ONTOLOGY_CONTEXT_VECTORS_ENDPOINT`
- `ONTOLOGY_VALIDATION_API_KEY`
- `ONTOLOGY_VALIDATION_NAMESPACE`

详细 JSON 对接契约见：

- `app/server/docs/integration-contracts.md`

## 关键文件

- `app/src/App.tsx`
  前端应用入口，负责桌面端与移动端布局组织。

- `app/src/hooks/useReviewApp.ts`
  前端核心状态与接口调用入口，管理阶段切换、聊天、历史、推理和保存逻辑。

- `app/src/components/panels/ReviewWorkspace.tsx`
  评审主工作区，包含评审项列表、阶段面板、历史、本体校验和 LLM 评审建议。

- `app/src/components/navigation/TopNavigation.tsx`
  顶部导航，包含阶段切换、通知、入口角色展示和设置面板。

- `app/src/lib/api.ts`
  前端 API 封装。

- `app/src/lib/review-stage.ts`
  阶段配置、阶段文案与建议结论逻辑。

- `app/src/lib/permissions.ts`
  前端演示权限逻辑。

- `app/server/index.mjs`
  后端入口与路由处理。

- `app/server/review-stages.mjs`
  多阶段评审的种子数据与阶段配置。

- `app/server/state-store.mjs`
  运行态持久化逻辑。

- `app/server/ontology-validation.mjs`
  本体验证 mock 引擎，用于本体团队接入前的接口联调与规则校验演示。

- `app/server/docs/integration-contracts.md`
  知识库、LLM、本体验证 provider 的外部服务对接契约。

- `SYSTEM_DESIGN.md`
  多项目评审系统重设计规划，说明项目提交、项目运行态和后续演进路线。

## 仓库地址

- GitHub: [https://github.com/edison-ai-519/kimi-agent-review-tool-site-design](https://github.com/edison-ai-519/kimi-agent-review-tool-site-design)
