import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  deleteMyPushSubscription,
  upsertPushSubscription
} from '../services/pushNotificationsApi';

const SERVICE_WORKER_READY_TIMEOUT_MS = 15000;

const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  return Notification.permission;
};

const base64UrlToUint8Array = (value: string) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }

  return output;
};

const waitForReadyServiceWorker = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service worker ez dago erabilgarri.');
  }

  let timeoutId = 0;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Service worker-a ez da garaiz prest jarri.'));
    }, SERVICE_WORKER_READY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

type UsePushReminderNotificationsParams = {
  user: User | null;
};

export const usePushReminderNotifications = ({
  user
}: UsePushReminderNotificationsParams) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission);
  const [subscribed, setSubscribed] = useState(false);

  const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() ?? '';
  const pushRemindersSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      window.isSecureContext &&
      !import.meta.env.DEV &&
      Boolean(vapidPublicKey) &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
    [vapidPublicKey]
  );

  const syncExistingSubscription = useCallback(async () => {
    if (!user || !pushRemindersSupported || permission !== 'granted') {
      setSubscribed(false);
      return false;
    }

    const registration = await waitForReadyServiceWorker();
    const existingSubscription = await registration.pushManager.getSubscription();
    if (!existingSubscription) {
      setSubscribed(false);
      return false;
    }

    await upsertPushSubscription(existingSubscription);
    setSubscribed(true);
    return true;
  }, [permission, pushRemindersSupported, user]);

  const requestReminderPermission = useCallback(async () => {
    if (!user || !pushRemindersSupported) return false;

    let nextPermission = getNotificationPermission();
    if (nextPermission === 'default') {
      nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
    }

    if (nextPermission !== 'granted') {
      setSubscribed(false);
      return false;
    }

    const registration = await waitForReadyServiceWorker();
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey)
      }));

    await upsertPushSubscription(subscription);
    setPermission('granted');
    setSubscribed(true);
    return true;
  }, [pushRemindersSupported, user, vapidPublicKey]);

  const disconnectPushReminders = useCallback(async () => {
    if (!pushRemindersSupported) {
      setSubscribed(false);
      return;
    }

    try {
      const registration = await waitForReadyServiceWorker();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await deleteMyPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
    } finally {
      setSubscribed(false);
    }
  }, [pushRemindersSupported]);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [user?.id]);

  useEffect(() => {
    if (!user || !pushRemindersSupported || getNotificationPermission() !== 'granted') {
      setSubscribed(false);
      return;
    }

    void syncExistingSubscription().catch((error) => {
      console.error('Could not sync push reminder subscription', error);
      setSubscribed(false);
    });
  }, [pushRemindersSupported, syncExistingSubscription, user]);

  return {
    canRequestReminderPermission: pushRemindersSupported && Boolean(user) && !subscribed,
    remindersEnabled: pushRemindersSupported && subscribed,
    reminderPermission: permission,
    requestReminderPermission,
    disconnectPushReminders
  };
};
