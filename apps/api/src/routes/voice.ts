import { Router, Request, Response, NextFunction } from 'express';
import { VoiceInterface } from '@arbi/voice-interface';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize voice interface
const voiceInterface = new VoiceInterface({
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

// GET /api/voice/health
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Voice Interface is operational',
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
    const result = await voiceInterface.recognize(audioBuffer);

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
    const result = await voiceInterface.synthesize(text);

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
    const result = await voiceInterface.conversation(prompt, responseSpeech);

    res.status(200).json({
      text: result.text,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
