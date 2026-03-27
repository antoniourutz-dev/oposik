import { describe, expect, it } from 'vitest';
import {
  buildRandomPracticeSession,
  buildStandardPracticeSession,
  buildWeakestPracticeSession,
  restartPracticeSession
} from './practiceSessionFactory';

const buildQuestion = (id: string) => ({
  id,
  number: 1,
  statement: `Pregunta ${id}`,
  options: {
    a: 'A',
    b: 'B',
    c: 'C',
    d: 'D'
  },
  correctOption: 'a' as const,
  category: null,
  explanation: null
});

describe('practiceSessionFactory', () => {
  it('crea bloques estandar con continuidad cuando quedan preguntas', () => {
    const session = buildStandardPracticeSession({
      batchStartIndex: 20,
      questionsCount: 55,
      questions: [buildQuestion('q1'), buildQuestion('q2')]
    });

    expect(session).toMatchObject({
      mode: 'standard',
      batchNumber: 2,
      totalBatches: 3,
      batchStartIndex: 20,
      nextStandardBatchStartIndex: 40,
      continueLabel: 'Continuar con las siguientes 20'
    });
  });

  it('crea sesiones de repaso y permite reiniciarlas sin mutar el contrato', () => {
    const session = buildWeakestPracticeSession([
      { question: buildQuestion('q1'), stat: {} as never },
      { question: buildQuestion('q2'), stat: {} as never }
    ]);

    expect(session).toMatchObject({
      mode: 'weakest',
      batchNumber: 1,
      totalBatches: 1,
      continueLabel: 'Volver al panel'
    });

    const restarted = restartPracticeSession(session!);
    expect(restarted.id).not.toBe(session?.id);
    expect(restarted.questions).toEqual(session?.questions);
  });

  it('crea sesiones aleatorias sin continuidad estandar', () => {
    const session = buildRandomPracticeSession([
      buildQuestion('q1'),
      buildQuestion('q2')
    ]);

    expect(session).toMatchObject({
      mode: 'random',
      title: 'Sesion aleatoria',
      batchStartIndex: null,
      nextStandardBatchStartIndex: null
    });
  });
});
