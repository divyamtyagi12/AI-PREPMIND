import { Router, Request, Response } from 'express';
import { getStore } from '../store';

const router = Router();

/**
 * GET /api/candidates
 * Returns list of all candidate profiles and cohort stats.
 */
router.get('/', (_req: Request, res: Response): void => {
  try {
    const store = getStore();
    const candidates = store.candidates.candidates;
    const totalCandidates = candidates.length;
    const totalCurriculumDays = store.curriculum.days.length;
    const totalModules = store.curriculum.modules.length;

    let sumCompleted = 0;
    candidates.forEach((c) => {
      sumCompleted += c.signals?.missionsCompleted ?? 0;
    });

    const maxPossibleMissions = totalCandidates * totalCurriculumDays;
    const avgCompletionRate =
      maxPossibleMissions > 0
        ? Math.round((sumCompleted / maxPossibleMissions) * 100)
        : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalCandidates,
        totalCurriculumDays,
        totalModules,
        avgCompletionRate,
      },
      candidates,
    });
  } catch (err) {
    console.error('[Route] GET /api/candidates failed:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve candidates' },
    });
  }
});

export default router;
