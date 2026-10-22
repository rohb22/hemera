import type { Router } from 'expo-router';

import { getLastResponseTaskId, onNotificationResponse } from '@/services/reminders';

/**
 * D19: a task reminder tap opens that task's sheet.
 *
 * Kept in a plain module (rather than inline in the root layout) so the
 * `expo-notifications` import is only reached through a dynamic import —
 * nothing on the startup path can fail on a build without the native
 * module.
 */
export function openTaskFromNotification(router: Router, taskId: string | null): void {
  if (!taskId) return;
  router.push({ pathname: '/sheet/task', params: { id: taskId } });
}

/** Starts listening for notification taps, and handles a pending one. */
export function subscribeToNotificationTaps(
  openTask: (taskId: string | null) => void,
): () => void {
  const unsubscribe = onNotificationResponse(openTask);
  void getLastResponseTaskId().then(openTask);
  return unsubscribe;
}
