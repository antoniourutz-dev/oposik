import { selectQuestionsFromRandomCycle } from './randomQuestionCycle';

const makeQuestions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `q-${index + 1}`, text: `Pregunta ${index + 1}` }));

describe('selectQuestionsFromRandomCycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('recorre todo el banco antes de repetir una pregunta', () => {
    const questions = makeQuestions(7);
    const first = selectQuestionsFromRandomCycle({ questions, count: 3, storageKey: 'cycle:test' });
    const second = selectQuestionsFromRandomCycle({ questions, count: 3, storageKey: 'cycle:test' });
    const third = selectQuestionsFromRandomCycle({ questions, count: 1, storageKey: 'cycle:test' });

    expect(new Set([...first, ...second, ...third].map((question) => question.id))).toEqual(
      new Set(questions.map((question) => question.id)),
    );
  });

  it('mantiene el ciclo entre llamadas', () => {
    const questions = makeQuestions(6);
    const first = selectQuestionsFromRandomCycle({ questions, count: 4, storageKey: 'cycle:persisted' });
    const second = selectQuestionsFromRandomCycle({ questions, count: 2, storageKey: 'cycle:persisted' });

    expect(new Set([...first, ...second].map((question) => question.id)).size).toBe(6);
  });

  it('evita enunciados visualmente duplicados dentro del bloque cuando hay alternativas', () => {
    const questions = [
      { id: 'q-1', text: 'Mismo enunciado' },
      { id: 'q-2', text: '  mismo   enunciado ' },
      { id: 'q-3', text: 'Enunciado diferente' },
    ];
    const selected = selectQuestionsFromRandomCycle({ questions, count: 2, storageKey: 'cycle:visible' });

    expect(new Set(selected.map((question) => question.text.trim().replace(/\s+/g, ' ').toLowerCase())).size).toBe(2);
  });
});

