# Kimi Agent Review Tool Site Design

一个面向科研项目评审场景的 Web 演示项目。当前版本已经从“纯前端原型”演进为“前端 + 最小后端联调版”，可用于演示评审工作台、本体导航、推理依据、聊天助手，以及移动端视图。

## 当前能力

- 评审工作区：支持展开评审项、评分、填写意见、保存、提交、标记争议。
- 本体导航：支持本体树浏览、搜索、高亮路径、情境联合向量和最近激活概念展示。
- 推理依据面板：可查看评审项的推理链、结论摘要、依据文档和本体路径。
- 聊天助手：统一走后端 AI 接口，并展示关联知识库资料。
- 辅助意见生成：支持基于当前评审项上下文和知识库材料生成评审建议，并展示本次引用资料。
- 评审筛选能力：支持搜索、状态筛选、排序和单项历史记录查看。
- 运行态持久化：评审项修改、活动流和历史记录会写入本地运行态文件，服务重启后保留。

## 当前状态

这个项目目前适合：

- 前后端联调
- 产品演示
- 接入真实知识库和模型前的接口预演

它还不是完整生产系统，仍有这些限制：

- 登录仍然是演示模式，没有正式账号体系和权限控制。
- 持久化目前基于本地 JSON 运行态文件，不是数据库。
- AI 与知识库默认仍使用 mock provider。
- 没有接入正式 RAG、向量检索、审计系统或自动化测试。
- 构建通过，但当前前端仍有较大的打包体积告警。

## 已实现功能

### 前端

- 桌面端和移动端评审工作区
- 评审要点展开编辑
- 评审状态扩展：`draft`、`pending`、`in_review`、`needs_revision`、`reviewed`、`disputed`
- 搜索、筛选、排序
- 推理依据侧栏
- 聊天助手引用资料卡片
- 辅助意见生成引用资料卡片
- 单项评审历史记录

### 后端

- 最小 HTTP API 服务
- 项目状态、知识库、推理依据、聊天、AI 补全接口
- 评审项更新接口
- 评审历史接口
- 本地运行态持久化
- 可替换的 Knowledge Base Provider / LLM Provider

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS、shadcn/ui、Framer Motion
- 后端：Node.js 内置 HTTP Server
- 数据：本地 JSON 种子文件 + 本地运行态 JSON
- 架构：可替换 provider 的集成模式

## 项目结构

```text
.
|-- README.md
|-- .gitignore
`-- app/
    |-- README.md
    |-- package.json
    |-- server/
    |   |-- data/
    |   |   |-- app-state.json
    |   |   |-- knowledge-base.json
    |   |   |-- reasoning-map.json
    |   |   `-- runtime-state.json        # 运行后生成，已加入忽略
    |   |-- docs/
    |   |   `-- integration-contracts.md
    |   |-- services/
    |   |   |-- knowledge-base/
    |   |   `-- llm/
    |   |-- dev.mjs
    |   |-- index.mjs
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

### 2. 同时启动前后端

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

## 可用脚本

在 `app/` 目录下可用：

- `npm run dev`：同时启动前端和后端
- `npm run dev:client`：启动前端开发服务器
- `npm run dev:server`：以 watch 模式启动后端
- `npm run start:server`：启动后端服务
- `npm run build`：构建前端并执行 TypeScript 检查
- `npm run lint`：运行 ESLint
- `npm run preview`：预览前端构建产物

## API 概览

- `GET /health`
  返回后端健康状态和当前启用的 provider 信息。

- `POST /api/auth/login`
  演示登录接口。

- `GET /api/app-state`
  返回项目、评审项、本体、活动流、聊天配置和知识库基础信息。

- `GET /api/knowledge-base`
  返回当前知识库元数据和文档列表。

- `POST /api/knowledge-base/search`
  基于 `query`、`itemId` 和本体路径搜索知识库。

- `GET /api/review-items/:id/reasoning`
  返回对应评审项的推理链和依据文档。

- `GET /api/review-items/:id/history`
  返回对应评审项的历史记录。

- `PATCH /api/review-items/:id`
  更新评审项的评分、意见和状态，并写入活动流与历史记录。

- `POST /api/chat`
  聊天接口，内部会先检索知识库，再调用 AI provider。

- `POST /api/llm/complete`
  通用 AI 补全接口，支持 `prompt`、`itemId`、`useCase` 和 `context`。

## 持久化说明

运行态数据会写入：

- `app/server/data/runtime-state.json`

这个文件用于保存：

- 评审项最新状态
- 活动流
- 单项评审历史

它已经加入 `.gitignore`，不会进入版本库。

如果你想重置到初始演示数据，可以删除这个文件后重新启动后端。

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

`http-template` 可读取环境变量：

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

`http-template` 可读取环境变量：

- `LLM_ENDPOINT`
- `LLM_API_KEY`
- `LLM_MODEL`

## 关键文件

- `app/src/App.tsx`
  前端应用入口和桌面/移动端布局切换。

- `app/src/hooks/useReviewApp.ts`
  前端全局状态与接口调用入口。

- `app/src/components/panels/ReviewWorkspace.tsx`
  评审工作区、筛选排序、历史与助手联动。

- `app/src/lib/api.ts`
  前端 API 封装。

- `app/src/lib/review.ts`
  评审状态、统计、筛选与排序逻辑。

- `app/server/index.mjs`
  后端入口。

- `app/server/state-store.mjs`
  本地运行态持久化逻辑。

- `app/server/data/knowledge-base.json`
  模拟知识库数据。

- `app/server/docs/integration-contracts.md`
  真实知识库和模型服务接入协议。

## 仓库地址

- GitHub: [https://github.com/edison-ai-519/kimi-agent-review-tool-site-design](https://github.com/edison-ai-519/kimi-agent-review-tool-site-design)
