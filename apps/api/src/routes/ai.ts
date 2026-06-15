import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { OpenAIAgent, AgentOrchestrator } from '@arbi/ai-engine';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/ai/assistant — "Talk to ARBI" co-pilot.
 * Runs Gemini SERVER-SIDE so the API key never ships in the client bundle.
 * Body: { query: string, context: <live business snapshot> }.
 */
const geminiKey = () =>
  (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.API_KEY || '').trim();

router.post('/assistant', async (req: Request, res: Response) => {
  const key = geminiKey();
  const { query, context } = req.body || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ reply: 'Ask me something about your business.' });
  }
  if (!key) {
    return res.json({ reply: 'ARBI AI is not configured yet — set GEMINI_API_KEY on the API to enable me.' });
  }

  const systemPrompt = `You are ARBI, the operator's AI co-pilot for an autonomous arbitrage/dropshipping business.
Use ONLY the live snapshot below (pulled from the database) as the source of truth for revenue, what's
selling, the catalog, ad campaigns, opportunities, automation state, and integrations.

Live snapshot (JSON): ${JSON.stringify(context ?? {})}

Rules:
- Be concise, specific, data-driven; cite real numbers from the snapshot.
- "totalProfit" is profit/margin, not gross sales.
- "What's selling": use whatsSelling (recent orders). If empty, say there are no sales yet and what would drive them (ads live + budget).
- Be honest about zeros/empties — never invent sales, revenue, or metrics.
- If automation.autonomous is false or no campaigns are LIVE, note ads aren't running and that's why revenue isn't growing.`;

  try {
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      },
      { timeout: 25000 }
    );
    const reply = r.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    res.json({ reply: reply || 'I could not generate a response just now.' });
  } catch (e: any) {
    console.error('AI assistant error:', e?.response?.data?.error?.message || e?.message || e);
    res.json({ reply: 'ARBI is temporarily unavailable — please try again in a moment.' });
  }
});

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
