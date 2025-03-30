import { writeFile } from 'fs/promises';
import { ElevenLabsClient, play } from 'elevenlabs';

import type { SpeechSynthesisConfig, SpeechSynthesisResult, SpeechSynthesizer } from '../types';

export class ElevenLabsSynthesizer implements SpeechSynthesizer {
  private client: ElevenLabsClient;
  private config: SpeechSynthesisConfig;

  constructor(config: SpeechSynthesisConfig) {
    this.config = {
      voice: 'Sarah',
      model: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      ...config,
    };

    this.client = new ElevenLabsClient({
      apiKey: this.config.apiKey || process.env.ELEVENLABS_API_KEY,
    });
  }

  public async synthesize(text: string): Promise<SpeechSynthesisResult> {
    try {
      const audioBuffer = await this.client.generate({
        voice: this.config.voice || 'Sarah',
        text,
        model_id: this.config.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: this.config.stability || 0.5,
          similarity_boost: this.config.similarityBoost || 0.75,
        },
      });

      return {
        audioBuffer: new Uint8Array(audioBuffer),
      };
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      throw error;
    }
  }

  public async synthesizeToFile(text: string, outputPath: string): Promise<string> {
    try {
      const result = await this.synthesize(text);
      await writeFile(outputPath, result.audioBuffer);
      return outputPath;
    } catch (error) {
      console.error(`Error writing audio to file ${outputPath}:`, error);
      throw error;
    }
  }

  public async play(text: string): Promise<void> {
    try {
      const audioBuffer = await this.client.generate({
        voice: this.config.voice || 'Sarah',
        text,
        model_id: this.config.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: this.config.stability || 0.5,
          similarity_boost: this.config.similarityBoost || 0.75,
        },
      });

      await play(audioBuffer);
    } catch (error) {
      console.error('Error playing synthesized speech:', error);
      throw error;
    }
  }
}
