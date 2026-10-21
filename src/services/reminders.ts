import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';

/**
 * The single place that talks to `expo-notifications` (ADR-0003 adapter
 * pattern). Everything that can be pure logic — trigger dates,
 * notification bodies, ids — lives in `@/domain/reminders` instead.
 *
 * D13: local OS-scheduled triggers only; no server, no push, no
 * background fetch. `INTERNET` stays blocked.
 */

export const REMINDERS_CHANNEL_ID = 'reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as Awaited<ReturnType<Notifications.NotificationHandler['handleNotification']>>,
});

/** D3-ish app default: reminders are quiet by design (brief §7). */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [0, 120],
    });
  } catch {
    // A missing channel only means quieter delivery; never block a write.
  }
}

async function readPermission(): Promise<PermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  try {
    return await readPermission();
  } catch {
    return 'undetermined';
  }
}

/**
 * D16: the only place the OS prompt is ever triggered — from a Settings
 * switch. A refusal is reported back so the UI can fall back silently.
 */
export async function requestPermission(): Promise<PermissionState> {
  try {
    const current = await readPermission();
    if (current === 'granted') return 'granted';
    if (current === 'denied') return 'denied';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export interface InstalledTrigger {
  identifier: string;
}

export async function listScheduled(): Promise<InstalledTrigger[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((item) => ({ identifier: item.identifier }));
  } catch {
    return [];
  }
}

export interface TaskNotificationInput {
  id: string;
  title: string;
  date: Date;
}

export async function scheduleTaskNotification(input: TaskNotificationInput): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: input.id,
    content: {
      title: input.title,
      // Factual, never scolding (FR-R4).
      body: 'Starting now',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function scheduleHabitNudge(id: string, title: string, body: string, date: Date) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function cancelById(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    throw new AppError('write', 'Could not cancel a reminder', { cause: error });
  }
}

/** D19: opening a task reminder opens its sheet. */
export function onNotificationResponse(handler: (taskId: string | null) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { taskId?: unknown };
    handler(typeof data?.taskId === 'string' ? data.taskId : null);
  });
  return () => subscription.remove();
}

export async function getLastResponseTaskId(): Promise<string | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    const data = response?.notification.request.content.data as { taskId?: unknown } | undefined;
    return typeof data?.taskId === 'string' ? data.taskId : null;
  } catch {
    return null;
  }
}
