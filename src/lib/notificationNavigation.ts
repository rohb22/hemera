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
  const unsubscribe = onNotificationResponse(open);
  void getLastResponseTarget().then(open);
  return unsubscribe;
}
