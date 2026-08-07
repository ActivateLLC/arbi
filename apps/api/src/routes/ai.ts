import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { OpenAIAgent, AgentOrchestrator } from '@arbi/ai-engine';

import { ApiError } from '../middleware/errorHandler';
import { generateText, geminiKey, anthropicKey } from '../services/ai/textProvider';

const router = Router();

/**
 * POST /api/ai/assistant — "Talk to ARBI" co-pilot.
 * Runs the LLM SERVER-SIDE (Gemini, with Anthropic fallback) so no API key ever
 * ships in the client bundle. Body: { query: string, context: <live snapshot> }.
 */

/**
 * POST /api/ai/speak — ARBI's voice (Gemini TTS, "Schedar" voice), server-side.
 * Body: { text }. Returns { audio: base64 WAV, mime } for the client to play.
 */
function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bits = 16): Buffer {
  const blockAlign = (channels * bits) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

router.post('/speak', async (req: Request, res: Response) => {
  const key = geminiKey();
  const text = String(req.body?.text || '').slice(0, 1200);
  const voice = String(req.body?.voice || 'Schedar');
  if (!key) return res.status(503).json({ error: 'tts_not_configured' });
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
      {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      },
      { timeout: 30000, headers: { 'x-goog-api-key': key } }
    );
    const part = (r.data?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData);
    const b64 = part?.inlineData?.data;
    if (!b64) return res.status(502).json({ error: 'no_audio' });
    const wav = pcmToWav(Buffer.from(b64, 'base64'));
    res.json({ audio: wav.toString('base64'), mime: 'audio/wav' });
  } catch (e: any) {
    console.error('TTS error:', e?.response?.data?.error?.message || e?.message || e);
    res.status(502).json({ error: 'tts_failed' });
  }
});

router.post('/assistant', async (req: Request, res: Response) => {
  const { query, context } = req.body || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ reply: 'Ask me something about your business.' });
  }
  if (!geminiKey() && !anthropicKey()) {
    return res.json({ reply: 'ARBI AI is not configured yet — set GEMINI_API_KEY (or ANTHROPIC_API_KEY) on the API to enable me.' });
  }

  const contextSnapshot = JSON.stringify(context != null ? context : {});
  const systemPrompt = `You are ARBI, the operator's AI co-pilot for an autonomous arbitrage/dropshipping business.
Use ONLY the live snapshot below (pulled from the database) as the source of truth for revenue, what's
selling, the catalog, ad campaigns, opportunities, automation state, and integrations.

Live snapshot (JSON): ${contextSnapshot}

Rules:
- Be concise, specific, data-driven; cite real numbers from the snapshot.
- "totalProfit" is profit/margin, not gross sales.
- "What's selling": use whatsSelling (recent orders). If empty, say there are no sales yet and what would drive them (ads live + budget).
- Be honest about zeros/empties — never invent sales, revenue, or metrics.
- If automation.autonomous is false or no campaigns are LIVE, note ads aren't running and that's why revenue isn't growing.`;

  const reply = await generateText({ system: systemPrompt, user: query, temperature: 0.4, maxTokens: 600 });
  res.json({ reply: reply || 'ARBI is temporarily unavailable — please try again in a moment.' });
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
