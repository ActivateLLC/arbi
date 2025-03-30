export interface BrowserConfig {
  headless?: boolean;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  cookies?: Record<string, string>[];
  timeout?: number;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export interface ElementSelector {
  type: 'css' | 'xpath' | 'text' | 'id';
  value: string;
}

export interface FormField {
  selector: ElementSelector;
  value: string;
  type?: 'text' | 'checkbox' | 'radio' | 'select' | 'file';
}

export interface ExtractedData {
  text?: string;
  html?: string;
  attributes?: Record<string, string>;
}

export interface ScreenshotOptions {
  path?: string;
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
}

export interface BrowserSession {
  id: string;
  startTime: Date;
  browser: unknown; // Browser instance
  page: unknown; // Page instance
}
