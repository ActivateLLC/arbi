import * as porcupine from '@picovoice/porcupine-node';
import recorder from 'node-record-lpcm16';

import type { WakeWordCallback, WakeWordConfig, WakeWordDetector } from '../types';

export class PorcupineDetector implements WakeWordDetector {
  private config: WakeWordConfig;
  private detector: porcupine.Porcupine | null = null;
  private recording: any | null = null;
  private isActive = false;
  private defaultKeywords = ['porcupine', 'bumblebee', 'grasshopper', 'hey siri', 'alexa', 'computer', 'hey google'];

  constructor(config: WakeWordConfig) {
    this.config = {
      keyword: 'porcupine',
      sensitivity: 0.7,
      ...config,
    };
  }

  public async start(callback: WakeWordCallback): Promise<void> {
    if (this.isActive) {
      console.warn('Wake word detector is already running');
      return;
    }

    try {
      // Initialize the wake word detector
      if (this.config.keyword && !this.defaultKeywords.includes(this.config.keyword.toLowerCase())) {
        // Custom keyword requires a model path
        if (!this.config.modelPath) {
          throw new Error('Model path is required for custom wake words');
        }

        this.detector = new porcupine.Porcupine(
          this.config.accessKey || process.env.PORCUPINE_ACCESS_KEY || '',
          [this.config.modelPath],
          [this.config.sensitivity || 0.7]
        );
      } else {
        // Use a built-in keyword
        const keywordIndex = this.defaultKeywords.indexOf(
          (this.config.keyword || 'porcupine').toLowerCase()
        );
        
        if (keywordIndex === -1) {
          throw new Error(`Unsupported built-in keyword: ${this.config.keyword}`);
        }

        const builtInKeyword = this.defaultKeywords[keywordIndex] as porcupine.BuiltInKeyword;
        
        this.detector = new porcupine.Porcupine(
          this.config.accessKey || process.env.PORCUPINE_ACCESS_KEY || '',
          [builtInKeyword],
          [this.config.sensitivity || 0.7]
        );
      }

      // Start recording audio
      this.recording = recorder.record({
        sampleRate: this.detector.sampleRate,
        channels: 1,
        audioType: 'raw',
        threshold: 0,
        recorder: 'sox',
        device: this.config.audioDeviceIndex,
      });

      this.isActive = true;
      console.log('Wake word detection started');

      // Process audio frames
      this.recording.stream()
        .on('data', (data: Buffer) => {
          if (!this.detector || !this.isActive) return;

          const frames = Math.floor(data.length / 2);
          const pcm16 = new Int16Array(frames);
          
          for (let i = 0; i < frames; i++) {
            pcm16[i] = data.readInt16LE(i * 2);
          }

          // Process the audio frame
          const keywordIndex = this.detector.process(pcm16);
          
          if (keywordIndex !== -1) {
            const detectedKeyword = this.config.keyword || this.defaultKeywords[keywordIndex];
            console.log(`Wake word detected: ${detectedKeyword}`);
            callback(detectedKeyword);
          }
        })
        .on('error', (err: Error) => {
          console.error('Error in wake word detection:', err);
        });
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      await this.stop();
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }

    if (this.detector) {
      this.detector.release();
      this.detector = null;
    }

    this.isActive = false;
    console.log('Wake word detection stopped');
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}
