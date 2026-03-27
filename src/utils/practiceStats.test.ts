import { describe, expect, it } from 'vitest';
import { getAccuracy, getWeakCategories } from './practiceStats';

describe('practiceStats', () => {
  it('calcula la precision redondeada', () => {
    expect(getAccuracy(7, 9)).toBe(78);
    expect(getAccuracy(0, 0)).toBe(0);
  });

  it('agrupa categorias debiles y devuelve solo las tres peores', () => {
    const result = getWeakCategories([
      {
        questionId: 'q1',
        questionNumber: 1,
        statement: 'A',
        category: 'Tema 1',
        explanation: null,
        attempts: 5,
        correctAttempts: 2,
        incorrectAttempts: 3,
        lastAnsweredAt: '',
        lastIncorrectAt: null
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        statement: 'B',
        category: 'Tema 2',
        explanation: null,
        attempts: 7,
        correctAttempts: 1,
        incorrectAttempts: 6,
        lastAnsweredAt: '',
        lastIncorrectAt: null
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        statement: 'C',
        category: 'Tema 1',
        explanation: null,
        attempts: 4,
        correctAttempts: 3,
        incorrectAttempts: 1,
        lastAnsweredAt: '',
        lastIncorrectAt: null
      },
      {
        questionId: 'q4',
        questionNumber: 4,
        statement: 'D',
        category: null,
        explanation: null,
        attempts: 2,
        correctAttempts: 0,
        incorrectAttempts: 2,
        lastAnsweredAt: '',
        lastIncorrectAt: null
      },
      {
        questionId: 'q5',
        questionNumber: 5,
        statement: 'E',
        category: 'Tema 3',
        explanation: null,
        attempts: 1,
        correctAttempts: 0,
        incorrectAttempts: 1,
        lastAnsweredAt: '',
        lastIncorrectAt: null
      }
    ]);

    expect(result).toEqual([
      { category: 'Tema 2', incorrectAttempts: 6, attempts: 7 },
      { category: 'Tema 1', incorrectAttempts: 4, attempts: 9 },
      { category: 'Sin grupo', incorrectAttempts: 2, attempts: 2 }
    ]);
  });
});
