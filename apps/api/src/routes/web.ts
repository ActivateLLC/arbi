import { 
  BrowserManager, 
  Navigator, 
  FormHandler,
  SignupAutomation,
  EmailVerificationHandler
} from '@arbi/web-automation';
import { Router } from 'express';


import { ApiError } from '../middleware/errorHandler';

import type { Request, Response, NextFunction } from 'express';

const router = Router();

// Initialize browser manager and components
const browserManager = new BrowserManager();
const navigator = new Navigator(browserManager);
const formHandler = new FormHandler(browserManager);
const signupAutomation = new SignupAutomation(browserManager);
const emailVerificationHandler = new EmailVerificationHandler(browserManager);

// GET /api/web/health
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Web Automation Engine is operational',
  });
});

// POST /api/web/session
router.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { headless, userAgent, viewport } = req.body;

    const sessionId = await browserManager.createSession({
      headless: headless !== false, // Default to headless
      userAgent,
      viewport,
    });

    res.status(201).json({
      sessionId,
      message: 'Browser session created',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/web/session/:sessionId
router.delete('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    await browserManager.closeSession(sessionId);

    res.status(200).json({
      message: 'Browser session closed',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/navigate
router.post('/navigate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, url, waitUntil, timeout } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!url) {
      throw new ApiError('URL is required', 400);
    }

    await navigator.navigateTo(sessionId, url, { waitUntil, timeout });

    // Get current URL and title
    const currentUrl = await navigator.getCurrentUrl(sessionId);
    const title = await navigator.getTitle(sessionId);

    res.status(200).json({
      url: currentUrl,
      title,
      message: 'Navigation completed',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/web/url
router.get('/url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    const url = await navigator.getCurrentUrl(sessionId as string);
    const title = await navigator.getTitle(sessionId as string);

    res.status(200).json({
      url,
      title,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/back
router.post('/back', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    await navigator.goBack(sessionId);

    const url = await navigator.getCurrentUrl(sessionId);
    const title = await navigator.getTitle(sessionId);

    res.status(200).json({
      url,
      title,
      message: 'Navigated back',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/forward
router.post('/forward', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    await navigator.goForward(sessionId);

    const url = await navigator.getCurrentUrl(sessionId);
    const title = await navigator.getTitle(sessionId);

    res.status(200).json({
      url,
      title,
      message: 'Navigated forward',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    await navigator.refresh(sessionId);

    const url = await navigator.getCurrentUrl(sessionId);
    const title = await navigator.getTitle(sessionId);

    res.status(200).json({
      url,
      title,
      message: 'Page refreshed',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/fill-form
router.post('/fill-form', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, fields } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!fields || !Array.isArray(fields)) {
      throw new ApiError('Fields array is required', 400);
    }

    await formHandler.fillForm(sessionId, fields);

    res.status(200).json({
      message: 'Form filled successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/click
router.post('/click', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, selector, timeout, force } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!selector) {
      throw new ApiError('Selector is required', 400);
    }

    await formHandler.click(sessionId, selector, { timeout, force });

    res.status(200).json({
      message: 'Element clicked successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/type
router.post('/type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, selector, text, delay } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!selector) {
      throw new ApiError('Selector is required', 400);
    }

    if (!text) {
      throw new ApiError('Text is required', 400);
    }

    await formHandler.typeText(sessionId, selector, text, delay);

    res.status(200).json({
      message: 'Text typed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/wait-for-selector
router.post('/wait-for-selector', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, selector, timeout, state } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!selector) {
      throw new ApiError('Selector is required', 400);
    }

    await formHandler.waitForSelector(sessionId, selector, { timeout, state });

    res.status(200).json({
      message: 'Selector found',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/extract-text
router.post('/extract-text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, selector } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!selector) {
      throw new ApiError('Selector is required', 400);
    }

    const text = await formHandler.extractText(sessionId, selector);

    res.status(200).json({
      text,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/extract-data
router.post('/extract-data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, selector, attributes } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!selector) {
      throw new ApiError('Selector is required', 400);
    }

    const data = await formHandler.extractData(sessionId, selector, attributes);

    res.status(200).json({
      data,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, credentials, config } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!credentials || !credentials.email || !credentials.password) {
      throw new ApiError('Credentials (email and password) are required', 400);
    }

    if (!config || !config.url) {
      throw new ApiError('Config with URL is required', 400);
    }

    const result = await signupAutomation.performSignup(sessionId, credentials, config);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/web/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, url, credentials, selectors } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!url) {
      throw new ApiError('URL is required', 400);
    }

    if (!credentials || !credentials.email || !credentials.password) {
      throw new ApiError('Credentials (email and password) are required', 400);
    }

    const result = await signupAutomation.performLogin(sessionId, url, credentials, selectors);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/web/extract-api-keys
router.post('/extract-api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, config } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!config) {
      throw new ApiError('Config is required', 400);
    }

    const keys = await signupAutomation.extractApiKeys(sessionId, config);

    res.status(200).json({
      keys,
      message: `Found ${keys.length} API key(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/verify-email
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, verificationUrl, confirmationSelector } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!verificationUrl) {
      throw new ApiError('Verification URL is required', 400);
    }

    const result = await emailVerificationHandler.clickVerificationLink(
      sessionId,
      verificationUrl,
      confirmationSelector
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/web/extract-verification-links
router.post('/extract-verification-links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailBody } = req.body;

    if (!emailBody) {
      throw new ApiError('Email body is required', 400);
    }

    const links = emailVerificationHandler.extractVerificationLinks(emailBody);

    res.status(200).json({
      links,
      message: `Found ${links.length} verification link(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/wait-for-redirect
router.post('/wait-for-redirect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, urlPattern, timeout } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    if (!urlPattern) {
      throw new ApiError('URL pattern is required', 400);
    }

    const redirectUrl = await signupAutomation.waitForRedirect(sessionId, urlPattern, timeout);

    res.status(200).json({
      url: redirectUrl,
      message: 'Redirect completed',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/web/screenshot
router.post('/screenshot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, path: screenshotPath } = req.body;

    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    const screenshot = await signupAutomation.takeScreenshot(sessionId, screenshotPath);

    if (screenshotPath) {
      res.status(200).json({
        message: 'Screenshot saved',
        path: screenshotPath,
      });
    } else {
      res.status(200).json({
        message: 'Screenshot captured',
        data: screenshot.toString('base64'),
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
