import React, { Profiler, useCallback, useEffect, useRef } from 'react';
import { recordRender, type TelemetryMeta } from './telemetryClient';

type ScreenTelemetryBoundaryProps = {
  children: React.ReactNode;
  meta?: TelemetryMeta;
  screen: string;
};

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const ScreenTelemetryBoundary: React.FC<ScreenTelemetryBoundaryProps> = ({
  children,
  meta,
  screen
}) => {
  const mountedAtRef = useRef(now());
  const commitCountRef = useRef(0);
  const metaRef = useRef<TelemetryMeta | undefined>(meta);

  metaRef.current = meta;

  useEffect(() => {
    mountedAtRef.current = now();
    commitCountRef.current = 0;

    if (typeof window === 'undefined') return undefined;

    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        recordRender('screen_ready', {
          durationMs: now() - mountedAtRef.current,
          meta: {
            screen,
            ...metaRef.current
          }
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [screen]);

  const handleRender = useCallback<React.ProfilerOnRenderCallback>(
    (_id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      commitCountRef.current += 1;

      recordRender('react_profiler_commit', {
        durationMs: actualDuration,
        meta: {
          screen,
          phase,
          baseDuration,
          startTime,
          commitTime,
          commitCount: commitCountRef.current,
          sinceMountMs: commitTime - mountedAtRef.current,
          ...metaRef.current
        }
      });
    },
    [screen]
  );

  return (
    <Profiler id={screen} onRender={handleRender}>
      {children}
    </Profiler>
  );
};

export default ScreenTelemetryBoundary;
