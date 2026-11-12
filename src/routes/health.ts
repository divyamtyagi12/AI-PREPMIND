import { Router, Request, Response } from 'express';
import { getStore } from '../store';
import { sessionCount } from '../sessionStore';

const router = Router();

/**
 * GET /health
 * Lightweight liveness probe.
 * Returns 200 with server metadata and data-load confirmation.
 */
router.get('/', (_req: Request, res: Response) => {
  const store = getStore();

  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV ?? 'development',
    data: {
      curriculumDays: store.curriculum.days.length,
      curriculumModules: store.curriculum.modules.length,
      candidates: store.candidates.candidates.length,
    },
    sessions: {
      active: sessionCount(),
    },
  });
});

export default router;
