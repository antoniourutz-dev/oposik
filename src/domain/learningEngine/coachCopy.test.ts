import { describe, expect, it } from 'vitest';
import { toCoachTwoLineMessage } from './coachCopy';

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

describe('toCoachTwoLineMessage', () => {
  it('produce 2 líneas cortas (máx 14 palabras)', () => {
    const msg = toCoachTwoLineMessage({
      mode: 'mixed',
      tone: 'build',
      focusMessage: 'Hoy conviene consolidar 12 preguntas utiles.',
      reasons: ['Este es el punto donde mas retorno da una sesion adaptativa bien medida.'],
      summary: null,
    });

    expect(msg.line1.length).toBeGreaterThan(0);
    expect(msg.line2.length).toBeGreaterThan(0);
    expect(countWords(msg.line1)).toBeLessThanOrEqual(14);
    expect(countWords(msg.line2)).toBeLessThanOrEqual(14);
  });

  it('evita métricas y números', () => {
    const msg = toCoachTwoLineMessage({
      mode: 'mixed',
      tone: 'rescue',
      focusMessage: 'Tienes 48 repasos urgentes. Tu capacidad diaria esta en 20.',
      reasons: ['Tu rendimiento cae 16 puntos bajo presion.'],
      summary: 'Hoy conviene absorber solo la parte rentable, no vaciar todo el backlog.',
    });

    expect(msg.text).not.toMatch(/\b\d+\b/);
    expect(msg.text.toLowerCase()).not.toContain('pts');
    expect(msg.text.toLowerCase()).not.toContain('%');
  });

  it('elige anti-trampas cuando el tema es lectura/trampas', () => {
    const msg = toCoachTwoLineMessage({
      mode: 'anti_trap',
      tone: 'pressure',
      focusMessage: 'Tus fallos mas caros vienen de plazos, negaciones y opciones parecidas.',
      reasons: [],
      summary: null,
    });

    expect(msg.line2.toLowerCase()).toContain('plazos');
  });
});

