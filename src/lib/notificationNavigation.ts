import type { ImperativeRouter } from 'expo-router';

import type { ReminderTarget } from '@/domain/reminders';
import { getLastResponseTarget, onNotificationResponse } from '@/services/reminders';

/**
 * D19: a task reminder tap opens that task's sheet; a habit nudge tap
 * opens the Habits tab.
 *
 * Kept in a plain module (rather than inline in the root layout) so the
 * notification plumbing stays in one place, and so the reminder service
 * — which resolves its native modules lazily — is only reached when the
 * app is actually running.
 */
export function openReminderTarget(router: ImperativeRouter, target: ReminderTarget | null): void {
  if (!target) return;
  if (target.kind === 'task') {
    router.push({ pathname: '/sheet/task', params: { id: target.taskId } });
    return;
  }
  router.push('/habits');
}

/** Starts listening for notification taps, and handles a pending one. */
export function subscribeToNotificationTaps(
  open: (target: ReminderTarget | null) => void,
): () => void {
  // One tap can reach us twice: once as a live response event and once as
  // the native module's stored "last response" (read on launch). Without a
  // guard the same tap would push the sheet twice.
  let lastKey: string | null = null;
  let lastAt = 0;

  const handle = (target: ReminderTarget | null) => {
    if (!target) return;
    const key = target.kind === 'task' ? `task:${target.taskId}` : 'habits';
    const now = Date.now();
    if (key === lastKey && now - lastAt < 2000) return;
    lastKey = key;
    lastAt = now;
    open(target);
  };

  const unsubscribe = onNotificationResponse(handle);
  void getLastResponseTarget().then(handle);
  return unsubscribe;
}
