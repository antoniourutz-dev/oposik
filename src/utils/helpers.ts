import { StoredAnswerRow } from '../services/korrikaApi';
import { UserAnswer } from '../types';
import { PROGRESS_STORAGE_PREFIX } from './constants';

export const getLocalDateKey = (dateInput?: string | Date) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export const getUserProgressStorageKey = (userId: string) => `${PROGRESS_STORAGE_PREFIX}_${userId}`;

export const normalizeOptionKey = (value: string | null) => {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    return normalized || null;
};

export const mapStoredAnswersToUserAnswers = (storedAnswers: StoredAnswerRow[]): UserAnswer[] =>
    storedAnswers.map((answer, idx) => {
        const selectedKey = normalizeOptionKey(answer.selected_option_key);
        const correctKey = normalizeOptionKey(answer.correct_option_key) ?? selectedKey ?? 'a';
        const selectedText = answer.selected_option_text?.trim() || 'Erantzuna';
        const correctText = answer.correct_option_text?.trim() || selectedText || 'Erantzun zuzena';
        const options: Record<string, string> = { [correctKey]: correctText };

        if (selectedKey) {
            options[selectedKey] = selectedText;
        }

        const inferredCorrect = selectedKey !== null && selectedKey === correctKey;
        const questionId =
            typeof answer.question_id === 'number' && Number.isFinite(answer.question_id)
                ? answer.question_id
                : 900000 + idx;

        return {
            question: {
                id: questionId,
                pregunta: answer.question_text?.trim() || `Galdera ${idx + 1}`,
                opciones: options,
                respuesta_correcta: correctKey,
                categoryName: answer.category?.trim() || undefined
            },
            selectedOption: selectedKey,
            isCorrect: typeof answer.is_correct === 'boolean' ? answer.is_correct : inferredCorrect
        };
    });

export const shuffle = <T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

export const pickRandomItems = <T,>(items: T[], count: number) => {
    if (count <= 0 || items.length === 0) return [];

    const copy = [...items];
    const limit = Math.min(count, copy.length);
    for (let i = 0; i < limit; i += 1) {
        const j = i + Math.floor(Math.random() * (copy.length - i));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, limit);
};
