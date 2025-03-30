export interface SpeechRecognitionConfig {
  apiKey?: string;
  model?: string;
  language?: string;
  timeout?: number;
  sampleRate?: number;
}

export interface SpeechSynthesisConfig {
  apiKey?: string;
  voice?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface WakeWordConfig {
  accessKey?: string;
  keyword?: string;
  modelPath?: string;
  sensitivity?: number;
  audioDeviceIndex?: number;
}

export interface AudioInputConfig {
  sampleRate?: number;
  channels?: number;
  audioType?: string;
  deviceIndex?: number;
}

export interface WakeWordCallback {
  (keyword: string): void;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface SpeechSynthesisResult {
  audioBuffer: Uint8Array;
  duration?: number;
  format?: string;
}

export interface VoiceInterfaceOptions {
  speechRecognition?: SpeechRecognitionConfig;
  speechSynthesis?: SpeechSynthesisConfig;
  wakeWord?: WakeWordConfig;
  audioInput?: AudioInputConfig;
}

export interface WakeWordDetector {
  start: (callback: WakeWordCallback) => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
}

export interface SpeechRecognizer {
  recognize: (audioData: Buffer | Uint8Array) => Promise<SpeechRecognitionResult>;
  recognizeFromFile: (filePath: string) => Promise<SpeechRecognitionResult>;
  recognizeFromMicrophone: (durationMs: number) => Promise<SpeechRecognitionResult>;
}

export interface SpeechSynthesizer {
  synthesize: (text: string) => Promise<SpeechSynthesisResult>;
  synthesizeToFile: (text: string, outputPath: string) => Promise<string>;
  play: (text: string) => Promise<void>;
}
