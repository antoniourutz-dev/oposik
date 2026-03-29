import { useEffect, useRef } from 'react';
import { recordRender } from '../telemetry/telemetryClient';

export function useQuizTelemetry(questionId: string | number) {
  const startTime = useRef<number>(performance.now());
  const interactionCount = useRef<number>(0);
  const firstInteractionTime = useRef<number | null>(null);
  const scrollDepth = useRef<number>(0);

  useEffect(() => {
    // Reset on question change
    startTime.current = performance.now();
    interactionCount.current = 0;
    firstInteractionTime.current = null;
    scrollDepth.current = 0;

    const handleScroll = () => {
      const depth = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      scrollDepth.current = Math.max(scrollDepth.current, depth / total);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [questionId]);

  const recordInteraction = () => {
    interactionCount.current += 1;
    if (firstInteractionTime.current === null) {
      firstInteractionTime.current = performance.now() - startTime.current;
    }
  };

  const flushQuizTelemetry = (outcome: 'answered' | 'skipped' | 'timeout', metadata?: Record<string, any>) => {
    const totalDuration = performance.now() - startTime.current;
    
    recordRender('quiz_question_session', {
      durationMs: totalDuration,
      status: outcome === 'answered' ? 'success' : 'success', // 'info' is not a status, so we use success for non-error paths
      severity: outcome === 'answered' ? 'info' : 'warning',
      meta: {
        questionId,
        outcome,
        timeToFirstAction: firstInteractionTime.current,
        interactionCount: interactionCount.current,
        maxScrollDepth: Math.round(scrollDepth.current * 100) / 100,
        isDoubtful: interactionCount.current > 1,
        ...metadata
      }
    });
  };

  return {
    recordInteraction,
    flushQuizTelemetry
  };
}
