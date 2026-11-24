import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[Push] Service worker registration failed:', err);
    return null;
  }
}

export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

export async function subscribeToPush(): Promise<{
  success: boolean;
  error?: string;
  permission?: NotificationPermission;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser' };
  }

  try {
    // 1. Request Notification permission from user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, permission, error: 'Permission not granted' };
    }

    // 2. Fetch VAPID public key from backend or env
    let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidKey) {
      const keyRes = await api.get('/notifications/push/public-key');
      vapidKey = keyRes.data?.data?.publicKey;
    }

    if (!vapidKey) {
      return { success: false, error: 'VAPID public key not configured on server' };
    }

    // 3. Register service worker and subscribe to PushManager
    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: 'Failed to register service worker' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'Failed to extract push subscription keys' };
    }

    // 4. Send subscription to backend
    await api.post('/notifications/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
    });

    return { success: true, permission: 'granted' };
  } catch (err: any) {
    console.error('[Push] Subscribe error:', err);
    return {
      success: false,
      error: err.response?.data?.message || err.message || 'Failed to subscribe to push',
    };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await api.post('/notifications/push/unsubscribe', { endpoint }).catch(() => {});
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
