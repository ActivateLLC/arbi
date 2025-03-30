// Type definitions for AI Engine

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AgentTool[];
}

export interface AgentTool {
  type: string;
  name: string;
  description: string;
  schema?: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface HandoffConfig {
  sourceAgent: string;
  targetAgent: string;
  condition: string;
  preserveContext: boolean;
}

export interface GuardrailConfig {
  name: string;
  type: 'input' | 'output';
  criteria: string[];
  action: 'block' | 'warn' | 'modify';
}

export interface OrchestrationConfig {
  agents: AgentConfig[];
  handoffs: HandoffConfig[];
  guardrails: GuardrailConfig[];
  defaultAgent: string;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface AgentState {
  messages: AgentMessage[];
  context?: Record<string, unknown>;
}

export interface TraceEvent {
  timestamp: string;
  type: 'agent_called' | 'handoff' | 'guardrail_triggered' | 'tool_called' | 'tool_response';
  agentName?: string;
  data: Record<string, unknown>;
}

export interface OrchestrationResult {
  finalResponse: AgentResponse;
  trace: TraceEvent[];
  completedHandoffs: HandoffConfig[];
  triggeredGuardrails: GuardrailConfig[];
}
