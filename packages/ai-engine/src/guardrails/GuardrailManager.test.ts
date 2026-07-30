import { GuardrailManager } from './GuardrailManager';
import type { GuardrailConfig } from '../types';

describe('GuardrailManager', () => {
  let manager: GuardrailManager;
  const guardrails: GuardrailConfig[] = [
    {
      name: 'No Profanity',
      type: 'input',
      criteria: ['badword', 'curse'],
      action: 'block'
    },
    {
      name: 'No Secrets',
      type: 'output',
      criteria: ['secret_key', 'password'],
      action: 'block'
    },
    {
      name: 'Warning Only',
      type: 'input',
      criteria: ['risky'],
      action: 'warn'
    }
  ];

  beforeEach(() => {
    manager = new GuardrailManager(guardrails);
  });

  it('should block input containing forbidden words', () => {
    const result = manager.validateInput('This contains a badword');
    expect(result.passed).toBe(false);
    expect(result.guardrail?.name).toBe('No Profanity');
  });

  it('should allow clean input', () => {
    const result = manager.validateInput('This is clean text');
    expect(result.passed).toBe(true);
  });

  it('should block output containing secrets', () => {
    const result = manager.validateOutput('Here is the secret_key: 12345');
    expect(result.passed).toBe(false);
    expect(result.guardrail?.name).toBe('No Secrets');
  });

  it('should warn but pass for warning guardrails', () => {
    const result = manager.validateInput('This is risky behavior');
    expect(result.passed).toBe(true);
    expect(result.guardrail?.name).toBe('Warning Only');
  });
});
