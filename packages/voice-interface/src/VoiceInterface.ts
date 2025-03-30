import type {
  SpeechRecognitionConfig,
  SpeechRecognitionResult,
  SpeechSynthesisConfig,
  SpeechSynthesisResult,
  VoiceInterfaceOptions,
  WakeWordCallback,
  WakeWordConfig,
} from './types';
import { WhisperRecognizer } from './recognition/WhisperRecognizer';
import { ElevenLabsSynthesizer } from './synthesis/ElevenLabsSynthesizer';
import { PorcupineDetector } from './wakeword/PorcupineDetector';

export class VoiceInterface {
  private recognizer: WhisperRecognizer;
  private synthesizer: ElevenLabsSynthesizer;
  private wakeWordDetector: PorcupineDetector;
  private options: VoiceInterfaceOptions;

  constructor(options: VoiceInterfaceOptions = {}) {
    this.options = options;
    
    this.recognizer = new WhisperRecognizer(
      options.speechRecognition || {} as SpeechRecognitionConfig
    );
    
    this.synthesizer = new ElevenLabsSynthesizer(
      options.speechSynthesis || {} as SpeechSynthesisConfig
    );
    
    this.wakeWordDetector = new PorcupineDetector(
      options.wakeWord || {} as WakeWordConfig
    );
  }

  public async recognize(audioData: Buffer): Promise<SpeechRecognitionResult> {
    return this.recognizer.recognize(audioData);
  }

  public async recognizeFromFile(filePath: string): Promise<SpeechRecognitionResult> {
    return this.recognizer.recognizeFromFile(filePath);
  }

  public async recognizeFromMicrophone(durationMs: number): Promise<SpeechRecognitionResult> {
    return this.recognizer.recognizeFromMicrophone(durationMs);
  }

  public async synthesize(text: string): Promise<SpeechSynthesisResult> {
    return this.synthesizer.synthesize(text);
  }

  public async synthesizeToFile(text: string, outputPath: string): Promise<string> {
    return this.synthesizer.synthesizeToFile(text, outputPath);
  }

  public async speak(text: string): Promise<void> {
    await this.synthesizer.play(text);
  }

  public async startWakeWordDetection(callback: WakeWordCallback): Promise<void> {
    return this.wakeWordDetector.start(callback);
  }

  public async stopWakeWordDetection(): Promise<void> {
    return this.wakeWordDetector.stop();
  }

  public isWakeWordDetectionActive(): boolean {
    return this.wakeWordDetector.isRunning();
  }

  public async conversation(
    promptText: string,
    responseSpeech = true
  ): Promise<{ text: string; audioPath?: string }> {
    // Speak the prompt
    if (responseSpeech) {
      await this.speak(promptText);
    }
    
    // Start recording the user's response
    console.log('Listening for response...');
    const recognitionResult = await this.recognizeFromMicrophone(5000); // 5 seconds
    
    return {
      text: recognitionResult.text,
    };
  }
}
