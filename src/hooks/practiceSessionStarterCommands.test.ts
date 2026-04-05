import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadAntiTrapSessionCommand,
  loadGuestSessionCommand,
  loadMixedSessionCommand,
  loadRandomSessionCommand,
  loadSimulacroSessionCommand,
  loadStandardSessionCommand,
  loadWeakReviewSessionCommand,
} from './practiceSessionStarterCommands';
import {
  getAntiTrapPracticeBatch,
  getGuestPracticeBatch,
  getMixedPracticeBatch,
  getRandomPracticeBatch,
  getSimulacroPracticeBatch,
  getStandardPracticeBatch,
  getWeakPracticeInsights,
} from '../services/preguntasApi';
import { DEFAULT_CURRICULUM } from '../practiceConfig';

vi.mock('../services/preguntasApi', () => ({
  getAntiTrapPracticeBatch: vi.fn(),
  getGuestPracticeBatch: vi.fn(),
  getMixedPracticeBatch: vi.fn(),
  getRandomPracticeBatch: vi.fn(),
  getSimulacroPracticeBatch: vi.fn(),
  getStandardPracticeBatch: vi.fn(),
  getWeakPracticeInsights: vi.fn(),
}));

const mockedGetAntiTrapPracticeBatch = vi.mocked(getAntiTrapPracticeBatch);
const mockedGetGuestPracticeBatch = vi.mocked(getGuestPracticeBatch);
const mockedGetMixedPracticeBatch = vi.mocked(getMixedPracticeBatch);
const mockedGetRandomPracticeBatch = vi.mocked(getRandomPracticeBatch);
const mockedGetSimulacroPracticeBatch = vi.mocked(getSimulacroPracticeBatch);
const mockedGetStandardPracticeBatch = vi.mocked(getStandardPracticeBatch);
const mockedGetWeakPracticeInsights = vi.mocked(getWeakPracticeInsights);

const buildQuestion = (id: string) => ({
  id,
  number: 1,
  statement: `Pregunta ${id}`,
  options: {
    a: 'A',
    b: 'B',
    c: 'C',
    d: 'D',
  },
  correctOption: 'a' as const,
  category: null,
  explanation: null,
});

describe('practiceSessionStarterCommands', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('carga una sesion estandar normalizando el indice fuera de rango', async () => {
    mockedGetStandardPracticeBatch.mockResolvedValue([buildQuestion('q1'), buildQuestion('q2')]);

    const result = await loadStandardSessionCommand({
      batchStartIndex: 999,
      questionsCount: 55,
      questionScope: 'all',
    });

    expect(mockedGetStandardPracticeBatch).toHaveBeenCalledWith(0, 20, DEFAULT_CURRICULUM, 'all');
    expect(result.session).toMatchObject({
      mode: 'standard',
      batchStartIndex: 0,
      nextStandardBatchStartIndex: 20,
    });
  });

  it('devuelve el siguiente bloque consumido en guest', async () => {
    mockedGetGuestPracticeBatch.mockResolvedValue([buildQuestion('g1'), buildQuestion('g2')]);

    const result = await loadGuestSessionCommand({
      guestBlocksUsed: 1,
    });

    expect(result.nextGuestBlockNumber).toBe(2);
    expect(result.session).toMatchObject({
      title: 'Bloque de prueba 2/2',
      questionScope: 'common',
    });
  });

  it('cae al bloque estandar cuando falla la sesion mixta', async () => {
    mockedGetMixedPracticeBatch.mockRejectedValue(new Error('mixed failed'));
    mockedGetStandardPracticeBatch.mockResolvedValue([buildQuestion('q1'), buildQuestion('q2')]);

    const result = await loadMixedSessionCommand({
      questionScope: 'specific',
      recommendedBatchStartIndex: 20,
      questionsCount: 80,
    });

    expect(result.session).toMatchObject({
      mode: 'standard',
      batchStartIndex: 20,
      questionScope: 'specific',
    });
  });

  it('cae al repaso de debiles cuando falla anti-trampas', async () => {
    mockedGetAntiTrapPracticeBatch.mockRejectedValue(new Error('anti trap failed'));

    const result = await loadAntiTrapSessionCommand({
      questionScope: 'common',
      weakQuestions: [
        { question: buildQuestion('w1'), stat: {} as never },
        { question: buildQuestion('w2'), stat: {} as never },
      ],
    });

    expect(result.session).toMatchObject({
      mode: 'weakest',
      questionScope: 'common',
    });
  });

  it('cae al simulacro aleatorio cuando falla el batch principal', async () => {
    mockedGetSimulacroPracticeBatch.mockRejectedValue(new Error('simulacro failed'));
    mockedGetRandomPracticeBatch.mockResolvedValue([buildQuestion('s1'), buildQuestion('s2')]);

    const result = await loadSimulacroSessionCommand({
      questionScope: 'all',
    });

    expect(result.session).toMatchObject({
      mode: 'simulacro',
      questionScope: 'all',
    });
  });

  it('reutiliza el constructor aleatorio para sesiones random', async () => {
    mockedGetRandomPracticeBatch.mockResolvedValue([buildQuestion('r1'), buildQuestion('r2')]);

    const result = await loadRandomSessionCommand({
      questionScope: 'specific',
    });

    expect(result.session).toMatchObject({
      mode: 'random',
      questionScope: 'specific',
    });
  });

  it('repaso falladas pide primero al servidor y usa snapshot solo si el servidor no devuelve preguntas', async () => {
    mockedGetWeakPracticeInsights.mockResolvedValue([]);
    const result = await loadWeakReviewSessionCommand({
      questionScope: 'all',
      weakQuestions: [{ question: buildQuestion('w1'), stat: {} as never }],
      recommendedBatchStartIndex: 0,
      questionsCount: 60,
    });

    expect(mockedGetWeakPracticeInsights).toHaveBeenCalled();
    expect(result.session).toMatchObject({
      mode: 'weakest',
      questionScope: 'all',
    });
  });

  it('repaso falladas pide batch al servidor si el snapshot local esta vacio', async () => {
    mockedGetWeakPracticeInsights.mockResolvedValue([
      { question: buildQuestion('w1'), stat: {} as never },
    ]);

    const result = await loadWeakReviewSessionCommand({
      questionScope: 'all',
      weakQuestions: [],
      recommendedBatchStartIndex: 20,
      questionsCount: 80,
    });

    expect(mockedGetWeakPracticeInsights).toHaveBeenCalledWith(DEFAULT_CURRICULUM, 20, 'all');
    expect(result.session).toMatchObject({
      mode: 'weakest',
      questionScope: 'all',
    });
  });

  it('repaso falladas cae al bloque estandar si tampoco hay batch debil en servidor', async () => {
    mockedGetWeakPracticeInsights.mockResolvedValue([]);
    mockedGetStandardPracticeBatch.mockResolvedValue([buildQuestion('q1'), buildQuestion('q2')]);

    const result = await loadWeakReviewSessionCommand({
      questionScope: 'specific',
      weakQuestions: [],
      recommendedBatchStartIndex: 40,
      questionsCount: 100,
    });

    expect(mockedGetWeakPracticeInsights).toHaveBeenCalledWith(DEFAULT_CURRICULUM, 20, 'specific');
    expect(mockedGetStandardPracticeBatch).toHaveBeenCalledWith(40, 20, DEFAULT_CURRICULUM, 'specific');
    expect(result.session).toMatchObject({
      mode: 'standard',
      batchStartIndex: 40,
      questionScope: 'specific',
    });
  });
});
