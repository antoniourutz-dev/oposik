import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ActivePracticeSession,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight,
} from '../practiceTypes';
import type { SessionStarterCommandResult } from './practiceSessionStarterCommands';

type UsePracticeSessionStartersOptions = {
  guestBlocksRemaining: number;
  guestBlocksUsed: number;
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
          });
        },
        emptyMessage: 'No se ha encontrado un bloque de preguntas para esa posicion.',
        fallbackErrorMessage: 'No se han podido cargar las preguntas.',
      });
    },
    [executeStarter, questionsCount, selectedQuestionScope],
  );

  const startRandomSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadRandomSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadRandomSessionCommand({
          questionScope: selectedQuestionScope,
        });
      },
      emptyMessage: 'No se ha podido construir una sesion aleatoria con el catalogo actual.',
      fallbackErrorMessage: 'No se han podido cargar preguntas aleatorias.',
    });
  }, [executeStarter, selectedQuestionScope]);

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
        });
      },
      emptyMessage: 'No se ha podido preparar el bloque invitado.',
      fallbackErrorMessage: 'No se ha podido cargar el bloque de invitado.',
    });
  }, [executeStarter, guestBlocksRemaining, guestBlocksUsed, setQuestionsError]);

  const startMixedSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadMixedSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadMixedSessionCommand({
          questionScope: selectedQuestionScope,
          recommendedBatchStartIndex,
          questionsCount,
        });
      },
      emptyMessage: 'No se ha podido construir una sesion adaptativa con el estado actual.',
      fallbackErrorMessage: 'No se ha podido preparar la sesion del dia.',
    });
  }, [executeStarter, questionsCount, recommendedBatchStartIndex, selectedQuestionScope]);

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
        });
      },
      emptyMessage: 'No se ha podido preparar un entrenamiento anti-trampas con el estado actual.',
      fallbackErrorMessage: 'No se ha podido preparar el entrenamiento anti-trampas.',
    });
  }, [executeStarter, selectedQuestionScope, weakQuestions]);

  const startSimulacroSession = useCallback(async () => {
    await executeStarter({
      command: async () => {
        const { loadSimulacroSessionCommand } = await import('./practiceSessionStarterCommands');
        return loadSimulacroSessionCommand({
          questionScope: selectedQuestionScope,
        });
      },
      emptyMessage: 'No se ha podido preparar el simulacro con el catalogo actual.',
      fallbackErrorMessage: 'No se ha podido preparar el simulacro.',
    });
  }, [executeStarter, selectedQuestionScope]);

  return {
    startAntiTrap: () => void startAntiTrapSession(),
    startFromBeginning: () => void startStandardSession(0),
    startGenericRecommended,
    startGuest: () => void startGuestSession(),
    startGuestSession,
    startMixed: () => void startMixedSession(),
    startRandom: () => void startRandomSession(),
    startSimulacro: () => void startSimulacroSession(),
    startStandardSession,
    startLawSession: (law: string) =>
      void executeStarter({
        command: async () => {
          const { loadLawSessionCommand } = await import('./practiceSessionStarterCommands');
          return loadLawSessionCommand({ law });
        },
        emptyMessage: `No se han encontrado preguntas para la ley: ${law}.`,
        fallbackErrorMessage: 'No se ha podido iniciar el entrenamiento por ley.',
      }),
  };
};
