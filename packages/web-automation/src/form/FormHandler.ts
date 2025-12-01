import type { BrowserManager } from '../browser/BrowserManager';
import type { FormField, ElementSelector, ExtractedData } from '../types';
import type { Page } from 'playwright';

export class FormHandler {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Build a Playwright selector string from an ElementSelector
   */
  private buildSelector(selector: ElementSelector): string {
    switch (selector.type) {
      case 'id':
        return `#${selector.value}`;
      case 'css':
        return selector.value;
      case 'xpath':
        return `xpath=${selector.value}`;
      case 'text':
        return `text=${selector.value}`;
      default:
        return selector.value;
    }
  }

  /**
   * Fill a single form field
   */
  public async fillField(
    sessionId: string,
    field: FormField
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selector = this.buildSelector(field.selector);

    await page.waitForSelector(selector, { timeout: 10000 });

    switch (field.type) {
      case 'checkbox':
        if (field.value === 'true') {
          await page.check(selector);
        } else {
          await page.uncheck(selector);
        }
        break;
      case 'radio':
        await page.check(selector);
        break;
      case 'select':
        await page.selectOption(selector, field.value);
        break;
      case 'file':
        await page.setInputFiles(selector, field.value);
        break;
      case 'text':
      default:
        await page.fill(selector, field.value);
        break;
    }
  }

  /**
   * Fill multiple form fields
   */
  public async fillForm(
    sessionId: string,
    fields: FormField[]
  ): Promise<void> {
    for (const field of fields) {
      await this.fillField(sessionId, field);
    }
  }

  /**
   * Type text into an element character by character (useful for triggering input events)
   */
  public async typeText(
    sessionId: string,
    selector: ElementSelector,
    text: string,
    delay: number = 50
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);

    await page.waitForSelector(selectorStr, { timeout: 10000 });
    await page.type(selectorStr, text, { delay });
  }

  /**
   * Click a button or element
   */
  public async click(
    sessionId: string,
    selector: ElementSelector,
    options: { timeout?: number; force?: boolean } = {}
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);
    const timeout = options.timeout ?? 10000;

    await page.waitForSelector(selectorStr, { timeout });
    await page.click(selectorStr, { force: options.force });
  }

  /**
   * Submit a form by clicking the submit button
   */
  public async submitForm(
    sessionId: string,
    submitSelector: ElementSelector
  ): Promise<void> {
    await this.click(sessionId, submitSelector);
  }

  /**
   * Wait for a selector to appear on the page
   */
  public async waitForSelector(
    sessionId: string,
    selector: ElementSelector,
    options: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' } = {}
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);
    const timeout = options.timeout ?? 30000;

    await page.waitForSelector(selectorStr, { 
      timeout,
      state: options.state ?? 'visible'
    });
  }

  /**
   * Wait for navigation to complete
   */
  public async waitForNavigation(
    sessionId: string,
    options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}
  ): Promise<void> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    await page.waitForLoadState(options.waitUntil ?? 'networkidle', {
      timeout: options.timeout ?? 30000
    });
  }

  /**
   * Wait for URL to match a pattern
   */
  public async waitForUrlPattern(
    sessionId: string,
    pattern: string | RegExp,
    timeout: number = 30000
  ): Promise<string> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    await page.waitForURL(pattern, { timeout });
    return page.url();
  }

  /**
   * Extract text content from an element
   */
  public async extractText(
    sessionId: string,
    selector: ElementSelector
  ): Promise<string> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);

    await page.waitForSelector(selectorStr, { timeout: 10000 });
    const text = await page.textContent(selectorStr);
    return text ?? '';
  }

  /**
   * Extract data from an element including text, HTML, and attributes
   */
  public async extractData(
    sessionId: string,
    selector: ElementSelector,
    attributeNames?: string[]
  ): Promise<ExtractedData> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);

    await page.waitForSelector(selectorStr, { timeout: 10000 });

    const element = page.locator(selectorStr).first();
    const text = await element.textContent();
    const html = await element.innerHTML();

    const attributes: Record<string, string> = {};
    if (attributeNames) {
      for (const attr of attributeNames) {
        const value = await element.getAttribute(attr);
        if (value !== null) {
          attributes[attr] = value;
        }
      }
    }

    return {
      text: text ?? undefined,
      html: html ?? undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined
    };
  }

  /**
   * Check if an element exists on the page
   */
  public async elementExists(
    sessionId: string,
    selector: ElementSelector,
    timeout: number = 5000
  ): Promise<boolean> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);

    try {
      await page.waitForSelector(selectorStr, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all matching elements and extract their text content
   */
  public async extractAllText(
    sessionId: string,
    selector: ElementSelector
  ): Promise<string[]> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const selectorStr = this.buildSelector(selector);

    const elements = page.locator(selectorStr);
    const count = await elements.count();
    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await elements.nth(i).textContent();
      if (text) {
        texts.push(text);
      }
    }

    return texts;
  }

  /**
   * Take a screenshot
   */
  public async takeScreenshot(
    sessionId: string,
    options: { path?: string; fullPage?: boolean } = {}
  ): Promise<Buffer> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    return page.screenshot({
      path: options.path,
      fullPage: options.fullPage ?? false
    });
  }
}
