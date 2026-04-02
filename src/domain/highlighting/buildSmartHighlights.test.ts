import { describe, expect, it } from 'vitest';
import { buildSmartHighlights } from './buildSmartHighlights';
import { compareAnswerOptions } from './compareAnswerOptions';

describe('buildSmartHighlights', () => {
  it('prioriza pocas piezas decisivas en un enunciado largo', () => {
    const text =
      'Cuando consideren que existe un riesgo grave e inminente para su seguridad y salud, según la Ley 31/1995.';
    const { spans, confidence } = buildSmartHighlights({ text, contentRole: 'question' });

    expect(confidence).not.toBe('low');
    expect(spans.length).toBeGreaterThan(0);
    expect(spans.length).toBeLessThanOrEqual(4);
    const joined = spans.map((s) => text.slice(s.start, s.end)).join(' ');
    expect(joined.toLowerCase()).toMatch(/riesgo grave e inminente/);
    expect(joined).toMatch(/Ley 31\/1995/);
  });

  it('en opciones hermanas prioriza diferenciadores', () => {
    const opts = [
      'En intereses generales del Estado.',
      'En intereses particulares del Estado.',
    ] as const;
    const { spans } = buildSmartHighlights({
      text: opts[0],
      contentRole: 'answer_option',
      allOptions: opts,
      optionIndex: 0,
    });

    expect(spans.length).toBeLessThanOrEqual(2);
    const diff = spans.filter((s) => s.intent === 'differentiator');
    expect(diff.length).toBeGreaterThan(0);
  });

  it('no devuelve resaltes en texto demasiado genérico', () => {
    const { spans, confidence } = buildSmartHighlights({ text: 'sí', contentRole: 'question' });
    expect(spans).toEqual([]);
    expect(confidence).toBe('low');
  });
});

describe('compareAnswerOptions', () => {
  it('agrupa la frase que distingue opciones alineadas', () => {
    const byOpt = compareAnswerOptions(['opción alfa única', 'opción beta distinta']);
    expect(byOpt[0].length).toBeGreaterThan(0);
    expect(byOpt[1].length).toBeGreaterThan(0);
  });
});
