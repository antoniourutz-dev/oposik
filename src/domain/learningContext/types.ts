export type LearningContextType = 'opposition' | 'general_law';

export type LearningContextSource = 'remote' | 'local';

export type LearningContextStudyStructure = 'opposition_topics' | 'law_blocks';

export type LearningContextCapabilities = {
  supportsExamMode: boolean;
  supportsExamCountdown: boolean;
  supportsPressureTraining: boolean;
};

export type LearningContextCopyDictionary = {
  pickerEyebrow: string;
  pickerTitle: string;
  pickerSummary: string;
  pickerSectionTitle: string;
  pickerSectionSummary: string;
  profileTitle: string;
  profileSummary: string;
  profileChangeCta: string;
  workspaceLabel: string;
  workspaceSummary: string;
  homeHeroEyebrow: string;
  homePressureTitle: string;
  statsEyebrow: string;
  studyTitle: string;
  studySummary: string;
};

export type LearningContextCoachOverrides = {
  pressureHeaderLabel: string;
  pressurePrimaryCta: string;
  pressureSecondaryTitle: string;
  pressureSecondarySummary: string;
  pressureSecondaryCta: string;
  sessionEndPressureTitle: string;
  sessionEndPressureSummary: string;
  sessionEndPressureCta: string;
  reviewPressureCta: string;
};

export type LearningContextStatsLabels = {
  pressureActionLabel: string;
  pressureInsightTitle: string;
  pressureInsightSummary: string;
};

export type LearningContextConfig = {
  capabilities: LearningContextCapabilities;
  studyStructure: LearningContextStudyStructure;
  copyDictionary: LearningContextCopyDictionary;
  coachOverrides: LearningContextCoachOverrides;
  statsLabels: LearningContextStatsLabels;
};

export type ActiveLearningContext = {
  contextId: string;
  contextType: LearningContextType;
  displayName: string;
  shortName: string;
  code: string | null;
  curriculumKey: string;
  themeKey: string | null;
  configJson: Record<string, unknown>;
  examDate: string | null;
  onboardingCompleted: boolean;
  source: LearningContextSource;
  config: LearningContextConfig;
};

export type LearningContextOption = {
  contextId: string;
  contextType: LearningContextType;
  displayName: string;
  shortName: string;
  code: string | null;
  curriculumKey: string | null;
  description: string;
  themeKey: string | null;
  configJson: Record<string, unknown>;
  source: LearningContextSource;
  isActive: boolean;
  config: LearningContextConfig;
};
