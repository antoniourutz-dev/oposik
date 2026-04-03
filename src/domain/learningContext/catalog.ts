import type {
  ActiveLearningContext,
  LearningContextConfig,
  LearningContextCopyDictionary,
  LearningContextCoachOverrides,
  LearningContextOption,
  LearningContextStatsLabels,
  LearningContextStudyStructure,
  LearningContextType,
} from './types';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const readBool = (record: Record<string, unknown> | null, key: string, fallback: boolean) => {
  if (!record || !(key in record)) return fallback;
  return Boolean(record[key]);
};

const readString = (record: Record<string, unknown> | null, key: string, fallback: string) => {
  if (!record || !(key in record)) return fallback;
  const text = String(record[key] ?? '').trim();
  return text || fallback;
};

const mergeCopyDictionary = (
  base: LearningContextCopyDictionary,
  overrides: Record<string, unknown> | null,
): LearningContextCopyDictionary => ({
  pickerEyebrow: readString(overrides, 'pickerEyebrow', base.pickerEyebrow),
  pickerTitle: readString(overrides, 'pickerTitle', base.pickerTitle),
  pickerSummary: readString(overrides, 'pickerSummary', base.pickerSummary),
  pickerSectionTitle: readString(overrides, 'pickerSectionTitle', base.pickerSectionTitle),
  pickerSectionSummary: readString(overrides, 'pickerSectionSummary', base.pickerSectionSummary),
  profileTitle: readString(overrides, 'profileTitle', base.profileTitle),
  profileSummary: readString(overrides, 'profileSummary', base.profileSummary),
  profileChangeCta: readString(overrides, 'profileChangeCta', base.profileChangeCta),
  workspaceLabel: readString(overrides, 'workspaceLabel', base.workspaceLabel),
  workspaceSummary: readString(overrides, 'workspaceSummary', base.workspaceSummary),
  homeHeroEyebrow: readString(overrides, 'homeHeroEyebrow', base.homeHeroEyebrow),
  homePressureTitle: readString(overrides, 'homePressureTitle', base.homePressureTitle),
  statsEyebrow: readString(overrides, 'statsEyebrow', base.statsEyebrow),
  studyTitle: readString(overrides, 'studyTitle', base.studyTitle),
  studySummary: readString(overrides, 'studySummary', base.studySummary),
});

const mergeCoachOverrides = (
  base: LearningContextCoachOverrides,
  overrides: Record<string, unknown> | null,
): LearningContextCoachOverrides => ({
  pressureHeaderLabel: readString(overrides, 'pressureHeaderLabel', base.pressureHeaderLabel),
  pressurePrimaryCta: readString(overrides, 'pressurePrimaryCta', base.pressurePrimaryCta),
  pressureSecondaryTitle: readString(
    overrides,
    'pressureSecondaryTitle',
    base.pressureSecondaryTitle,
  ),
  pressureSecondarySummary: readString(
    overrides,
    'pressureSecondarySummary',
    base.pressureSecondarySummary,
  ),
  pressureSecondaryCta: readString(overrides, 'pressureSecondaryCta', base.pressureSecondaryCta),
  sessionEndPressureTitle: readString(
    overrides,
    'sessionEndPressureTitle',
    base.sessionEndPressureTitle,
  ),
  sessionEndPressureSummary: readString(
    overrides,
    'sessionEndPressureSummary',
    base.sessionEndPressureSummary,
  ),
  sessionEndPressureCta: readString(
    overrides,
    'sessionEndPressureCta',
    base.sessionEndPressureCta,
  ),
  reviewPressureCta: readString(overrides, 'reviewPressureCta', base.reviewPressureCta),
});

const mergeStatsLabels = (
  base: LearningContextStatsLabels,
  overrides: Record<string, unknown> | null,
): LearningContextStatsLabels => ({
  pressureActionLabel: readString(overrides, 'pressureActionLabel', base.pressureActionLabel),
  pressureInsightTitle: readString(overrides, 'pressureInsightTitle', base.pressureInsightTitle),
  pressureInsightSummary: readString(
    overrides,
    'pressureInsightSummary',
    base.pressureInsightSummary,
  ),
});

const BASE_OPPOSITION_CONFIG: LearningContextConfig = {
  capabilities: {
    supportsExamMode: true,
    supportsExamCountdown: true,
    supportsPressureTraining: true,
  },
  studyStructure: 'opposition_topics',
  copyDictionary: {
    pickerEyebrow: 'Contexto activo',
    pickerTitle: 'Elige tu espacio de trabajo',
    pickerSummary:
      'La practica real no cambia: solo elegimos desde que contexto quieres entrenar.',
    pickerSectionTitle: 'Preparar oposicion',
    pickerSectionSummary:
      'Trabaja una oposicion concreta con su curriculum, su progreso y su ritmo.',
    profileTitle: 'Contexto activo',
    profileSummary:
      'Este es el marco que alimenta la practica, el estudio y la lectura del sistema.',
    profileChangeCta: 'Cambiar',
    workspaceLabel: 'Preparar oposicion',
    workspaceSummary: 'Curriculum activo para preparacion competitiva.',
    homeHeroEyebrow: 'Hoy toca esto',
    homePressureTitle: 'Entrenando examen',
    statsEyebrow: 'Estadisticas',
    studyTitle: 'Tu temario',
    studySummary: 'Bloques y progreso del curriculum activo.',
  },
  coachOverrides: {
    pressureHeaderLabel: 'Entrenando bajo presion',
    pressurePrimaryCta: 'Hacer simulacro',
    pressureSecondaryTitle: 'Simulacro',
    pressureSecondarySummary: 'Si te ves fuerte, prueba presion real.',
    pressureSecondaryCta: 'Entrenar examen',
    sessionEndPressureTitle: 'Cierre de entrenamiento de examen',
    sessionEndPressureSummary: 'Lo que importa es como respondes con el cronometro encendido.',
    sessionEndPressureCta: 'Otro entrenamiento examen',
    reviewPressureCta: 'Entrenar examen',
  },
  statsLabels: {
    pressureActionLabel: 'Hoy toca entrenar examen',
    pressureInsightTitle: 'La presion te resta mas que el temario',
    pressureInsightSummary:
      'El patron dominante es ejecucion bajo crono, no vacio de estudio.',
  },
};

const BASE_GENERAL_LAW_CONFIG: LearningContextConfig = {
  capabilities: {
    supportsExamMode: false,
    supportsExamCountdown: false,
    supportsPressureTraining: false,
  },
  studyStructure: 'law_blocks',
  copyDictionary: {
    pickerEyebrow: 'Espacio de aprendizaje',
    pickerTitle: 'Elige tu espacio de trabajo',
    pickerSummary:
      'Una sola practica real, dos contextos de entrada: oposicion o aprendizaje legal.',
    pickerSectionTitle: 'Aprender leyes',
    pickerSectionSummary:
      'Trabaja bloques legales sin encajarlos como una oposicion falsa.',
    profileTitle: 'Workspace activo',
    profileSummary:
      'Este workspace fija el curriculum, el progreso y el framing de entrenamiento.',
    profileChangeCta: 'Cambiar',
    workspaceLabel: 'Aprender leyes',
    workspaceSummary: 'Workspace legal para practicar, revisar y consolidar normas.',
    homeHeroEyebrow: 'Foco legal del dia',
    homePressureTitle: 'Practica con foco',
    statsEyebrow: 'Progreso legal',
    studyTitle: 'Tu biblioteca legal',
    studySummary: 'Leyes y bloques de estudio dentro del workspace legal.',
  },
  coachOverrides: {
    pressureHeaderLabel: 'Entrenando bajo foco',
    pressurePrimaryCta: 'Practicar bloque',
    pressureSecondaryTitle: 'Bloque aleatorio',
    pressureSecondarySummary: 'Si no toca intensidad, vuelve a la ley con una tanda limpia.',
    pressureSecondaryCta: 'Practicar ahora',
    sessionEndPressureTitle: 'Cierre de practica con foco',
    sessionEndPressureSummary:
      'Aqui importa mas sostener lectura y precision que simular examen.',
    sessionEndPressureCta: 'Repetir con foco',
    reviewPressureCta: 'Practicar con foco',
  },
  statsLabels: {
    pressureActionLabel: 'Hoy toca practicar con foco',
    pressureInsightTitle: 'La velocidad te resta mas que la lectura',
    pressureInsightSummary:
      'El patron dominante no es examen: es precision de lectura dentro del bloque legal.',
  },
};

const buildBaseConfig = (contextType: LearningContextType) =>
  contextType === 'general_law' ? BASE_GENERAL_LAW_CONFIG : BASE_OPPOSITION_CONFIG;

export const buildLearningContextConfig = (
  contextType: LearningContextType,
  configJson: Record<string, unknown> | null | undefined = null,
): LearningContextConfig => {
  const base = buildBaseConfig(contextType);
  const raw = asRecord(configJson);
  const capabilities = asRecord(raw?.capabilities);
  const copyDictionary = asRecord(raw?.copyDictionary);
  const coachOverrides = asRecord(raw?.coachOverrides);
  const statsLabels = asRecord(raw?.statsLabels);
  const studyStructureRaw = readString(raw, 'studyStructure', base.studyStructure);
  const studyStructure: LearningContextStudyStructure =
    studyStructureRaw === 'law_blocks' ? 'law_blocks' : 'opposition_topics';

  return {
    capabilities: {
      supportsExamMode: readBool(
        capabilities,
        'supportsExamMode',
        base.capabilities.supportsExamMode,
      ),
      supportsExamCountdown: readBool(
        capabilities,
        'supportsExamCountdown',
        base.capabilities.supportsExamCountdown,
      ),
      supportsPressureTraining: readBool(
        capabilities,
        'supportsPressureTraining',
        base.capabilities.supportsPressureTraining,
      ),
    },
    studyStructure,
    copyDictionary: mergeCopyDictionary(base.copyDictionary, copyDictionary),
    coachOverrides: mergeCoachOverrides(base.coachOverrides, coachOverrides),
    statsLabels: mergeStatsLabels(base.statsLabels, statsLabels),
  };
};

export const GENERAL_LAW_CONTEXT_ID = 'general-law-workspace';
export const GENERAL_LAW_CURRICULUM_KEY = 'leyes_generales';

export const buildGeneralLawLearningContextOption = (): LearningContextOption => {
  const configJson: Record<string, unknown> = {
    studyStructure: 'law_blocks',
  };
  return {
    contextId: GENERAL_LAW_CONTEXT_ID,
    contextType: 'general_law',
    displayName: 'Aprender leyes',
    shortName: 'Leyes',
    code: 'LAW',
    curriculumKey: GENERAL_LAW_CURRICULUM_KEY,
    description: 'Workspace legal para practicar normas y consolidar lectura tecnica.',
    themeKey: 'law',
    configJson,
    source: 'local',
    isActive: true,
    config: buildLearningContextConfig('general_law', configJson),
  };
};

export const buildStoredGeneralLawLearningContext = (): ActiveLearningContext => {
  const option = buildGeneralLawLearningContextOption();
  return {
    contextId: option.contextId,
    contextType: option.contextType,
    displayName: option.displayName,
    shortName: option.shortName,
    code: option.code,
    curriculumKey: option.curriculumKey ?? GENERAL_LAW_CURRICULUM_KEY,
    themeKey: option.themeKey,
    configJson: option.configJson,
    examDate: null,
    onboardingCompleted: true,
    source: 'local',
    config: option.config,
  };
};
