import type { BaseAgent } from '../agents/base/BaseAgent';
import type {
  GuardrailConfig,
  HandoffConfig,
  OrchestrationConfig,
  OrchestrationResult,
  TraceEvent,
} from '../types';
import { GuardrailManager } from '../guardrails/GuardrailManager';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;
  private config: OrchestrationConfig;
  private guardrailManager: GuardrailManager;
  private trace: TraceEvent[];
  private completedHandoffs: HandoffConfig[];
  private triggeredGuardrails: GuardrailConfig[];

  constructor(config: OrchestrationConfig, agents: BaseAgent[]) {
    this.config = config;
    this.agents = new Map();
    this.guardrailManager = new GuardrailManager(config.guardrails);
    this.trace = [];
    this.completedHandoffs = [];
    this.triggeredGuardrails = [];

    // Register agents
    for (const agent of agents) {
      this.agents.set(agent.getName(), agent);
    }
  }

  public async process(input: string): Promise<OrchestrationResult> {
    // Reset state
    this.trace = [];
    this.completedHandoffs = [];
    this.triggeredGuardrails = [];

    // Apply input guardrails
    const { passed, guardrail } = this.guardrailManager.validateInput(input);
    
    if (!passed) {
      if (guardrail) {
        this.triggeredGuardrails.push(guardrail);
        this.addTraceEvent('guardrail_triggered', {
          guardrail: guardrail.name,
          input,
        });
      }
      
      return {
        finalResponse: {
          content: 'Input rejected by guardrails',
          finishReason: 'content_filter',
        },
        trace: this.trace,
        completedHandoffs: this.completedHandoffs,
        triggeredGuardrails: this.triggeredGuardrails,
      };
    }

    // Start with default agent
    const defaultAgent = this.agents.get(this.config.defaultAgent);
    if (!defaultAgent) {
      throw new Error(`Default agent ${this.config.defaultAgent} not found`);
    }

    // Process with the default agent
    return this.processWithAgent(defaultAgent, input);
  }

  private async processWithAgent(agent: BaseAgent, input: string): Promise<OrchestrationResult> {
    this.addTraceEvent('agent_called', {
      agentName: agent.getName(),
      input,
    });

    // Run the agent
    const response = await agent.run(input);

    // Apply output guardrails
    const { passed, guardrail } = this.guardrailManager.validateOutput(response.content);
    
    if (!passed) {
      if (guardrail) {
        this.triggeredGuardrails.push(guardrail);
        this.addTraceEvent('guardrail_triggered', {
          guardrail: guardrail.name,
          output: response.content,
        });
      }
      
      return {
        finalResponse: {
          content: 'Output rejected by guardrails',
          finishReason: 'content_filter',
        },
        trace: this.trace,
        completedHandoffs: this.completedHandoffs,
        triggeredGuardrails: this.triggeredGuardrails,
      };
    }

    // Check for handoffs
    const handoff = this.checkForHandoff(agent.getName(), response.content);
    if (handoff) {
      return this.handleHandoff(handoff, agent, response.content);
    }

    // Return final result
    return {
      finalResponse: response,
      trace: this.trace,
      completedHandoffs: this.completedHandoffs,
      triggeredGuardrails: this.triggeredGuardrails,
    };
  }

  private checkForHandoff(agentName: string, content: string): HandoffConfig | null {
    for (const handoff of this.config.handoffs) {
      if (
        handoff.sourceAgent === agentName &&
        this.evaluateHandoffCondition(handoff.condition, content)
      ) {
        return handoff;
      }
    }
    return null;
  }

  private evaluateHandoffCondition(condition: string, content: string): boolean {
    // Simple implementation - in production, this would be more sophisticated
    return content.toLowerCase().includes(condition.toLowerCase());
  }

  private async handleHandoff(
    handoff: HandoffConfig,
    sourceAgent: BaseAgent,
    content: string
  ): Promise<OrchestrationResult> {
    const targetAgent = this.agents.get(handoff.targetAgent);
    if (!targetAgent) {
      throw new Error(`Target agent ${handoff.targetAgent} not found for handoff`);
    }

    this.addTraceEvent('handoff', {
      sourceAgent: handoff.sourceAgent,
      targetAgent: handoff.targetAgent,
      content,
    });

    this.completedHandoffs.push(handoff);

    // Transfer context if needed
    if (handoff.preserveContext) {
      targetAgent.setState({
        context: sourceAgent.getState().context,
      });
    }

    // Process with target agent
    return this.processWithAgent(targetAgent, content);
  }

  private addTraceEvent(type: TraceEvent['type'], data: Record<string, unknown>): void {
    this.trace.push({
      timestamp: new Date().toISOString(),
      type,
      agentName: data.agentName as string | undefined,
      data,
    });
  }
}
