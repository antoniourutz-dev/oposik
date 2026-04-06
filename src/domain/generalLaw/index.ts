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
export {
  canonicalLawGroupKey,
  canonicalLawGroupKeyFromLeyReferencia,
  canonicalLawGroupKeyFromText,
  catalogMatchKeyForLaw,
  mergeLawBreakdownRows,
  resolveStudyLawCardTitle,
} from './lawBreakdownGrouping';
export type { Lpacap39Section } from './lpacap39ArticleStructure';
export {
  countQuestionsPerLpacap39Title,
  extractLpacapArticleNumber,
  filterQuestionsForLpacap39Title,
  filterQuestionsInLpacap39Section,
  filterUnclassifiedLpacap39Questions,
  findLpacap39SectionByIdentity,
  formatLpacap39SectionLines,
  getLpacap39MergedTitles,
  groupQuestionsByLpacap39Sections,
  sectionIdentity,
  shouldGroupLpacap39ByTitles,
} from './lpacap39ArticleStructure';
