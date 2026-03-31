import { describe, expect, it } from 'vitest';
import { buildExplanationPresentation } from './explanationPresentation';

describe('explanationPresentation', () => {
  it('limpia la coletilla de respuesta correcta y separa base legal y trampa', () => {
    const explanation =
      'La respuesta correcta es la c). De acuerdo con el Articulo 5.1.e) de la Ley 44/2003, de 21 de noviembre, de ordenacion de las profesiones sanitarias, tanto el personal profesional como los responsables de los centros tienen la obligacion de facilitar a los pacientes el conocimiento de los siguientes datos: Nombre, titulacion y especialidad de los profesionales que les atienden. La categoria y la funcion, siempre que estas se encuentren definidas en el centro o institucion sanitaria correspondiente. Este derecho se refuerza en el ambito de Euskadi a traves del Decreto 147/2015. Por que las otras opciones son incorrectas: Opcion a: Incluye la hoja de servicios. Las opciones b y d: Excluyen la funcion o la categoria.';

    const result = buildExplanationPresentation(explanation);

    expect(result).not.toBeNull();
    expect(result?.lead).toContain('Tanto el personal profesional');
    expect(result?.lead).toContain('La categoria y la funcion');
    expect(result?.blocks).toEqual([
      {
        tone: 'basis',
        title: 'Apoyo legal',
        text: expect.stringContaining('Ley 44/2003'),
      },
      {
        tone: 'trap',
        title: 'Donde estaba la trampa',
        text: expect.stringContaining('Opcion a:'),
      },
    ]);
  });

  it('deja una explicacion corta como idea principal sin inventar bloques', () => {
    const result = buildExplanationPresentation(
      'La categoria solo se informa cuando esta definida en el centro. No forma parte del minimo obligatorio.',
    );

    expect(result).toEqual({
      lead: 'La categoria solo se informa cuando esta definida en el centro. No forma parte del minimo obligatorio.',
      blocks: [],
    });
  });
});
