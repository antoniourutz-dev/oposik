import { describe, expect, it } from 'vitest';
import type { ActivePracticeSession } from '../practiceTypes';
import { resolveReviewContinuation } from './practiceSessionFlowDecisions';

const buildSession = (
  overrides: Partial<ActivePracticeSession> = {}
): ActivePracticeSession => ({
  id: 'session-1',
  mode: 'standard',
  feedbackMode: 'immediate',
  title: 'Bloque 1',
  subtitle: 'Ruta principal.',
  questions: [],
  startedAt: '2026-03-29T12:00:00Z',
  timeLimitSeconds: null,
  batchNumber: 1,
  totalBatches: 3,
  questionScope: 'common',
  batchStartIndex: 0,
  continueLabel: 'Continuar',
  nextStandardBatchStartIndex: 20,
  ...overrides
});

describe('practiceSessionFlowDecisions', () => {
  it('continua con el siguiente bloque estandar respetando el scope de la sesion', () => {
    const decision = resolveReviewContinuation({
      activeSession: buildSession({ questionScope: 'specific', nextStandardBatchStartIndex: 40 }),
      guestBlocksRemaining: 0,
      isGuest: false,
      selectedQuestionScope: 'all'
    });

    expect(decision).toEqual({
      type: 'standard_next',
      batchStartIndex: 40,
      questionScope: 'specific'
    });
  });

  it('lanza otro bloque guest cuando quedan intentos disponibles', () => {
    const decision = resolveReviewContinuation({
      activeSession: buildSession({ mode: 'random', nextStandardBatchStartIndex: null }),
      guestBlocksRemaining: 1,
      isGuest: true,
      selectedQuestionScope: 'all'
    });

    expect(decision).toEqual({ type: 'guest_next' });
  });

  it('vuelve al panel cuando no hay sesion activa o no queda continuidad', () => {
    expect(
      resolveReviewContinuation({
        activeSession: null,
        guestBlocksRemaining: 0,
        isGuest: false,
        selectedQuestionScope: 'all'
      })
    ).toEqual({ type: 'reset' });

    expect(
      resolveReviewContinuation({
        activeSession: buildSession({ mode: 'mixed', nextStandardBatchStartIndex: null }),
        guestBlocksRemaining: 0,
        isGuest: false,
        selectedQuestionScope: 'all'
      })
    ).toEqual({ type: 'reset' });
  });
});
