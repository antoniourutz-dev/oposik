import { initializeTelemetry, recordVital } from './telemetryClient';

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
  name: string;
};

const supportsEntryType = (entryType: string) =>
  typeof PerformanceObserver !== 'undefined' &&
  PerformanceObserver.supportedEntryTypes?.includes(entryType);

const rateFcp = (value: number) =>
  value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';

const rateLcp = (value: number) =>
  value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';

const rateCls = (value: number) =>
  value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';

const rateInp = (value: number) =>
  value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';

const rateTtfb = (value: number) =>
  value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';

let webVitalsInstalled = false;

export const installWebVitalsObservers = () => {
  if (
    typeof window === 'undefined' ||
    typeof PerformanceObserver === 'undefined' ||
    typeof performance === 'undefined' ||
    webVitalsInstalled
  ) {
    return;
  }

  webVitalsInstalled = true;
  initializeTelemetry();

  const navigationEntry = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navigationEntry) {
    recordVital('ttfb', navigationEntry.responseStart, rateTtfb(navigationEntry.responseStart), {
      navigationType: navigationEntry.type
    });
  }

  if (supportsEntryType('paint')) {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          recordVital('fcp', entry.startTime, rateFcp(entry.startTime));
          paintObserver.disconnect();
          break;
        }
      }
    });

    paintObserver.observe({ type: 'paint', buffered: true });
  }

  if (supportsEntryType('largest-contentful-paint')) {
    let lastLcpEntry: PerformanceEntry | null = null;
    let lcpReported = false;

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      lastLcpEntry = entries[entries.length - 1] ?? lastLcpEntry;
    });

    const reportLcp = () => {
      if (lcpReported || !lastLcpEntry) return;
      lcpReported = true;
      recordVital('lcp', lastLcpEntry.startTime, rateLcp(lastLcpEntry.startTime));
      lcpObserver.disconnect();
    };

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    window.addEventListener('pagehide', reportLcp, { once: true });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          reportLcp();
        }
      },
      { once: true }
    );
  }

  if (supportsEntryType('layout-shift')) {
    let clsValue = 0;
    let clsReported = false;

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });

    const reportCls = () => {
      if (clsReported) return;
      clsReported = true;
      recordVital('cls', clsValue, rateCls(clsValue));
      clsObserver.disconnect();
    };

    clsObserver.observe({ type: 'layout-shift', buffered: true });
    window.addEventListener('pagehide', reportCls, { once: true });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          reportCls();
        }
      },
      { once: true }
    );
  }

  if (supportsEntryType('event')) {
    let maxInp = 0;
    let inpTarget = '';
    let inpReported = false;

    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTimingEntry[]) {
        if (entry.duration > maxInp) {
          maxInp = entry.duration;
          inpTarget = entry.name;
        }
      }
    });

    const reportInp = () => {
      if (inpReported || maxInp === 0) return;
      inpReported = true;
      recordVital('inp', maxInp, rateInp(maxInp), {
        eventName: inpTarget
      });
      inpObserver.disconnect();
    };

    inpObserver.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 40
    } as PerformanceObserverInit);
    window.addEventListener('pagehide', reportInp, { once: true });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          reportInp();
        }
      },
      { once: true }
    );
  }
};
