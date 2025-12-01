/**
 * Cron Job Management API
 *
 * Provides endpoints to view, manage, and trigger cron jobs
 * for the end-to-end product marketing and serving pipeline
 */

import { Router, type Request, type Response } from 'express';

import { cronScheduler } from '../jobs/cronScheduler';

const router = Router();

/**
 * GET /api/cron/status
 * Get status of all cron jobs
 */
router.get('/status', (req: Request, res: Response) => {
  const status = cronScheduler.getStatus();

  res.json({
    success: true,
    ...status,
    schedules: {
      opportunityScan: 'Every 15 minutes',
      autonomousListing: 'Every hour',
      orderFulfillment: 'Every 30 minutes',
      cleanup: 'Every 6 hours',
      dailyReset: 'Daily at midnight',
      payoutProcessing: 'Every 4 hours',
    },
  });
});

/**
 * POST /api/cron/start
 * Start all enabled cron jobs
 */
router.post('/start', (req: Request, res: Response) => {
  try {
    cronScheduler.start();

    res.json({
      success: true,
      message: 'All enabled cron jobs started',
      status: cronScheduler.getStatus(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/cron/stop
 * Stop all cron jobs
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    cronScheduler.stop();

    res.json({
      success: true,
      message: 'All cron jobs stopped',
      status: cronScheduler.getStatus(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/cron/jobs/:jobName/enable
 * Enable a specific cron job
 */
router.post('/jobs/:jobName/enable', (req: Request, res: Response) => {
  const { jobName } = req.params;

  const success = cronScheduler.enableJob(jobName);

  if (success) {
    res.json({
      success: true,
      message: `Job '${jobName}' enabled`,
      status: cronScheduler.getStatus(),
    });
  } else {
    res.status(404).json({
      success: false,
      error: `Job '${jobName}' not found`,
    });
  }
});

/**
 * POST /api/cron/jobs/:jobName/disable
 * Disable a specific cron job
 */
router.post('/jobs/:jobName/disable', (req: Request, res: Response) => {
  const { jobName } = req.params;

  const success = cronScheduler.disableJob(jobName);

  if (success) {
    res.json({
      success: true,
      message: `Job '${jobName}' disabled`,
      status: cronScheduler.getStatus(),
    });
  } else {
    res.status(404).json({
      success: false,
      error: `Job '${jobName}' not found`,
    });
  }
});

/**
 * POST /api/cron/jobs/:jobName/run
 * Manually trigger a cron job
 */
router.post('/jobs/:jobName/run', async (req: Request, res: Response) => {
  const { jobName } = req.params;

  try {
    const result = await cronScheduler.runJobNow(jobName);

    res.json({
      success: true,
      message: `Job '${jobName}' triggered`,
      result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(404).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * PUT /api/cron/config
 * Update autonomous configuration for cron jobs
 */
router.put('/config', (req: Request, res: Response) => {
  const config = req.body;

  try {
    cronScheduler.updateConfig(config);

    res.json({
      success: true,
      message: 'Configuration updated',
      note: 'Changes will apply to next job run',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/cron/health
 * Health check for cron scheduler
 */
router.get('/health', (req: Request, res: Response) => {
  const status = cronScheduler.getStatus();
  const enabledJobs = status.jobs.filter(j => j.enabled).length;
  const runningJobs = status.jobs.filter(j => j.status === 'running').length;
  const errorJobs = status.jobs.filter(j => j.status === 'error').length;

  res.json({
    status: status.isInitialized ? 'healthy' : 'not_initialized',
    totalJobs: status.jobs.length,
    enabledJobs,
    runningJobs,
    errorJobs,
    jobs: status.jobs.map(j => ({
      name: j.name,
      schedule: j.schedule,
      enabled: j.enabled,
      status: j.status,
      lastRun: j.lastRun,
      runCount: j.runCount,
    })),
  });
});

export default router;
