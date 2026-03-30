/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision?: string | null;
    url: string;
  }>;
};

type ReminderNotificationPayload = {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

const DEFAULT_NOTIFICATION_ICON = '/minimal_dark_192.png';
const DEFAULT_NOTIFICATION_BADGE = '/minimal_dark_128.png';
const DEFAULT_NOTIFICATION_URL = '/';
const PRECACHE_BLOCKLIST = [
  /^assets\/AdminConsoleScreen-.*\.js$/,
  /^assets\/DashboardProfileTab-.*\.js$/,
  /^assets\/DashboardStatsTab-.*\.js$/,
  /^assets\/DashboardStudyTab-.*\.js$/,
  /^assets\/QuestionExplanation-.*\.js$/,
  /^assets\/practiceSessionStarterCommands-.*\.js$/,
  /^assets\/telemetryClient-.*\.js$/,
  /^assets\/webVitals-.*\.js$/,
  /^assets\/react-dom-.*\.js$/,
  /^assets\/supabase-.*\.js$/,
  /^minimal_dark_(512|1024)\.png$/
];

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(
  self.__WB_MANIFEST.filter(
    (entry) => !PRECACHE_BLOCKLIST.some((pattern) => pattern.test(entry.url))
  )
);

registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'quantia-scripts' })
);

registerRoute(
  ({ url, request }) => url.origin === self.location.origin && request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'quantia-styles' })
);

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin && request.destination === 'image',
  new CacheFirst({ cacheName: 'quantia-images' })
);

const parseReminderPayload = (raw: string | null): ReminderNotificationPayload => {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as ReminderNotificationPayload;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {
      body: raw
    };
  }
};

self.addEventListener('push', (event) => {
  const payload = parseReminderPayload(event.data?.text() ?? null);
  const title = payload.title?.trim() || 'Tienes preguntas pendientes';
  const body =
    payload.body?.trim() ||
    'Entra en Quantia y continua con tu siguiente bloque de practica.';
  const url =
    typeof payload.data?.url === 'string' && payload.data.url
      ? payload.data.url
      : payload.url || DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || 'quantia-practice-reminder',
      renotify: false,
      icon: payload.icon || DEFAULT_NOTIFICATION_ICON,
      badge: payload.badge || DEFAULT_NOTIFICATION_BADGE,
      data: {
        ...(payload.data ?? {}),
        url
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destination =
    typeof event.notification.data?.url === 'string' && event.notification.data.url
      ? event.notification.data.url
      : DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(destination);
          return client.focus();
        }
      }

      return self.clients.openWindow(destination);
    })
  );
});
