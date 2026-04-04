import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { ActiveLearningContext } from '../../domain/learningContext/types';
import type {
  PracticeLawBlockPerformance,
  PracticeLawPerformance,
  PracticeCategoryRiskSummary,
  PracticeCoachPlan,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeSessionSummary,
} from '../../practiceTypes';
import type { HomePausedSessionSnapshot } from '../../components/dashboard/types';
import { buildCoachTwoLineMessageV2 } from '../../domain/coachCopyV2';
import { pickWeakestRecommendableBlock } from '../../domain/generalLaw';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState, SurfaceTension } from './surfaceTypes';

export type HomeActionMode =
  | 'review'
  | 'simulacro'
  | 'weak'
  | 'recovery'
  | 'push'
  | 'quick_five'
  | 'random'
  | 'mistakes';

export type HomeRecommendationTarget =
  | {
      kind: 'mode';
      value: HomeActionMode;
    }
  | {
      kind: 'law';
      lawId?: string;
      lawReference: string;
      lawShortTitle: string;
      trainingIntent?: string | null;
    }
  | {
      kind: 'law_block';
      lawId?: string;
      lawReference: string;
      lawShortTitle: string;
      trainingIntent?: string | null;
      blockId: string;
      blockTitle: string;
      trainingFocus?: string | null;
    };

export type HomeHeroRecommendation = {
  contextKind: 'opposition' | 'general_law';
  dominantState: SurfaceDominantState;
  eyebrow?: string;
  title: string;
  summary?: string;
  cta: string;
  recommendedTarget?: HomeRecommendationTarget;
};

export type HomeAdapterOutput = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  tension: SurfaceTension;
  hero: HomeHeroRecommendation;
  pausedSessionCard?: {
    remainingQuestions: number;
    progress: number;
    cta: string;
  };
  secondaryOption?: {
    target: HomeRecommendationTarget;
    title: string;
    summary: string;
    cta: string;
  };
  statsJustification?: {
    label: string;
    value?: string;
  };
};

const tensionByState: Record<SurfaceDominantState, SurfaceTension> = {
  backlog: 'medium',
  errors: 'medium',
  pressure: 'high',
  recovery: 'low',
  memory: 'low',
  growth: 'medium',
  gray_zone: 'low',
};

const primaryCtaByState: Record<SurfaceDominantState, string> = {
  backlog: 'Empezar sesion',
  errors: 'Corregir ahora',
  pressure: 'Hacer simulacro',
  recovery: 'Empieza suave',
  memory: 'Empezar',
  growth: 'Subir nivel',
  gray_zone: 'Empezar',
};

const shouldOfferQuickFive = (dominantState: SurfaceDominantState) =>
  dominantState === 'recovery' || dominantState === 'memory' || dominantState === 'gray_zone';

type CoachHeroPresentation = {
  eyebrow: string;
  headline: string;
  sub: string;
};

const clampLawRatio = (value: number | null | undefined) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? Number(value) : 0));

const lawDisplayName = (law: PracticeLawPerformance) =>
  law.shortTitle?.trim() || law.ley_referencia.trim();

const lawPendingConsolidation = (law: PracticeLawPerformance) =>
  Math.max(0, (law.questionCount ?? 0) - (law.consolidatedCount ?? 0));

const coachHeroPresentation = (heroMessage: ReturnType<typeof buildCoachTwoLineMessageV2>): CoachHeroPresentation => {
  const l1 = heroMessage.line1?.trim() ?? '';
  const l2 = heroMessage.line2?.trim() ?? '';
  const key = `${l1}\n${l2}`;

  const fallback: CoachHeroPresentation = {
    eyebrow: 'Recomendacion principal',
    headline: l1 || 'Tienes preguntas vencidas',
    sub: l2 || 'Hoy va mejor mezclar y consolidar tus conocimientos.',
  };

  const byExactPair: Record<string, CoachHeroPresentation> = {
    'Tienes preguntas vencidas\nHoy va mejor consolidar antes de seguir.': {
      eyebrow: 'Antes de seguir',
      headline: 'Consolidar antes de seguir',
      sub: 'Tienes preguntas vencidas.',
    },
    'Estás repitiendo errores\nCorrige el patrón antes de avanzar.': {
      eyebrow: 'Antes de avanzar',
      headline: 'Corrige el patrón',
      sub: 'Estás repitiendo errores.',
    },
    'Hoy toca entrenar examen\nTu nivel cae cuando sube la presión.': {
      eyebrow: 'Tu nivel cae',
      headline: 'Entrenar examen',
      sub: 'Cuando sube la presión.',
    },
    'Vuelve a entrar fácil\nUna sesión corta hoy ya cambia la dinámica.': {
      eyebrow: 'Sesión corta',
      headline: 'Vuelve a entrar fácil',
      sub: 'Una sesión corta hoy ya cambia la dinámica.',
    },
    'Estás listo para subir\nTu base aguanta; hoy puedes exigir más.': {
      eyebrow: 'Tu base aguanta',
      headline: 'Estás listo para subir',
      sub: 'Hoy puedes exigir más.',
    },
    'Hoy toca afinar\nVamos a lo seguro para fijar lo importante.': {
      eyebrow: 'Fijar lo importante',
      headline: 'Hoy toca afinar',
      sub: 'Vamos a lo seguro para fijar lo importante.',
    },
    'Hoy toca afinar\nVamos a lo seguro para generar señal.': {
      eyebrow: 'Generar señal',
      headline: 'Hoy toca afinar',
      sub: 'Vamos a lo seguro para generar señal.',
    },
  };

  return byExactPair[key] ?? fallback;
};

const sortLawsByNeed = (laws: PracticeLawPerformance[]) =>
  [...laws].sort((left, right) => {
    const pendingDiff = lawPendingConsolidation(right) - lawPendingConsolidation(left);
    if (pendingDiff !== 0) return pendingDiff;

    const accuracyDiff = clampLawRatio(left.accuracyRate) - clampLawRatio(right.accuracyRate);
    if (accuracyDiff !== 0) return accuracyDiff;

    const questionDiff = (right.questionCount ?? 0) - (left.questionCount ?? 0);
    if (questionDiff !== 0) return questionDiff;

    return lawDisplayName(left).localeCompare(lawDisplayName(right), 'es', { sensitivity: 'base' });
  });

const pickWeakestLaw = (laws: PracticeLawPerformance[]) =>
  [...laws].sort((left, right) => {
    const accuracyDiff = clampLawRatio(left.accuracyRate) - clampLawRatio(right.accuracyRate);
    if (accuracyDiff !== 0) return accuracyDiff;

    const questionDiff = (right.questionCount ?? 0) - (left.questionCount ?? 0);
    if (questionDiff !== 0) return questionDiff;

    return lawDisplayName(left).localeCompare(lawDisplayName(right), 'es', { sensitivity: 'base' });
  })[0] ?? null;

const pickBestAlternateLaw = (
  laws: PracticeLawPerformance[],
  excludeReference: string,
) =>
  sortLawsByNeed(laws).find((law) => law.ley_referencia !== excludeReference) ?? null;

const buildQuickFiveSecondaryOption = (
  contextKind: HomeHeroRecommendation['contextKind'],
): HomeAdapterOutput['secondaryOption'] => ({
  target: {
    kind: 'mode',
    value: 'quick_five',
  },
  title: 'Sin tiempo, haz 5',
  summary:
    contextKind === 'general_law'
      ? 'Bloque corto para no salir del hilo legal hoy. La sesion fuerte sigue siendo la completa.'
      : 'Entrada minima para no dejar el dia en blanco. La sesion fuerte sigue siendo la de 20.',
  cta: 'Hacer 5',
});

const buildGeneralLawPrimaryRecommendation = ({
  dominantState,
  lawBreakdown,
}: {
  dominantState: SurfaceDominantState;
  lawBreakdown: PracticeLawPerformance[];
}): HomeHeroRecommendation => {
  const laws = lawBreakdown.filter((law) => (law.questionCount ?? 0) > 0);
  const strongestNeedLaw = sortLawsByNeed(laws)[0] ?? null;
  const weakestLaw = pickWeakestLaw(laws);
  const weakestLawWithBlock =
    laws
      .map((law) => ({
        law,
        block: pickWeakestRecommendableBlock(law.blocks),
      }))
      .filter(
        (
          item,
        ): item is {
          law: PracticeLawPerformance;
          block: PracticeLawBlockPerformance;
        } => Boolean(item.block),
      )
      .sort((left, right) => {
        const accuracyDiff =
          clampLawRatio(left.block.accuracyRate) - clampLawRatio(right.block.accuracyRate);
        if (accuracyDiff !== 0) return accuracyDiff;

        return (right.block.questionCount ?? 0) - (left.block.questionCount ?? 0);
      })[0] ?? null;

  if (!laws.length) {
    return {
      contextKind: 'general_law',
      dominantState,
      eyebrow: 'Foco legal del dia',
      title: 'Hoy conviene volver a una base legal concreta',
      summary: 'Entra en una ley con masa suficiente y deja que el sistema vuelva a darte señal.',
      cta: 'Entrar en la ley',
      recommendedTarget: {
        kind: 'mode',
        value: 'random',
      },
    };
  }

  if ((dominantState === 'errors' || dominantState === 'pressure') && weakestLawWithBlock) {
    const { law, block } = weakestLawWithBlock;
    return {
      contextKind: 'general_law',
      dominantState,
      eyebrow:
        dominantState === 'pressure'
          ? 'Precision normativa'
          : 'Patron legal a corregir',
      title: `El bloqueo esta en ${block.title}`,
      summary:
        block.trainingFocus?.trim() ||
        law.trainingIntent?.trim() ||
        `${lawDisplayName(law)} concentra ahora la señal mas fragil del workspace legal.`,
      cta: dominantState === 'pressure' ? 'Reforzar ahora' : 'Corregir bloque',
      recommendedTarget: {
        kind: 'law_block',
        lawId: law.lawId,
        lawReference: law.ley_referencia,
        lawShortTitle: lawDisplayName(law),
        trainingIntent: law.trainingIntent,
        blockId: block.blockId,
        blockTitle: block.title,
        trainingFocus: block.trainingFocus,
      },
    };
  }

  const law = (dominantState === 'errors' || dominantState === 'pressure' ? weakestLaw : strongestNeedLaw) ?? laws[0]!;
  const label = lawDisplayName(law);

  if (dominantState === 'recovery') {
    return {
      contextKind: 'general_law',
      dominantState,
      eyebrow: 'Reenganche claro',
      title: `Hoy conviene retomar ${label}`,
      summary:
        law.trainingIntent?.trim() ||
        'Vuelve por una ley concreta para recuperar ritmo sin ruido ni dispersión.',
      cta: 'Entrar en la ley',
      recommendedTarget: {
        kind: 'law',
        lawId: law.lawId,
        lawReference: law.ley_referencia,
        lawShortTitle: label,
        trainingIntent: law.trainingIntent,
      },
    };
  }

  if (dominantState === 'growth') {
    return {
      contextKind: 'general_law',
      dominantState,
      eyebrow: 'Base legal solida',
      title: `Tu siguiente mejora esta en ${label}`,
      summary:
        law.trainingIntent?.trim() ||
        'La base ya aguanta; ahora conviene afinar precisión sin salir del territorio correcto.',
      cta: 'Subir precision',
      recommendedTarget: {
        kind: 'law',
        lawId: law.lawId,
        lawReference: law.ley_referencia,
        lawShortTitle: label,
        trainingIntent: law.trainingIntent,
      },
    };
  }

  if (dominantState === 'memory' || dominantState === 'backlog') {
    return {
      contextKind: 'general_law',
      dominantState,
      eyebrow: 'Base legal del dia',
      title: `Sigue consolidando ${label}`,
      summary:
        law.trainingIntent?.trim() ||
        'Todavia queda base util por fijar aqui antes de abrir otra ley o dispersar la lectura.',
      cta: 'Seguir consolidando',
      recommendedTarget: {
        kind: 'law',
        lawId: law.lawId,
        lawReference: law.ley_referencia,
        lawShortTitle: label,
        trainingIntent: law.trainingIntent,
      },
    };
  }

  return {
    contextKind: 'general_law',
    dominantState,
    eyebrow: 'Foco legal del dia',
    title: `Repasa base en ${label}`,
    summary:
      law.trainingIntent?.trim() ||
      'Necesitamos una señal mas nitida. Esta ley es el mejor territorio para volver a leer con precisión.',
    cta: 'Repasar base',
    recommendedTarget: {
      kind: 'law',
      lawId: law.lawId,
      lawReference: law.ley_referencia,
      lawShortTitle: label,
      trainingIntent: law.trainingIntent,
    },
  };
};

export function buildHomeAdapterOutput(input: {
  planV2: CoachPlanV2;
  coachPlan: PracticeCoachPlan;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  recentSessions?: PracticeSessionSummary[] | null;
  homePausedSession?: HomePausedSessionSnapshot | null;
  streakDays: number;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  activeLearningContext?: ActiveLearningContext | null;
}): HomeAdapterOutput {
  const {
    planV2,
    coachPlan: _coachPlan,
    learningDashboardV2,
    pressureInsightsV2,
    homePausedSession,
    streakDays,
    weakCategories,
    activeLearningContext,
  } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    streakDays,
  });

  const contextConfig = activeLearningContext?.config;
  const contextKind = activeLearningContext?.contextType ?? 'opposition';
  const supportsExamMode = contextConfig?.capabilities.supportsExamMode ?? true;
  const supportsPressureTraining =
    contextConfig?.capabilities.supportsPressureTraining ?? true;

  const heroMessage = buildCoachTwoLineMessageV2({
    planV2,
    dominantState,
  });

  const tension = tensionByState[dominantState];
  const heroCta =
    dominantState === 'pressure' && !supportsPressureTraining
      ? contextConfig?.coachOverrides.pressurePrimaryCta ?? 'Practicar bloque'
      : primaryCtaByState[dominantState];

  const oppositionHeroPresentation = coachHeroPresentation(heroMessage);

  const hasPausedSession =
    homePausedSession != null &&
    homePausedSession.totalQuestions > 0 &&
    homePausedSession.currentQuestionIndex < homePausedSession.totalQuestions;

  const remainingQuestions = hasPausedSession
    ? Math.max(0, homePausedSession.totalQuestions - homePausedSession.currentQuestionIndex)
    : 0;

  const progress =
    hasPausedSession && homePausedSession.totalQuestions > 0
      ? Math.round((homePausedSession.currentQuestionIndex / homePausedSession.totalQuestions) * 100)
      : 0;

  const pausedSessionCard = hasPausedSession
    ? {
        remainingQuestions,
        progress,
        cta: 'Continuar sesion',
      }
    : undefined;

  const oppositionHero: HomeHeroRecommendation = {
    contextKind: 'opposition',
    dominantState,
    eyebrow: oppositionHeroPresentation.eyebrow,
    title: oppositionHeroPresentation.headline,
    summary: oppositionHeroPresentation.sub,
    cta: heroCta,
    recommendedTarget: {
      kind: 'mode',
      value:
        dominantState === 'pressure'
          ? 'simulacro'
          : dominantState === 'errors' || dominantState === 'backlog'
            ? 'review'
            : dominantState === 'growth'
              ? 'push'
              : dominantState === 'recovery'
                ? 'recovery'
                : 'weak',
    },
  };

  const generalLawHero = buildGeneralLawPrimaryRecommendation({
    dominantState,
    lawBreakdown: learningDashboardV2?.lawBreakdown ?? [],
  });

  const secondaryOption: HomeAdapterOutput['secondaryOption'] =
    contextKind === 'general_law'
      ? (() => {
          if (shouldOfferQuickFive(dominantState)) {
            return buildQuickFiveSecondaryOption('general_law');
          }

          const primaryLawReference =
            generalLawHero.recommendedTarget?.kind === 'law' ||
            generalLawHero.recommendedTarget?.kind === 'law_block'
              ? generalLawHero.recommendedTarget.lawReference
              : null;
          const alternateLaw =
            primaryLawReference && learningDashboardV2?.lawBreakdown?.length
              ? pickBestAlternateLaw(learningDashboardV2.lawBreakdown, primaryLawReference)
              : null;

          if (alternateLaw) {
            return {
              target: {
                kind: 'law',
                lawId: alternateLaw.lawId,
                lawReference: alternateLaw.ley_referencia,
                lawShortTitle: lawDisplayName(alternateLaw),
                trainingIntent: alternateLaw.trainingIntent,
              },
              title: lawDisplayName(alternateLaw),
              summary:
                alternateLaw.trainingIntent?.trim() ||
                'Alternativa limpia si prefieres cambiar de territorio sin salir del workspace legal.',
              cta: 'Entrar en la ley',
            };
          }

          return {
            target: {
              kind: 'mode',
              value: 'mistakes',
            },
            title: 'Repaso de falladas',
            summary: 'Si no quieres entrar en una ley concreta, limpia errores recientes sin salir del foco legal.',
            cta: 'Repasar base',
          };
        })()
      : shouldOfferQuickFive(dominantState)
        ? buildQuickFiveSecondaryOption('opposition')
      : dominantState === 'pressure'
        ? {
            target: {
              kind: 'mode',
              value: 'mistakes',
            },
            title:
              supportsPressureTraining
                ? 'Falladas'
                : contextConfig?.coachOverrides.pressureSecondaryTitle ?? 'Bloque aleatorio',
            summary:
              supportsPressureTraining
                ? 'Si hoy no toca presion, limpia errores rapido.'
                : contextConfig?.coachOverrides.pressureSecondarySummary ??
                  'Si no toca intensidad, vuelve a la ley con una tanda limpia.',
            cta:
              supportsPressureTraining
                ? 'Repasar falladas'
                : contextConfig?.coachOverrides.pressureSecondaryCta ?? 'Practicar ahora',
          }
        : dominantState === 'errors'
          ? {
              target: {
                kind: 'mode',
                value: 'random',
              },
              title: 'Aleatoria',
              summary: 'Si te saturas, genera senal con variedad.',
              cta: 'Hacer una sesion',
            }
          : dominantState === 'backlog'
            ? {
                target: {
                  kind: 'mode',
                  value: 'mistakes',
                },
                title: 'Falladas',
                summary: 'Alternativa corta para consolidar.',
                cta: 'Repasar falladas',
              }
            : dominantState === 'growth'
              ? supportsExamMode
                ? {
                    target: {
                      kind: 'mode',
                      value: 'simulacro',
                    },
                    title: 'Simulacro',
                    summary: 'Si te ves fuerte, prueba presion real.',
                    cta: 'Entrenar examen',
                  }
                : {
                    target: {
                      kind: 'mode',
                      value: 'random',
                    },
                    title: 'Bloque aleatorio',
                    summary: 'Si la base responde, mete variedad sin perder foco.',
                    cta: 'Practicar bloque',
                  }
              : {
                  target: {
                    kind: 'mode',
                    value: 'random',
                  },
                  title: 'Aleatoria',
                  summary: 'Sesion sencilla para mantener ritmo.',
                  cta: 'Empezar',
                };

  const statsJustification =
    dominantState === 'backlog'
      ? { label: 'Senal', value: 'repasos vencidos' }
      : dominantState === 'pressure'
        ? {
            label: 'Senal',
            value: supportsPressureTraining ? 'bajo presion' : 'lectura acelerada',
          }
        : dominantState === 'errors'
          ? { label: 'Senal', value: 'errores repetidos' }
          : dominantState === 'recovery'
            ? { label: 'Senal', value: 'constancia' }
            : dominantState === 'growth'
              ? { label: 'Senal', value: 'base solida' }
              : undefined;

  return {
    dominantState,
    tone: planV2.tone,
    tension,
    hero:
      contextKind === 'general_law'
        ? {
            ...generalLawHero,
            eyebrow:
              generalLawHero.eyebrow ?? contextConfig?.copyDictionary.homeHeroEyebrow ?? 'Foco legal del dia',
            cta: generalLawHero.cta,
          }
        : oppositionHero,
    pausedSessionCard,
    secondaryOption,
    statsJustification,
  };
}
