import { Router, Request, Response, NextFunction } from 'express';
import { OpenAIAgent, AgentOrchestrator } from '@arbi/ai-engine';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize OpenAI configuration
const defaultAgentConfig = {
  name: 'default',
  description: 'Default AI agent',
  model: process.env.OPENAI_MODEL || 'gpt-4o',
};

// GET /api/ai/health
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'AI Engine is operational',
  });
});

// POST /api/ai/completion
router.post('/completion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, model, temperature, maxTokens } = req.body;

    if (!input) {
      throw new ApiError('Input is required', 400);
    }

    // Create an OpenAI agent
    const agent = new OpenAIAgent({
      ...defaultAgentConfig,
      model: model || defaultAgentConfig.model,
      temperature,
      maxTokens,
    });

    // Process the input
    const result = await agent.run(input);

    res.status(200).json({
      result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/orchestrate
router.post('/orchestrate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, config } = req.body;

    if (!input) {
      throw new ApiError('Input is required', 400);
    }

    // Create agents based on the provided configuration or use defaults
    const orchestrationConfig = config || {
      agents: [defaultAgentConfig],
      handoffs: [],
      guardrails: [],
      defaultAgent: defaultAgentConfig.name,
    };

    // Create agent instances
    const agents = orchestrationConfig.agents.map(agentConfig => new OpenAIAgent(agentConfig));

    // Create orchestrator
    const orchestrator = new AgentOrchestrator(orchestrationConfig, agents);

    // Process the input
    const result = await orchestrator.process(input);

    res.status(200).json({
      result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
