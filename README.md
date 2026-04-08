# Kimi Agent Review Tool Site Design

A frontend prototype for a Kimi Agent review workflow interface, built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

This repository currently contains the web application under the `app/` directory. The UI includes:

- A login screen with animated visual effects
- A desktop review workspace with ontology, review, reasoning, and chat areas
- A mobile-adapted experience with bottom navigation, drawers, and modal panels
- Reusable UI components based on shadcn/ui and Radix UI

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide React

## Project Structure

```text
.
|-- README.md
|-- .gitignore
`-- app/
    |-- src/
    |   |-- components/
    |   |-- hooks/
    |   |-- lib/
    |   `-- types/
    |-- package.json
    `-- vite.config.ts
```

## Getting Started

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview the production build

```bash
npm run preview
```

## Available Scripts

From the `app/` directory:

- `npm run dev` starts the Vite dev server
- `npm run build` runs TypeScript build checks and creates a production bundle
- `npm run lint` runs ESLint
- `npm run preview` previews the production build locally

## Notes

- The application code lives in [`app/`](C:/Users/aidis/Desktop/Kimi_Agent_评审工具网站设计/app).
- Generated build output is ignored through [`.gitignore`](C:/Users/aidis/Desktop/Kimi_Agent_评审工具网站设计/.gitignore).
- Some mock content in the current prototype appears to use placeholder or incorrectly encoded text and may need cleanup before production use.

## Repository

- GitHub: [https://github.com/edison-ai-519/kimi-agent-review-tool-site-design](https://github.com/edison-ai-519/kimi-agent-review-tool-site-design)
