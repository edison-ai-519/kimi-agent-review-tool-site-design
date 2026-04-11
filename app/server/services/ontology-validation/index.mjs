import { createHttpTemplateOntologyValidationProvider } from './providers/http-template-provider.mjs';
import { createMockJsonOntologyValidationProvider } from './providers/mock-json-provider.mjs';

const providerFactories = {
  'mock-json': createMockJsonOntologyValidationProvider,
  'http-template': createHttpTemplateOntologyValidationProvider
};

export function createOntologyValidationClient(options) {
  const providerName = process.env.ONTOLOGY_VALIDATION_PROVIDER ?? 'mock-json';
  const factory = providerFactories[providerName];

  if (!factory) {
    throw new Error(`Unknown ontology validation provider: ${providerName}`);
  }

  return factory(options);
}

export function listOntologyValidationProviders() {
  return Object.keys(providerFactories);
}
