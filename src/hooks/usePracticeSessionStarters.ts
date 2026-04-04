import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ActivePracticeSession,
  PracticeQuestionScope,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight,
} from '../practiceTypes';
import type { SessionStarterCommandResult } from './practiceSessionStarterCommands';

type UsePracticeSessionStartersOptions = {
  guestBlocksRemaining: number;
  guestBlocksUsed: number;
  curriculum: string;
  onGuestBlockConsumed: (nextBlockNumber: number) => void;
  questionsCount: number;
  recommendedBatchStartIndex: number;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  setLoadingQuestions: Dispatch<SetStateAction<boolean>>;
  setQuestionsError: Dispatch<SetStateAction<string | null>>;
  startSession: (nextSession: ActivePracticeSession | null) => void;
  weakQuestions: WeakQuestionInsight[];
};

type StarterExecutionOptions = {
  command: () => Promise<SessionStarterCommandResult>;
  emptyMessage: string;
  fallbackErrorMessage: string;
};

export const usePracticeSessionStarters = ({
  guestBlocksRemaining,
  guestBlocksUsed,
  curriculum,
  onGuestBlockConsumed,
  questionsCount,
  recommendedBatchStartIndex,
  selectedQuestionScope,
  setLoadingQuestions,
  setQuestionsError,
  startSession,
  weakQuestions,
}: UsePracticeSessionStartersOptions) => {
  const executeStarter = useCallback(
    async ({ command, emptyMessage, fallbackErrorMessage }: StarterExecutionOptions) => {
      setLoadingQuestions(true);
      setQuestionsError(null);

      try {
        const result = await command();
        if (!result.session) {
          setQuestionsError(emptyMessage);
          return;
        }

        if (typeof result.nextGuestBlockNumber === 'number') {
          onGuestBlockConsumed(result.nextGuestBlockNumber);
        }

        startSession(result.session);
      } catch (error) {
        setQuestionsError(error instanceof Error ? error.message : fallbackErrorMessage);
      } finally {
        setLoadingQuestions(false);
      }
    },
    [onGuestBlockConsumed, setLoadingQuestions, setQuestionsError, startSession],
  );

  const startStandardSession = useCallback(
    async (batchStartIndex: number, questionScope = selectedQuestionScope) => {
      await executeStarter({
        command: async () => {
        const { loadStandardSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadStandardSessionCommand({
          batchStartIndex,
          questionsCount,
          questionScope,
          curriculum,
        });
      },
        emptyMessage: 'No se ha encontrado un bloque de preguntas para esa posicion.',
        fallbackErrorMessage: 'No se han podido cargar las preguntas.',
      });
    },
    [curriculum, executeStarter, questionsCount, selectedQuestionScope],
  );

  const startRandomSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadRandomSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadRandomSessionCommand({
          questionScope: selectedQuestionScope,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido construir una sesion aleatoria con el catalogo actual.',
      fallbackErrorMessage: 'No se han podido cargar preguntas aleatorias.',
    });
  }, [curriculum, executeStarter, selectedQuestionScope]);

  const startQuickFiveSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadQuickFiveSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadQuickFiveSessionCommand({
          questionScope: selectedQuestionScope,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido preparar la partida rapida con el catalogo actual.',
      fallbackErrorMessage: 'No se ha podido iniciar la partida rapida.',
    });
  }, [curriculum, executeStarter, selectedQuestionScope]);

  const startGuestSession = useCallback(async () => {
    if (guestBlocksRemaining <= 0) {
      setQuestionsError('El acceso invitado ya ha consumido sus dos bloques de prueba.');
      return;
    }

    await executeStarter({
      command: async () => {
        const { loadGuestSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadGuestSessionCommand({
          guestBlocksUsed,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido preparar el bloque invitado.',
      fallbackErrorMessage: 'No se ha podido cargar el bloque de invitado.',
    });
  }, [curriculum, executeStarter, guestBlocksRemaining, guestBlocksUsed, setQuestionsError]);

  const startMixedSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadMixedSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadMixedSessionCommand({
          questionScope: selectedQuestionScope,
          recommendedBatchStartIndex,
          questionsCount,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido construir una sesion adaptativa con el estado actual.',
      fallbackErrorMessage: 'No se ha podido preparar la sesion del dia.',
    });
  }, [curriculum, executeStarter, questionsCount, recommendedBatchStartIndex, selectedQuestionScope]);

  const startGenericRecommended = useCallback(() => {
    void startMixedSession();
  }, [startMixedSession]);

  const startAntiTrapSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadAntiTrapSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadAntiTrapSessionCommand({
          questionScope: selectedQuestionScope,
          weakQuestions,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido preparar un entrenamiento anti-trampas con el estado actual.',
      fallbackErrorMessage: 'No se ha podido preparar el entrenamiento anti-trampas.',
    });
  }, [curriculum, executeStarter, selectedQuestionScope, weakQuestions]);

  const startSimulacroSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadSimulacroSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadSimulacroSessionCommand({
          questionScope: selectedQuestionScope,
          curriculum,
        });
      },
      emptyMessage: 'No se ha podido preparar el simulacro con el catalogo actual.',
      fallbackErrorMessage: 'No se ha podido preparar el simulacro.',
    });
  }, [curriculum, executeStarter, selectedQuestionScope]);

  const startWeakReviewSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadWeakReviewSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadWeakReviewSessionCommand({
          questionScope: selectedQuestionScope,
          weakQuestions,
          recommendedBatchStartIndex,
          questionsCount,
          curriculum,
        });
      },
      emptyMessage:
        'No hay preguntas de repaso prioritarias en este ambito. Prueba otro ambito o sesion aleatoria.',
      fallbackErrorMessage: 'No se ha podido cargar el repaso de falladas.',
    });
  }, [curriculum, executeStarter, selectedQuestionScope, weakQuestions]);

  return {
    startAntiTrap: () => void startAntiTrapSession(),
    startFromBeginning: () => void startStandardSession(0),
    startGenericRecommended,
    startGuest: () => void startGuestSession(),
    startGuestSession,
    startMixed: () => void startMixedSession(),
    startQuickFive: () => void startQuickFiveSession(),
    startRandom: () => void startRandomSession(),
    startSimulacro: () => void startSimulacroSession(),
    startWeakReview: () => void startWeakReviewSession(),
    startStandardSession,
    startLawSession: (law: string) =>
      void executeStarter({
        command: async () => {
        const { loadLawSessionCommand } = await import('./practiceSessionStarterCommands');
          return loadLawSessionCommand({ law, curriculum });
        },
        emptyMessage: `No se han encontrado preguntas para la ley: ${law}.`,
        fallbackErrorMessage: 'No se ha podido iniciar el entrenamiento por ley.',
      }),
    startTopicSession: (topic: string) =>
      void executeStarter({
        command: async () => {
        const { loadTopicSessionCommand } = await import('./practiceSessionStarterCommands');
          return loadTopicSessionCommand({ topic, curriculum });
        },
        emptyMessage: `No se han encontrado preguntas para el tema: ${topic}.`,
        fallbackErrorMessage: 'No se ha podido iniciar el entrenamiento por tema.',
      }),
    startCatalogReview: (scope: PracticeQuestionScope) =>
      void executeStarter({
      command: async () => {
          const { loadCatalogReviewSessionCommand } =
            await import('./practiceSessionStarterCommands');
          return loadCatalogReviewSessionCommand({ scope, curriculum });
        },
        emptyMessage: 'No hay preguntas en ese ámbito para analizar.',
        fallbackErrorMessage: 'No se ha podido cargar el análisis del banco.',
      }),
  };
};
