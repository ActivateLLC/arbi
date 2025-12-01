import type { BrowserManager } from '../browser/BrowserManager';
import type { NavigationOptions } from '../types';

export class Navigator {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  public async navigateTo(
    sessionId: string,
    url: string,
    options: NavigationOptions = {}
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;

    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    await page.goto(url, {
      waitUntil,
      timeout,
    });
  }

  public async goBack(sessionId: string): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;
    await page.goBack();
  }

  public async goForward(sessionId: string): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;
    await page.goForward();
  }

  public async refresh(sessionId: string): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;
    await page.reload();
  }

  public async getCurrentUrl(sessionId: string): Promise<string> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;
    return page.url();
  }

  public async getTitle(sessionId: string): Promise<string> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;
    return page.title();
  }

  public async waitForNavigation(
    sessionId: string,
    options: NavigationOptions = {}
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const { page } = session;

    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    await page.waitForNavigation({
      waitUntil,
      timeout,
    });
  }
}
