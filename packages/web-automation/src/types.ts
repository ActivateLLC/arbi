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

/**
 * Signup automation types
 */
export interface SignupCredentials {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, string>;
}

export interface SignupConfig {
  url: string;
  formSelectors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    submit?: string;
    customFields?: Record<string, string>;
  };
  waitForConfirmation?: {
    selector?: string;
    urlPattern?: string;
    timeout?: number;
  };
}

export interface SignupResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
  extractedData?: Record<string, string>;
  requiresEmailVerification?: boolean;
}

/**
 * Email verification types
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailCheckOptions {
  from?: string;
  subject?: string;
  maxWaitTime?: number;
  pollInterval?: number;
}

export interface VerificationLink {
  url: string;
  email: string;
  foundAt: Date;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  verificationLink?: string;
  redirectUrl?: string;
}

/**
 * API key extraction types
 */
export interface ApiKeyExtractionConfig {
  pageUrl: string;
  selectors: string[];
  patterns?: RegExp[];
  waitForSelector?: string;
}

export interface ExtractedApiKey {
  key: string;
  label?: string;
  type?: 'api_key' | 'client_id' | 'client_secret' | 'token';
}
