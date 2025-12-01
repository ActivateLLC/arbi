import { randomBytes } from 'crypto';

import { chromium } from 'playwright';

import type { BrowserConfig, BrowserSession } from '../types';

export class BrowserManager {
  private sessions: Map<string, BrowserSession>;
  private defaultConfig: BrowserConfig;

  constructor(defaultConfig: BrowserConfig = {}) {
    this.sessions = new Map();
    this.defaultConfig = defaultConfig;
  }

  public async createSession(config: BrowserConfig = {}): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    const browser = await chromium.launch({
      headless: mergedConfig.headless ?? true,
    });

    const page = await browser.newPage();
    
    if (mergedConfig.userAgent) {
      await page.setUserAgent(mergedConfig.userAgent);
    }
    
    if (mergedConfig.viewport) {
      await page.setViewport(mergedConfig.viewport);
    }
    
    if (mergedConfig.cookies && mergedConfig.cookies.length > 0) {
      await page.context().addCookies(mergedConfig.cookies);
    }

    const sessionId = randomBytes(16).toString('hex');
    this.sessions.set(sessionId, {
      id: sessionId,
      startTime: new Date(),
      browser,
      page,
    });

    return sessionId;
  }

  public async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const { browser } = session;
    await browser.close();
    this.sessions.delete(sessionId);
  }

  public getSession(sessionId: string): BrowserSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    return session;
  }

  public async closeAllSessions(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
  }
}
