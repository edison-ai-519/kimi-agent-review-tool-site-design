import { createHttpTemplateLlmProvider } from './providers/http-template-provider.mjs';
import { createMockLlmProvider } from './providers/mock-provider.mjs';

const providerFactories = {
  mock: createMockLlmProvider,
  'http-template': createHttpTemplateLlmProvider
};

export function createLlmClient() {
  const providerName = process.env.LLM_PROVIDER ?? 'mock';
  const factory = providerFactories[providerName];

  if (!factory) {
    throw new Error(`Unknown LLM provider: ${providerName}`);
  }

  return factory();
}

export function listLlmProviders() {
  return Object.keys(providerFactories);
}
