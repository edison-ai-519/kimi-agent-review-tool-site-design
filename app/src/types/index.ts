// User roles
export type UserRole = 'expert' | 'applicant' | 'admin';

// Review stages
export type ReviewStage = 'proposal' | 'midterm' | 'final';

// Review item status
export type ReviewStatus = 'pending' | 'reviewed' | 'disputed';

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
  reasoning?: ReasoningChain;
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
