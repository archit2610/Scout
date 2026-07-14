// === API Response Envelope ===
export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// === User ===
export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
}

// === Report ===
export type ReportStatus = 'pending' | 'running' | 'done' | 'error';

export interface Report {
  id: string;
  token: string;
  question: string;
  status: ReportStatus;
  reportMd?: string;
  createdAt: string;
}

// === Auth ===
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

// === SSE Event Payloads ===
export interface StageEvent {
  label: string;
}

export interface PlanEvent {
  subQuestions: string[];
}

export interface TokenEvent {
  data: string;
}

export interface DoneEvent {
  reportId: string;
}

export interface SSEErrorEvent {
  message: string;
}

// === Agent Log Step ===
export interface AgentStep {
  label: string;
  status: 'completed' | 'in-progress';
}
