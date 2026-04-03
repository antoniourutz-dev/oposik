export type {
  DifficultyBand,
  GeneralLaw,
  GeneralLawBlock,
  GeneralLawCurriculumKey,
  GeneralLawPublicationStatus,
  GeneralLawQuestionClassification,
  GeneralLawQuestionType,
  GeneralLawSubjectKey,
  QuestionScopeKey,
} from './types';
export {
  DEFAULT_MIN_QUESTIONS_TO_PUBLISH_LAW,
  MIN_QUESTIONS_FOR_BLOCK_TERRITORY,
} from './constants';
export type { LawTerritoryContinuityHint } from './lawTerritory';
export {
  appendTerritoryToContinuityBridge,
  buildStudyLawDescription,
  isBlockEligibleForTerritoryRecommendation,
  matchLawPerformanceForSessionTitle,
  pickWeakestRecommendableBlock,
  resolveLawTerritoryContinuityHint,
} from './lawTerritory';
