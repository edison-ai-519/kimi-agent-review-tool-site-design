import { createHttpTemplateKnowledgeBaseProvider } from './providers/http-template-provider.mjs';
import { createMockJsonKnowledgeBaseProvider } from './providers/mock-json-provider.mjs';

const providerFactories = {
  'mock-json': createMockJsonKnowledgeBaseProvider,
  'http-template': createHttpTemplateKnowledgeBaseProvider
};

export function createKnowledgeBaseClient(options) {
  const providerName = process.env.KNOWLEDGE_BASE_PROVIDER ?? 'mock-json';
  const factory = providerFactories[providerName];

  if (!factory) {
    throw new Error(`Unknown knowledge base provider: ${providerName}`);
  }

  return factory(options);
}

export function listKnowledgeBaseProviders() {
  return Object.keys(providerFactories);
}
