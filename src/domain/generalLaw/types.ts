import type { ErrorType } from '../learningEngine/types';

/** Siempre este valor para el contexto paralelo de leyes generales. */
export type GeneralLawCurriculumKey = 'leyes_generales';

export type QuestionScopeKey = 'common' | 'specific' | 'mixed';

/** Fase 1: opcional; no bloquea ingestión ni decisiones por bloque/tipo/trampa. */
export type GeneralLawSubjectKey = string | null;

export type GeneralLawQuestionType =
  | 'literal'
  | 'interpretacion'
  | 'plazo'
  | 'competencia'
  | 'procedimiento'
  | 'sancion'
  | 'excepcion'
  | 'supuestos_practicos';

export type DifficultyBand = 1 | 2 | 3 | 4 | 5;

export type GeneralLawPublicationStatus = 'draft' | 'review' | 'published' | 'archived';

/**
 * Unidad de entrenamiento (territorio), no ficha bibliográfica.
 * `trainingIntent` alimenta Study, Home, continuidad y coach.
 */
export interface GeneralLaw {
  id: string;
  lawKey: string;
  curriculumKey: GeneralLawCurriculumKey;
  title: string;
  shortTitle: string;
  legalReferenceLabel: string;
  sortOrder: number;
  status: GeneralLawPublicationStatus;
  publishedAt: string | null;
  minQuestionsToPublish: number;
  trainingIntent: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tramo de práctica dentro de una ley.
 * `trainingFocus` y `minQuestionsForTraining` evitan recomendar bloques vacíos o con masa trivial.
 */
export interface GeneralLawBlock {
  id: string;
  lawId: string;
  parentBlockId: string | null;
  blockKey: string;
  title: string;
  sortOrder: number;
  depth: 0 | 1 | 2;
  status: GeneralLawPublicationStatus;
  minQuestionsForTraining: number;
  trainingFocus: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Clasificación en catálogo para priorizar review, weak areas y coach. */
export interface GeneralLawQuestionClassification {
  curriculumKey: GeneralLawCurriculumKey;
  lawId: string;
  blockId: string;
  questionScopeKey: QuestionScopeKey;
  subjectKey: GeneralLawSubjectKey;
  legalReference: string;
  difficulty: DifficultyBand | null;
  questionType: GeneralLawQuestionType | null;
  dominantTrapType: ErrorType | null;
}
