import { Router, Request, Response, NextFunction } from 'express';
import { VoiceInterface } from '@arbi/voice-interface';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize voice interface only if API keys are available
let voiceInterface: VoiceInterface | null = null;

const initVoiceInterface = () => {
  if (voiceInterface) return voiceInterface;

  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError('OPENAI_API_KEY environment variable is required for voice features', 503);
  }

  voiceInterface = new VoiceInterface({
    speechRecognition: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'whisper-1',
      language: 'en',
    },
    speechSynthesis: {
      apiKey: process.env.ELEVENLABS_API_KEY,
      voice: 'Sarah',
      model: 'eleven_multilingual_v2',
    },
  });

  return voiceInterface;
};

// GET /api/voice/health
router.get('/health', (req: Request, res: Response) => {
  const isConfigured = !!process.env.OPENAI_API_KEY && !!process.env.ELEVENLABS_API_KEY;
  res.status(200).json({
    status: isConfigured ? 'ok' : 'unconfigured',
    message: isConfigured
      ? 'Voice Interface is operational'
      : 'Voice Interface requires OPENAI_API_KEY and ELEVENLABS_API_KEY environment variables',
  });
});

// POST /api/voice/recognize
router.post('/recognize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.audio) {
      throw new ApiError('Audio data is required', 400);
    }

    // Convert base64 string to buffer
    const audioBuffer = Buffer.from(req.body.audio, 'base64');

    // Recognize speech
    const vi = initVoiceInterface();
    const result = await vi.recognize(audioBuffer);

    res.status(200).json({
      text: result.text,
      confidence: result.confidence,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/voice/synthesize
router.post('/synthesize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, voice, model } = req.body;

    if (!text) {
      throw new ApiError('Text is required', 400);
    }

    // Customize synthesis if needed
    const options = {
      voice,
      model,
    };

    // Synthesize speech
    const vi = initVoiceInterface();
    const result = await vi.synthesize(text);

    // Convert audio buffer to base64
    const base64Audio = Buffer.from(result.audioBuffer).toString('base64');

    res.status(200).json({
      audio: base64Audio,
      format: 'audio/mp3',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/voice/conversation
router.post('/conversation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, responseSpeech } = req.body;

    if (!prompt) {
      throw new ApiError('Prompt is required', 400);
    }

    // Start conversation
    const vi = initVoiceInterface();
    const result = await vi.conversation(prompt, responseSpeech);

    res.status(200).json({
      text: result.text,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
