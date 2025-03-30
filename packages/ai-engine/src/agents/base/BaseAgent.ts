import OpenAI from 'openai';

import type {
  AgentConfig,
  AgentMessage,
  AgentResponse,
  AgentState,
  ToolCall,
} from '../../types';

export abstract class BaseAgent {
  protected client: OpenAI;
  protected config: AgentConfig;
  protected state: AgentState;

  constructor(config: AgentConfig, client?: OpenAI) {
    this.config = config;
    this.client = client || new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.state = {
      messages: [],
    };
  }

  public abstract run(input: string): Promise<AgentResponse>;

  public abstract handleToolCall(toolCall: ToolCall): Promise<string>;

  protected addMessage(message: AgentMessage): void {
    this.state.messages.push(message);
  }

  public getMessages(): AgentMessage[] {
    return [...this.state.messages];
  }

  public getState(): AgentState {
    return { ...this.state };
  }

  public setState(state: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...state,
    };
  }

  public getName(): string {
    return this.config.name;
  }

  public getDescription(): string {
    return this.config.description;
  }

  public reset(): void {
    this.state = {
      messages: [],
    };
  }
}
