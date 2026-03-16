/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

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

const DEFAULT_NOTIFICATION_ICON = '/korrika_icon_set/icon-192x192.png';
const DEFAULT_NOTIFICATION_BADGE = '/korrika_icon_set/icon-128x128.png';
const DEFAULT_NOTIFICATION_URL = '/';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
  const title = payload.title?.trim() || 'KORRIKA zure zain dago';
  const body =
    payload.body?.trim() ||
    'Oraindik ez duzu gaurko saioa egin. Zatoz eta ekin KORRIKAren erronkari.';
  const url =
    typeof payload.data?.url === 'string' && payload.data.url
      ? payload.data.url
      : payload.url || DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || 'korrika-daily-reminder',
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
