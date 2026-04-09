# Kimi Agent Review Tool Site Design

一个面向科研项目评审场景的 Web 演示项目，当前已经从“纯前端界面原型”升级为“前端 + 最小后端联调版”。

项目保留了评审工作台、本体导航、推理依据、聊天助手、移动端视图等交互界面，同时补充了：

- 最小后端 API
- 假知识库 JSON 数据
- 统一 AI 接口层
- 可替换的知识库 provider
- 可替换的 LLM provider

当前版本适合用于：

- 前后端联调
- 演示评审流程
- 后续接入真实知识库和真实模型前的接口预演

## Current Status

当前项目不是最终生产系统，现状如下：

- 前端页面已经接到真实后端接口，不再只是本地 `setTimeout` mock
- 知识库目前使用本地假 JSON 文档，不是正式知识库
- AI 能力目前走统一接口，但默认使用 mock provider，不调用真实模型
- 评审项保存和提交目前写在服务进程内存中，重启服务后会恢复到初始种子数据
- 没有接入 RAG、向量库、数据库或正式鉴权系统

## Implemented Features

当前已经具备这些功能：

- 登录页与桌面端 / 移动端评审工作台
- 评审项列表加载、展开、评分、填写意见、暂存、提交
- 本体树、本体路径高亮、上下文向量、激活概念展示
- 推理依据面板加载指定评审项的推理链
- 推理面板中的文档依据，支持由知识库检索结果生成
- 聊天助手统一走 AI 接口，并附带知识库检索结果
- “生成辅助意见”统一走 AI 接口，并附带当前评审项上下文与知识库材料
- 知识库 provider 与 LLM provider 的运行时切换

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Node.js built-in HTTP server
- Data: local JSON seed files
- Integration pattern: pluggable provider architecture

## Project Structure

```text
.
|-- README.md
|-- .gitignore
`-- app/
    |-- server/
    |   |-- data/
    |   |   |-- app-state.json
    |   |   |-- knowledge-base.json
    |   |   `-- reasoning-map.json
    |   |-- docs/
    |   |   `-- integration-contracts.md
    |   |-- services/
    |   |   |-- knowledge-base/
    |   |   |   |-- index.mjs
    |   |   |   `-- providers/
    |   |   `-- llm/
    |   |       |-- index.mjs
    |   |       `-- providers/
    |   |-- dev.mjs
    |   `-- index.mjs
    |-- src/
    |   |-- components/
    |   |-- hooks/
    |   |-- lib/
    |   `-- types/
    |-- package.json
    `-- vite.config.ts
```

## Run Locally

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Start frontend + backend together

```bash
npm run dev
```

默认会启动：

- Frontend: `http://127.0.0.1:5173/`
- Backend: `http://127.0.0.1:8787/`

### 3. Build

```bash
npm run build
```

### 4. Preview frontend build

```bash
npm run preview
```

### 5. Start backend only

```bash
npm run start:server
```

## Available Scripts

在 `app/` 目录下可用：

- `npm run dev`: 同时启动前端和后端
- `npm run dev:client`: 仅启动 Vite 前端
- `npm run dev:server`: 仅启动后端开发服务
- `npm run start:server`: 启动后端服务
- `npm run build`: TypeScript 检查并构建前端产物
- `npm run lint`: 运行 ESLint
- `npm run preview`: 预览前端构建产物

## API Overview

当前后端提供以下接口：

- `GET /health`
  用于健康检查，同时返回当前启用的知识库 provider 和 LLM provider

- `POST /api/auth/login`
  模拟登录接口

- `GET /api/app-state`
  返回项目、评审项、本体、动态、聊天配置、知识库基础信息

- `GET /api/knowledge-base`
  返回当前知识库元数据和文档列表

- `POST /api/knowledge-base/search`
  按 `query`、`itemId`、本体路径等上下文搜索知识库

- `GET /api/review-items/:id/reasoning`
  返回评审项的推理链和依据文档

- `PATCH /api/review-items/:id`
  暂存或提交评审项

- `POST /api/chat`
  聊天接口，内部会先走知识库检索，再走 AI 接口

- `POST /api/llm/complete`
  通用 AI 接口，支持 `prompt`、`itemId`、`useCase`、`context`

## Knowledge Base and AI Architecture

项目已经拆出了两层可替换集成：

### 1. Knowledge Base Provider

当前内置两个 provider：

- `mock-json`
  默认 provider，从本地假 JSON 文档读取并做简单检索

- `http-template`
  真实知识库接入模板 provider，后续可以通过外部 HTTP 服务接入正式知识库

运行时切换：

```bash
KNOWLEDGE_BASE_PROVIDER=mock-json
KNOWLEDGE_BASE_PROVIDER=http-template
```

`http-template` 可读取这些环境变量：

- `KNOWLEDGE_BASE_ENDPOINT`
- `KNOWLEDGE_BASE_API_KEY`
- `KNOWLEDGE_BASE_NAMESPACE`

### 2. LLM Provider

当前内置两个 provider：

- `mock`
  默认 provider，返回模拟模型结果

- `http-template`
  真实模型服务接入模板 provider，后续可以通过外部 HTTP 服务接入正式模型

运行时切换：

```bash
LLM_PROVIDER=mock
LLM_PROVIDER=http-template
```

`http-template` 可读取这些环境变量：

- `LLM_ENDPOINT`
- `LLM_API_KEY`
- `LLM_MODEL`

## Fake Knowledge Base

当前知识库文件位于：

- `app/server/data/knowledge-base.json`

它只是联调用的假文档，方便现在先完成：

- 评审过程中的知识库辅助判断
- 推理依据面板的文档展示
- 聊天和辅助意见中的知识库上下文拼装

后续如果你要接真实知识库，有两种方式：

1. 保持现有业务层不变，直接让外部服务适配 `http-template` provider 的 JSON 协议
2. 新增一个 provider 文件并在注册器中挂载

## Integration Contract

真实知识库服务和真实模型服务的接入协议说明已经单独写在：

- `app/server/docs/integration-contracts.md`

这个文档定义了：

- 知识库 provider 请求格式
- 知识库 provider 响应格式
- LLM provider 请求格式
- LLM provider 响应格式

如果你后面接正式服务，优先按照这个协议来对接即可。

## Key Files

比较关键的文件如下：

- `app/src/App.tsx`
  前端应用入口

- `app/src/hooks/useReviewApp.ts`
  前端全局数据流和接口调用入口

- `app/src/lib/api.ts`
  前端 API 封装

- `app/server/index.mjs`
  后端入口

- `app/server/services/knowledge-base/index.mjs`
  知识库 provider 注册器

- `app/server/services/llm/index.mjs`
  LLM provider 注册器

- `app/server/data/knowledge-base.json`
  假知识库数据

- `app/server/docs/integration-contracts.md`
  真实服务接入协议

## Current Limitations

当前版本仍有这些限制：

- 没有接数据库，评审写回是内存态
- 没有接真实知识库
- 没有接真实 LLM
- 没有做 RAG 或向量检索
- 没有正式用户体系和权限控制
- 部分返回内容仍为演示数据，不代表真实评审逻辑

## Repository

- GitHub: [https://github.com/edison-ai-519/kimi-agent-review-tool-site-design](https://github.com/edison-ai-519/kimi-agent-review-tool-site-design)
