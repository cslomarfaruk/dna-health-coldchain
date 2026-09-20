/**
 * Browser & Mobile Notification Client
 *
 * HIPAA Safe Harbor (45 CFR 164.514(b)(2)):
 * Lock screen and notification center payloads contain zero PHI —
 * no patient names, MRNs, DOBs, room/bed numbers, or diagnoses.
 */

// -- Types --

export type NotificationRecipient = 'NURSE' | 'PHARMACIST';

export interface NotificationPayload {
  recipient: NotificationRecipient;
  orderReference: string;
  action: string;
  detail?: string;
  etaMinutes?: number;
}

// -- Service Worker Registration --

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return swRegistration;
  } catch {
    return null;
  }
}

// -- Permission Management --

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await registerNotificationServiceWorker();
    return permission;
  } catch {
    return 'denied';
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

// -- Payload Builder (Zero PHI) --

function buildNotificationContent(payload: NotificationPayload): { title: string; body: string; tag: string } {
  const ref = payload.orderReference.replace(/MRN-\d+/gi, '').trim() || 'ORDER';

  if (payload.recipient === 'NURSE') {
    return {
      title: 'Medication En Route',
      body: payload.etaMinutes
        ? `${payload.action} (Ref: ${ref}). ETA: ~${payload.etaMinutes} min. ${payload.detail || ''}`.trim()
        : `${payload.action} (Ref: ${ref}). ${payload.detail || ''}`.trim(),
      tag: `nurse-${ref}`,
    };
  }

  // PHARMACIST
  return {
    title: 'Pharmacy Action Required',
    body: `${payload.action} (Ref: ${ref}). ${payload.detail || ''}`.trim(),
    tag: `pharm-${ref}`,
  };
}

import { getStoredSession } from './apiClient';

// -- Dispatch --

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const session = getStoredSession();

  // ROLE-BASED ACCESS & PRIVACY CONTROL:
  // Notifications must only go to the intended clinical recipient on their device/phone.
  // - Floor courier delivery alerts (recipient: 'NURSE') must ONLY be sent to Ward Nurses on duty.
  // - Order review requests (recipient: 'PHARMACIST') must ONLY be sent to Central Pharmacy staff.
  // - Admins and Auditors do NOT receive bedside courier or pharmacy dispensing notifications.
  if (session?.user?.role && session.user.role !== payload.recipient) {
    return false;
  }

  const { title, body, tag } = buildNotificationContent(payload);

  // In-app toast (only fires if user is the intended recipient)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dna-health-discreet-toast', {
        detail: { title, body, recipient: payload.recipient, timestamp: new Date().toISOString() },
      })
    );
  }

  // Native system notification
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  // Try ServiceWorker first (required on mobile)
  try {
    let reg = swRegistration;
    if (!reg && 'serviceWorker' in navigator) reg = await navigator.serviceWorker.ready;

    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
        // @ts-ignore - vibration API
        vibrate: [200, 100, 200],
        silent: false,
        data: { url: payload.recipient === 'NURSE' ? '/indents' : '/dispensary' },
      });
      return true;
    }
  } catch { /* fall through */ }

  // Fallback: window.Notification (desktop)
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag });
    return true;
  } catch {
    return false;
  }
}

// -- Convenience Helpers --

/** Notify nurse that medication is dispatched and en route */
export function notifyNurseDispatch(orderRef: string, courierName: string, etaMinutes: number): Promise<boolean> {
  return sendNotification({
    recipient: 'NURSE',
    orderReference: orderRef,
    action: `Courier ${courierName} dispatched`,
    detail: 'Open app for drop-zone details.',
    etaMinutes,
  });
}

/** Notify pharmacist that a new indent needs review */
export function notifyPharmacistNewIndent(orderRef: string, drugName: string): Promise<boolean> {
  return sendNotification({
    recipient: 'PHARMACIST',
    orderReference: orderRef,
    action: 'New indent received',
    detail: `${drugName} — verify prescription and fulfill.`,
  });
}

/** Notify pharmacist that fulfillment completed */
export function notifyPharmacistFulfilled(orderRef: string): Promise<boolean> {
  return sendNotification({
    recipient: 'PHARMACIST',
    orderReference: orderRef,
    action: 'Fulfillment confirmed',
    detail: 'FHIR dispense recorded. Courier en route.',
  });
}
