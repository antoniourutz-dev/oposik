import { describe, expect, it } from 'vitest';
import { mapQuestion, mapWeakQuestionInsight } from './preguntasMappers';

describe('preguntasMappers', () => {
  it('mapea una pregunta usando aliases legacy y texto de respuesta', () => {
    const question = mapQuestion({
      id: 'q-1',
      question_text: '¿Cual es la capital de Francia?',
      option_a: 'Madrid',
      option_b: 'Paris',
      option_c: 'Roma',
      option_d: 'Lisboa',
      correct_answer: '  paris ',
      category: 'geografia',
      explanation: 'Paris es la capital de Francia.',
      explicacion_editorial: 'La clave es simple: Paris es la capital de Francia.'
    });

    expect(question).toEqual({
      id: 'q-1',
      number: null,
      statement: '¿Cual es la capital de Francia?',
      options: {
        a: 'Madrid',
        b: 'Paris',
        c: 'Roma',
        d: 'Lisboa'
      },
      correctOption: 'b',
      category: 'geografia',
      explanation: 'Paris es la capital de Francia.',
      editorialExplanation: 'La clave es simple: Paris es la capital de Francia.'
    });
  });

  it('devuelve null cuando faltan opciones obligatorias', () => {
    expect(
      mapQuestion({
        id: 'q-2',
        pregunta: 'Pregunta incompleta',
        opcion_a: 'A',
        opcion_b: 'B',
        opcion_c: 'C',
        respuesta_correcta: 'a'
      })
    ).toBeNull();
  });

  it('mapea el payload de preguntas debiles con su estadistica', () => {
    const insight = mapWeakQuestionInsight({
      attempts: 7,
      correct_attempts: 2,
      incorrect_attempts: 5,
      last_answered_at: '2026-03-27T10:00:00Z',
      last_incorrect_at: '2026-03-27T09:00:00Z',
      payload: {
        id: 'q-9',
        pregunta: 'Pregunta de prueba',
        opciones: {
          a: 'Uno',
          b: 'Dos',
          c: 'Tres',
          d: 'Cuatro'
        },
        respuesta_correcta: 4,
        grupo: 'simulacro',
        explicacion: 'La opcion correcta es la cuarta.',
        resumen_editorial: 'La buena es la d: es la cuarta opcion.'
      }
    });

    expect(insight?.question.correctOption).toBe('d');
    expect(insight?.stat).toMatchObject({
      questionId: 'q-9',
      incorrectAttempts: 5,
      attempts: 7,
      category: 'simulacro',
      editorialExplanation: 'La buena es la d: es la cuarta opcion.'
    });
  });
});
