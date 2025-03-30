import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import recorder from 'node-record-lpcm16';

import type { SpeechRecognitionConfig, SpeechRecognitionResult, SpeechRecognizer } from '../types';

export class WhisperRecognizer implements SpeechRecognizer {
  private client: OpenAI;
  private config: SpeechRecognitionConfig;

  constructor(config: SpeechRecognitionConfig) {
    this.config = {
      model: 'whisper-1',
      language: 'en',
      timeout: 60000,
      sampleRate: 16000,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  public async recognize(audioData: Buffer | Uint8Array): Promise<SpeechRecognitionResult> {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: new File([audioData], 'audio.wav', { type: 'audio/wav' }),
        model: this.config.model || 'whisper-1',
        language: this.config.language,
      });

      return {
        text: response.text,
      };
    } catch (error) {
      console.error('Error in speech recognition:', error);
      throw error;
    }
  }

  public async recognizeFromFile(filePath: string): Promise<SpeechRecognitionResult> {
    try {
      const fileBuffer = await readFile(filePath);
      
      return this.recognize(fileBuffer);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  public async recognizeFromMicrophone(durationMs: number): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      const recording = recorder.record({
        sampleRate: this.config.sampleRate,
        channels: 1,
        audioType: 'wav',
      });

      console.log('Recording started...');
      
      // Stop recording after specified duration
      setTimeout(() => {
        recording.stop();
        console.log('Recording stopped');
        
        const audioBuffer = Buffer.concat(chunks);
        this.recognize(audioBuffer)
          .then(resolve)
          .catch(reject);
      }, durationMs);

      // Listen for data from the microphone
      recording.stream()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on('error', (err: Error) => {
          console.error('Error recording:', err);
          recording.stop();
          reject(err);
        });
    });
  }
}
