import type { GuardrailConfig } from '../types';

export class GuardrailManager {
  private guardrails: GuardrailConfig[];

  constructor(guardrails: GuardrailConfig[]) {
    this.guardrails = guardrails;
  }

  public validateInput(input: string): { passed: boolean; guardrail?: GuardrailConfig } {
    for (const guardrail of this.guardrails) {
      if (guardrail.type === 'input') {
        const violated = this.checkViolation(guardrail, input);
        if (violated) {
          return { passed: guardrail.action !== 'block', guardrail };
        }
      }
    }
    
    return { passed: true };
  }

  public validateOutput(output: string): { passed: boolean; guardrail?: GuardrailConfig } {
    for (const guardrail of this.guardrails) {
      if (guardrail.type === 'output') {
        const violated = this.checkViolation(guardrail, output);
        if (violated) {
          return { passed: guardrail.action !== 'block', guardrail };
        }
      }
    }
    
    return { passed: true };
  }

  private checkViolation(guardrail: GuardrailConfig, text: string): boolean {
    // Simple implementation - in production, this would be more sophisticated
    for (const criterion of guardrail.criteria) {
      if (text.toLowerCase().includes(criterion.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
}
