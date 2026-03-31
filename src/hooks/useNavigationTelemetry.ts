import { useEffect, useMemo, useRef } from 'react';
import { recordNavigation } from '../telemetry/telemetryClient';

type UseNavigationTelemetryOptions = {
  activeTab: string;
  isGenericPlayer: boolean;
  isGuest: boolean;
  view: string;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const getScreenTelemetryKey = ({
  activeTab,
  isGenericPlayer,
  isGuest,
  view,
}: UseNavigationTelemetryOptions) => {
  if (isGuest) return 'guest:home';
  if (isGenericPlayer) return `generic:${view}:${activeTab}`;
  return view === 'home' ? `dashboard:${activeTab}` : `session:${view}`;
};

export const useNavigationTelemetry = ({
  activeTab,
  isGenericPlayer,
  isGuest,
  view,
}: UseNavigationTelemetryOptions) => {
  const screenKey = useMemo(
    () =>
      getScreenTelemetryKey({
        activeTab,
        isGenericPlayer,
        isGuest,
        view,
      }),
    [activeTab, isGenericPlayer, isGuest, view],
  );

  const screenEnteredAtRef = useRef(now());
  const previousScreenRef = useRef<string | null>(null);

  useEffect(() => {
    const enteredAt = now();
    const previousScreen = previousScreenRef.current;

    if (previousScreen && previousScreen !== screenKey) {
      recordNavigation('screen_leave', {
        from: previousScreen,
        to: screenKey,
        durationMs: enteredAt - screenEnteredAtRef.current,
      });
    }

    recordNavigation('screen_enter', {
      screen: screenKey,
    });

    previousScreenRef.current = screenKey;
    screenEnteredAtRef.current = enteredAt;
  }, [screenKey]);

  useEffect(
    () => () => {
      if (!previousScreenRef.current) return;

      recordNavigation('screen_leave', {
        from: previousScreenRef.current,
        durationMs: now() - screenEnteredAtRef.current,
        reason: 'unmount',
      });
    },
    [],
  );
};
