import { Router, Request, Response, NextFunction } from 'express';
import { BrowserManager, Navigator } from '@arbi/web-automation';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize browser manager
const browserManager = new BrowserManager();
const navigator = new Navigator(browserManager);

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

export default router;
