import { Router, Request, Response } from 'express';
import {
  isStartRequest,
  isTurnRequest,
  isValidCandidateProfile,
  InterviewResponse,
} from '../types';
import {
  createSession,
  getSession,
  updateSession,
} from '../sessionStore';
import {
  processOpeningTurn,
  processTurn,
} from '../interviewOrchestrator';

const router = Router();

/**
 * POST /api/interview
 *
 * Start turn  : { sessionId, candidate }
 *   → { reply, done: false }
 *
 * Mid turn    : { sessionId, message }
 *   → { reply, done: false }
 *
 * Final turn  : (after ≥8 questions / ≥4 topics)
 *   → { reply, done: true, feedback: { summary, strengths[], gaps[], next[] } }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as unknown;

  // ── Validate: must have sessionId ──────────────────────────────────────────
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>)['sessionId'] !== 'string'
  ) {
    res.status(400).json({
      success: false,
      error: { message: 'Request body must include a string "sessionId".' },
    });
    return;
  }

  const sessionId = (body as Record<string, unknown>)['sessionId'] as string;

  // ─────────────────────────────────────────────────────────────────────────
  // START TURN: body has { sessionId, candidate }
  // ─────────────────────────────────────────────────────────────────────────
  if (isStartRequest(body)) {
    if (!isValidCandidateProfile(body.candidate)) {
      res.status(400).json({
        success: false,
        error: {
          message:
            'Invalid candidate object. Expected { member: { id, name, ... }, missions: [], signals: {...} }.',
        },
      });
      return;
    }

    const existing = getSession(sessionId);
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          message: `Session "${sessionId}" is already active. Send { sessionId, message } to continue.`,
        },
      });
      return;
    }

    // Create session and generate opening reply (async — LLM call)
    const state = createSession(sessionId, body.candidate);
    try {
      const { reply, nextState } = await processOpeningTurn(state);
      updateSession(sessionId, nextState);
      const response: InterviewResponse = { reply, done: false };
      res.status(200).json(response);
    } catch (err) {
      console.error('[Route] processOpeningTurn failed:', err);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to start interview session. Please try again.' },
      });
    }
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MID TURN: body has { sessionId, message }
  // ─────────────────────────────────────────────────────────────────────────
  if (isTurnRequest(body)) {
    const state = getSession(sessionId);

    if (!state) {
      res.status(404).json({
        success: false,
        error: {
          message: `Session "${sessionId}" not found. Start a new session by including a "candidate" field.`,
        },
      });
      return;
    }

    if (state.phase === 'done') {
      res.status(410).json({
        success: false,
        error: {
          message: `Session "${sessionId}" has already concluded. Start a new session with a fresh sessionId.`,
        },
      });
      return;
    }

    try {
      const { reply, done, nextState, feedback } = await processTurn(state, body.message);
      updateSession(sessionId, nextState);

      const response: InterviewResponse = done
        ? { reply, done: true, feedback: feedback! }
        : { reply, done: false };

      res.status(200).json(response);
    } catch (err) {
      console.error('[Route] processTurn failed:', err);
      res.status(500).json({
        success: false,
        error: { message: 'An error occurred during the interview turn. Please try again.' },
      });
    }
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Malformed body
  // ─────────────────────────────────────────────────────────────────────────
  res.status(400).json({
    success: false,
    error: {
      message:
        'Request body must include either "candidate" (to start) or "message" (to continue the interview).',
    },
  });
});

/**
 * GET /api/interview/:sessionId
 * Rehydrates session state mid-interview or upon page refresh.
 */
router.get('/:sessionId', (req: Request, res: Response): void => {
  const rawSessionId = req.params['sessionId'];
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid or missing sessionId parameter.' },
    });
    return;
  }

  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({
      success: false,
      error: { message: `Session "${sessionId}" not found.` },
    });
    return;
  }

  res.status(200).json({
    success: true,
    session: {
      sessionId: session.sessionId,
      candidate: session.candidate,
      phase: session.phase,
      questionsAsked: session.questionsAsked,
      daysCovered: Array.from(session.daysCovered),
      history: session.history,
      done: session.phase === 'done',
    },
  });
});

export default router;
