import { BaseAgent } from './base/BaseAgent';

import type {
  AgentConfig,
  AgentResponse,
  ToolCall,
} from '../types';
import type OpenAI from 'openai';

export class OpenAIAgent extends BaseAgent {
  constructor(config: AgentConfig, client?: OpenAI) {
    super(config, client);
  }

  public async run(input: string): Promise<AgentResponse> {
    // Add user message
    this.addMessage({
      role: 'user',
      content: input,
    });

    // Prepare the API request
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: this.state.messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      tools: this.config.tools,
    });

    const responseMessage = response.choices[0].message;
    
    // Add assistant response to conversation history
    this.addMessage({
      role: 'assistant',
      content: responseMessage.content || '',
      toolCalls: responseMessage.tool_calls as unknown as ToolCall[],
    });

    // Process tool calls if any
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const toolResponse = await this.handleToolCall(toolCall as unknown as ToolCall);
        
        this.addMessage({
          role: 'tool',
          content: toolResponse,
          toolCallId: toolCall.id,
        });
      }

      // Get a follow-up response after tool call
      return this.run('');
    }

    return {
      content: responseMessage.content || '',
      toolCalls: responseMessage.tool_calls as unknown as ToolCall[],
      finishReason: response.choices[0].finish_reason as 'stop' | 'length' | 'tool_calls' | 'content_filter',
    };
  }

  public async handleToolCall(toolCall: ToolCall): Promise<string> {
    // This should be implemented by specialized agent classes
    // or by the orchestration layer
    throw new Error(`Tool call handler not implemented for ${toolCall.function.name}`);
  }
}
