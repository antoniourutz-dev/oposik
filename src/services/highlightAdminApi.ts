import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';
import type {
  HighlightBlockType,
  HighlightOverrideMode,
  HighlightOverrideRecord,
  HighlightSpan,
} from '../domain/highlighting/highlightTypes';

const OVERRIDES_TABLE = 'question_highlight_overrides';
const CONTENT_TYPE_ORDER: Record<HighlightBlockType, number> = {
  question: 0,
  answer: 1,
  explanation: 2,
};

const getErrorMessage = (error: { message?: string | null }) =>
  String(error.message ?? 'No se ha podido completar la operacion.').trim();

const normalizeQuestionId = (questionId: number) => {
  if (!Number.isSafeInteger(questionId) || questionId <= 0) {
    throw new Error('questionId no es valido.');
  }
  return questionId;
};

const normalizeAnswerIndex = (
  contentType: HighlightBlockType,
  answerIndex?: number | null,
): number | null => {
  if (contentType !== 'answer') return null;
  if (answerIndex === null || answerIndex === undefined) {
    throw new Error('answerIndex es obligatorio cuando contentType es "answer".');
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0) {
    throw new Error('answerIndex debe ser un entero valido >= 0.');
  }
  return answerIndex;
};

const mapSpan = (value: unknown): HighlightSpan | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    start: Number(record.start ?? 0),
    end: Number(record.end ?? 0),
    category: String(record.category ?? '') as HighlightSpan['category'],
    score: Number(record.score ?? 0),
    colorToken: record.colorToken ? (String(record.colorToken) as HighlightSpan['colorToken']) : undefined,
    note: record.note ? String(record.note) : undefined,
  };
};

const mapOverrideRow = (value: Record<string, unknown>): HighlightOverrideRecord => ({
  id: String(value.id ?? ''),
  questionId: Number(value.question_id ?? 0),
  contentType: String(value.content_type ?? 'question') as HighlightBlockType,
  answerIndex:
    value.answer_index === null || value.answer_index === undefined
      ? null
      : Number(value.answer_index),
  mode: String(value.mode ?? 'manual') as HighlightOverrideMode,
  spans: Array.isArray(value.spans)
    ? value.spans.map(mapSpan).filter((span): span is HighlightSpan => Boolean(span))
    : [],
  version: Number(value.version ?? 1),
  isActive: Boolean(value.is_active),
  createdBy: String(value.created_by ?? ''),
  updatedBy: String(value.updated_by ?? ''),
  createdAt: String(value.created_at ?? ''),
  updatedAt: String(value.updated_at ?? ''),
});

const withBlockFilter = (
  query: {
    eq: (column: string, value: unknown) => any;
    is: (column: string, value: null) => any;
  },
  params: {
    questionId: number;
    contentType: HighlightBlockType;
    answerIndex?: number | null;
  },
) => {
  const { questionId, contentType } = params;
  const normalizedAnswerIndex = normalizeAnswerIndex(contentType, params.answerIndex);
  const baseQuery = (query.eq('question_id', normalizeQuestionId(questionId)) as any).eq(
    'content_type',
    contentType,
  ) as any;

  return normalizedAnswerIndex === null
    ? baseQuery.is('answer_index', null)
    : baseQuery.eq('answer_index', normalizedAnswerIndex);
};

const assertAdminUser = async (userId: string) => {
  const normalizedUserId = String(userId ?? '').trim();
  if (!normalizedUserId) {
    throw new Error('No hay usuario admin para guardar highlights.');
  }

  const { data, error } = await supabase
    .schema('app')
    .rpc('is_admin', { p_user_id: normalizedUserId });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!data) {
    throw new Error('Solo un admin puede editar highlights.');
  }
};

const insertOverride = async (input: {
  questionId: number;
  contentType: HighlightBlockType;
  answerIndex?: number | null;
  mode: HighlightOverrideMode;
  spans: HighlightSpan[];
  userId: string;
}) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_set_question_highlight_override', {
      p_question_id: normalizeQuestionId(input.questionId),
      p_content_type: input.contentType,
      p_answer_index: normalizeAnswerIndex(input.contentType, input.answerIndex),
      p_mode: input.mode,
      p_spans: input.mode === 'manual' ? input.spans : [],
    })
    .single();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return mapOverrideRow((data ?? {}) as Record<string, unknown>);
};

export const getQuestionHighlightOverrides = async (
  questionId: number,
): Promise<HighlightOverrideRecord[]> => {
  return trackAsyncOperation('highlightAdmin.getQuestionHighlightOverrides', async () => {
    const { data, error } = await supabase
      .schema('public')
      .from(OVERRIDES_TABLE)
      .select('*')
      .eq('question_id', normalizeQuestionId(questionId))
      .eq('is_active', true)
      .order('content_type', { ascending: true })
      .order('answer_index', { ascending: true, nullsFirst: true })
      .order('version', { ascending: false });

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return ((data ?? []) as Array<Record<string, unknown>>)
      .map(mapOverrideRow)
      .sort((left, right) => {
        const contentTypeOrder =
          CONTENT_TYPE_ORDER[left.contentType] - CONTENT_TYPE_ORDER[right.contentType];

        if (contentTypeOrder !== 0) {
          return contentTypeOrder;
        }

        return (left.answerIndex ?? -1) - (right.answerIndex ?? -1);
      });
  });
};

export const saveManualHighlightOverride = async (input: {
  questionId: number;
  contentType: HighlightBlockType;
  answerIndex?: number | null;
  spans: HighlightSpan[];
  userId: string;
}): Promise<HighlightOverrideRecord> => {
  return trackAsyncOperation('highlightAdmin.saveManualHighlightOverride', async () => {
    await assertAdminUser(input.userId);
    return insertOverride({
      ...input,
      mode: 'manual',
    });
  });
};

export const disableHighlightOverride = async (input: {
  questionId: number;
  contentType: HighlightBlockType;
  answerIndex?: number | null;
  userId: string;
}): Promise<HighlightOverrideRecord> => {
  return trackAsyncOperation('highlightAdmin.disableHighlightOverride', async () => {
    await assertAdminUser(input.userId);
    return insertOverride({
      ...input,
      mode: 'disabled',
      spans: [],
    });
  });
};

export const restoreAutomaticHighlights = async (input: {
  questionId: number;
  contentType: HighlightBlockType;
  answerIndex?: number | null;
  userId: string;
}): Promise<{ success: true }> => {
  return trackAsyncOperation('highlightAdmin.restoreAutomaticHighlights', async () => {
    await assertAdminUser(input.userId);
    const { error } = await supabase
      .schema('app')
      .rpc('admin_restore_question_highlight_automatic', {
        p_question_id: normalizeQuestionId(input.questionId),
        p_content_type: input.contentType,
        p_answer_index: normalizeAnswerIndex(input.contentType, input.answerIndex),
      });

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    return { success: true };
  });
};
