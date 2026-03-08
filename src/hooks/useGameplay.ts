import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { useAppStore } from '../store/useAppStore';
import { GameState, PlayMode, Player, Question, UserAnswer, QuizData, DailyProgress } from '../types';
import { shuffle, pickRandomItems, getUserProgressStorageKey } from '../utils/helpers';
import { QUESTIONS_PER_DAY, DAYS_COUNT } from '../utils/constants';

export const useGameplay = (
    userDisplayName: string,
    isAdmin: boolean,
    nextAvailableDay: number
) => {
    const {
        user, playMode, dayIndex, quizData, activeQuestions, players, currentPlayerIdx,
        currentQuestionIdx, sequentialSimulationActive, sequentialSimulationProgress, isSimulationRun,
        setDailyPlayLockMessage, setReviewDayIndex, setIsSimulationRun,
        setPlayMode, setDayIndex, setActiveQuestions, setPlayers, setCurrentPlayerIdx,
        setCurrentQuestionIdx, setGameState, fetchLeaderboards, fetchUserDailyPlays,
        progress, setProgress, setSequentialSimulationProgress, setSequentialSimulationDay
    } = useAppStore();

    const [validatingDailyStart, setValidatingDailyStart] = useState(false);

    const generateQuestions = useCallback((mode: PlayMode, idx: number) => {
        if (quizData.length === 0) return [];

        if (mode === 'RANDOM') {
            const questions: Question[] = [];
            quizData.forEach((category: QuizData) => {
                const sampled = pickRandomItems<Question>(category.preguntas as Question[], 2);
                const picked = sampled.map((q: Question) => ({
                    id: q.id,
                    pregunta: q.pregunta,
                    opciones: q.opciones,
                    respuesta_correcta: q.respuesta_correcta,
                    categoryName: category.capitulo
                }));
                questions.push(...picked);
            });
            return shuffle(questions);
        } else {
            const questions: Question[] = [];
            quizData.forEach((category: QuizData) => {
                const q1 = category.preguntas[idx * 2] as Question | undefined;
                const q2 = category.preguntas[idx * 2 + 1] as Question | undefined;
                if (q1) {
                    questions.push({
                        id: q1.id,
                        pregunta: q1.pregunta,
                        opciones: q1.opciones,
                        respuesta_correcta: q1.respuesta_correcta,
                        categoryName: category.capitulo
                    });
                }
                if (q2) {
                    questions.push({
                        id: q2.id,
                        pregunta: q2.pregunta,
                        opciones: q2.opciones,
                        respuesta_correcta: q2.respuesta_correcta,
                        categoryName: category.capitulo
                    });
                }
            });
            return questions.slice(0, QUESTIONS_PER_DAY);
        }
    }, [quizData]);

    const hasPlayedDailyOnServer = useCallback(async (targetDayIndex: number) => {
        if (!user) return false;

        const { data, error } = await supabase
            .from('game_results')
            .select('day_index')
            .eq('user_id', user.id)
            .eq('play_mode', 'DAILY')
            .eq('day_index', targetDayIndex)
            .limit(1);

        if (error) {
            console.error('Error checking daily play lock:', error);
            return false;
        }

        return (data?.length ?? 0) > 0;
    }, [user]);

    const persistGameResults = async (finalPlayers: Player[], currentDayIndex: number, currentPlayMode: PlayMode) => {
        if (!user) return;

        if (currentPlayMode === 'DAILY') {
            const alreadyPlayed = await hasPlayedDailyOnServer(currentDayIndex);
            if (alreadyPlayed) {
                setDailyPlayLockMessage(`${currentDayIndex + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
                return;
            }
        }

        const playedAt = new Date().toISOString();
        const rows = finalPlayers.map((player) => {
            const totalQuestions = player.answers.length;
            const correctAnswers = player.score;
            const incorrectAnswers = totalQuestions - correctAnswers;

            return {
                user_id: user.id,
                user_email: user.email ?? null,
                player_name: player.name,
                play_mode: currentPlayMode,
                day_index: currentPlayMode === 'DAILY' ? currentDayIndex : null,
                total_questions: totalQuestions,
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers,
                answers: player.answers.map((answer) => ({
                    question_id: answer.question.id,
                    question_text: answer.question.pregunta,
                    category: answer.question.categoryName ?? null,
                    selected_option_key: answer.selectedOption,
                    selected_option_text: answer.selectedOption ? answer.question.opciones[answer.selectedOption] : null,
                    correct_option_key: answer.question.respuesta_correcta,
                    correct_option_text: answer.question.opciones[answer.question.respuesta_correcta],
                    is_correct: answer.isCorrect
                })),
                played_at: playedAt
            };
        });

        const { error } = await supabase.from('game_results').insert(rows);
        if (error) {
            if ((error as any).code === '23505' && currentPlayMode === 'DAILY') {
                setDailyPlayLockMessage(`${currentDayIndex + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
            }
            console.error("Error saving game results:", error);
        }
    };

    const finishGame = async (finalPlayers: Player[], currentDayIndex: number, currentPlayMode: PlayMode) => {
        const isMulti = finalPlayers.length > 1;
        const finalScore = isMulti ? Math.max(...finalPlayers.map(p => p.score)) : finalPlayers[0].score;

        if (currentPlayMode === 'DAILY' && sequentialSimulationActive) {
            const newDailyProgress: DailyProgress = {
                dayIndex: currentDayIndex,
                score: finalScore,
                completed: true,
                date: new Date().toISOString(),
                answers: finalPlayers[0].answers,
                players: isMulti ? finalPlayers : undefined
            };

            const updatedSimProgress = [...sequentialSimulationProgress];
            updatedSimProgress[currentDayIndex] = newDailyProgress;
            setSequentialSimulationProgress(updatedSimProgress);
        } else if (currentPlayMode === 'DAILY' && !isSimulationRun) {
            const newDailyProgress: DailyProgress = {
                dayIndex: currentDayIndex,
                score: finalScore,
                completed: true,
                date: new Date().toISOString(),
                answers: finalPlayers[0].answers,
                players: isMulti ? finalPlayers : undefined
            };

            const updatedProgress = [...progress];
            updatedProgress[currentDayIndex] = newDailyProgress;
            setProgress(updatedProgress);
            if (user?.id) {
                localStorage.setItem(getUserProgressStorageKey(user.id), JSON.stringify(updatedProgress));
            }
        }

        if (!isSimulationRun && !sequentialSimulationActive) {
            await persistGameResults(finalPlayers, currentDayIndex, currentPlayMode);
            await fetchLeaderboards(true);
            await fetchUserDailyPlays(undefined, true);
        }

        setReviewDayIndex(null);
        if (sequentialSimulationActive) {
            setSequentialSimulationDay((prev) => Math.min(prev + 1, DAYS_COUNT));
            setGameState(GameState.HOME);
            return;
        }
        setGameState(isMulti ? GameState.RANKING : GameState.RESULTS);
    };

    const handleNextQuestion = useCallback((selectedOption: string | null) => {
        if (activeQuestions.length === 0) return;

        const q = activeQuestions[currentQuestionIdx];
        const isCorrect = selectedOption === q.respuesta_correcta;
        const newAnswer: UserAnswer = { question: q, selectedOption, isCorrect };
        const updatedPlayers = players.map((player, idx) => {
            if (idx !== currentPlayerIdx) return player;
            return {
                ...player,
                score: player.score + (isCorrect ? 1 : 0),
                answers: [...player.answers, newAnswer]
            };
        });
        setPlayers(updatedPlayers);

        if (currentQuestionIdx < activeQuestions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
        } else {
            if (currentPlayerIdx < players.length - 1) {
                setGameState(GameState.TURN_TRANSITION);
            } else {
                void finishGame(updatedPlayers, dayIndex, playMode);
            }
        }
    }, [currentQuestionIdx, activeQuestions, players, currentPlayerIdx, dayIndex, playMode]);

    const handleCountdownComplete = useCallback(() => {
        setGameState(GameState.QUIZ);
    }, [setGameState]);

    const initGame = useCallback(async (mode: 'SOLO' | 'COMP', type: PlayMode) => {
        const idx = type === 'DAILY' ? nextAvailableDay : 0;
        if (type === 'DAILY' && idx < 0) return;

        setDailyPlayLockMessage(null);

        if (type === 'DAILY' && !isSimulationRun && !sequentialSimulationActive) {
            setValidatingDailyStart(true);
            try {
                const alreadyPlayed = await hasPlayedDailyOnServer(idx);
                if (alreadyPlayed) {
                    setDailyPlayLockMessage(`${idx + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
                    await fetchLeaderboards(true);
                    await fetchUserDailyPlays(undefined, true);
                    return;
                }
            } finally {
                setValidatingDailyStart(false);
            }
        }

        setReviewDayIndex(null);
        setIsSimulationRun(sequentialSimulationActive ? type === 'DAILY' : false);
        setPlayMode(type);
        setDayIndex(idx);
        const qs = generateQuestions(type, idx);
        setActiveQuestions(qs);

        if (mode === 'SOLO') {
            const p: Player = { name: userDisplayName || 'GONBIDATUA', score: 0, answers: [] };
            setPlayers([p]);
            setCurrentPlayerIdx(0);
            setCurrentQuestionIdx(0);
            setGameState(GameState.COUNTDOWN);
        } else {
            setGameState(GameState.PLAYER_SETUP);
        }
    }, [
        nextAvailableDay,
        isSimulationRun,
        sequentialSimulationActive,
        hasPlayedDailyOnServer,
        fetchLeaderboards,
        fetchUserDailyPlays,
        generateQuestions,
        userDisplayName,
        setDailyPlayLockMessage,
        setValidatingDailyStart,
        setReviewDayIndex,
        setIsSimulationRun,
        setPlayMode,
        setDayIndex,
        setActiveQuestions,
        setPlayers,
        setCurrentPlayerIdx,
        setCurrentQuestionIdx,
        setGameState
    ]);

    return {
        initGame,
        handleNextQuestion,
        handleCountdownComplete,
        generateQuestions,
        finishGame,
        validatingDailyStart
    };
};
