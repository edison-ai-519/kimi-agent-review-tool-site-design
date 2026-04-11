// User roles
export type UserRole = 'expert' | 'applicant' | 'admin';

// Review stages
export type ReviewStage = 'proposal' | 'midterm' | 'final';
export type ReviewStageStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';

// Review item status
export type ReviewStatus = 'draft' | 'pending' | 'in_review' | 'needs_revision' | 'reviewed' | 'disputed';

// Ontology node
export interface OntologyNode {
  id: string;
  name: string;
  description?: string;
  weight: number;
  children?: OntologyNode[];
  isActive?: boolean;
  isHighlighted?: boolean;
}

// Context vector
export interface ContextVector {
  name: string;
  value: number;
  color: string;
}

export interface RecentConcept {
  id: string;
  name: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// Review item
export interface ReviewItem {
  id: string;
  title: string;
  description: string;
  status: ReviewStatus;
  confidence: number;
  score?: number;
  maxScore: number;
  comment?: string;
  updatedAt?: string;
  reasoning?: ReasoningChain;
  ontologyValidation?: ReviewItemOntologyValidation;
  llmParticipation?: ReviewItemLlmParticipation;
}

// Reasoning chain
export interface ReasoningChain {
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
  conclusion: string;
  documents: DocumentFragment[];
}

// Reasoning node
export interface ReasoningNode {
  id: string;
  label: string;
  type: 'input' | 'ontology' | 'rule' | 'conclusion';
  confidence: number;
}

// Reasoning edge
export interface ReasoningEdge {
  from: string;
  to: string;
  label?: string;
  strength: number;
}

// Document fragment
export interface DocumentFragment {
  id: string;
  source: string;
  content: string;
  highlights: string[];
  relevance: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  relatedDocuments?: KnowledgeDocument[];
}

// Project info
export interface ProjectInfo {
  id: string;
  name: string;
  applicant: string;
  budget: string;
  duration: string;
  field: string;
  stage: ReviewStage;
}

// System status
export interface SystemStatus {
  version: string;
  lastUpdate: Date;
  ontologyVersion: string;
  confidence: number;
  isOnline: boolean;
}

export interface ReviewActivity {
  id: string;
  action: string;
  target: string;
  type: 'success' | 'warning' | 'info';
  createdAt: string;
}

export interface ReviewStats {
  total: number;
  completed: number;
  pending: number;
  disputed: number;
  avgConfidence: number;
}

export interface DesktopUiPreferences {
  showFloatingChat: boolean;
  showBottomStatusBar: boolean;
}

export interface ReviewHistoryEntry {
  id: string;
  itemId: string;
  action: string;
  actorName: string;
  summary: string;
  createdAt: string;
  fromStatus?: ReviewStatus;
  toStatus?: ReviewStatus;
  score?: number;
  commentPreview?: string;
}

export interface OntologyData {
  tree: OntologyNode;
  contextVectors: ContextVector[];
  recentConcepts: RecentConcept[];
}

export interface ReasoningData {
  itemId: string;
  chain: ReasoningChain;
  ontologyPathIds: string[];
  ontologyPathLabels: string[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  documents: KnowledgeDocument[];
}

export type OntologyValidationStatus = 'pass' | 'warn' | 'fail';

export interface OntologyValidationEvidenceCheck {
  id: string;
  label: string;
  matched: boolean;
  matchedIn: 'comment' | 'knowledge' | 'both' | 'none';
  matchedTerms: string[];
}

export interface OntologyValidationFinding {
  id: string;
  severity: OntologyValidationStatus;
  severityLabel: string;
  title: string;
  message: string;
  suggestion?: string;
}

export interface ReviewItemOntologyValidation {
  status: OntologyValidationStatus;
  summary: string;
  ontologyVersion: string;
  ontologyPathLabels: string[];
  matchedConcepts: string[];
  matchedDocumentCategories: string[];
  missingDocumentCategories: string[];
  evidenceChecks: OntologyValidationEvidenceCheck[];
  findings: OntologyValidationFinding[];
  knowledgeDocumentIds: string[];
}

export interface ReviewItemLlmParticipation {
  provider: string;
  model: string;
  useCase: string;
  createdAt: string;
  summary: string;
  relatedDocuments: KnowledgeDocument[];
}

export interface KnowledgeSearchResult {
  query: string;
  source: string;
  total: number;
  documents: KnowledgeDocument[];
}

export interface LlmCompletionResult {
  provider: string;
  model: string;
  useCase: string;
  text: string;
  createdAt: string;
  relatedDocuments?: KnowledgeDocument[];
}

export interface ChatConfig {
  welcomeMessage: string;
  quickActions: string[];
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface AppStatePayload {
  project: ProjectInfo;
  systemStatus: Omit<SystemStatus, 'lastUpdate'> & { lastUpdate: string };
  reviewItems: ReviewItem[];
  ontology: OntologyData;
  activityFeed: ReviewActivity[];
  knowledgeBase: KnowledgeBase;
  chatConfig: ChatConfig;
}

export interface ReviewHistoryPayload {
  itemId: string;
  entries: ReviewHistoryEntry[];
}

export interface ReviewStageOverview {
  stage: ReviewStage;
  label: string;
  status: ReviewStageStatus;
  total: number;
  completed: number;
  pending: number;
  disputed: number;
  needsRevision: number;
  completionPercent: number;
  canEnter: boolean;
  blockedReason?: string;
  recommendation: string;
}

export interface ReviewStageOverviewPayload {
  currentStage: ReviewStage;
  stages: ReviewStageOverview[];
}
