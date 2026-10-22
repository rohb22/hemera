import { Platform } from 'react-native';

import { parseReminderTarget, type ReminderTarget } from '@/domain/reminders';
import { AppError } from '@/lib/errors';

/**
 * The only place that talks to `expo-notifications` (ADR-0003 adapter
 * pattern). Everything that can be pure logic — trigger dates,
 * notification bodies, ids — lives in `@/domain/reminders` instead.
 *
 * D13: local OS-scheduled triggers only; no server, no push, no
 * background fetch. `INTERNET` stays blocked.
 *
 * ## Why this module is shaped the way it is
 *
 * **1. No package-barrel import.** `expo-notifications`' entry point
 * re-exports `./topicSubscription`, which evaluates
 * `requireNativeModule('ExpoTopicSubscriptionModule')` at module scope.
 * That module only exists in a development build, so importing the
 * barrel under Expo Go throws
 * `Cannot find native module 'ExpoTopicSubscriptionModule'` — and it
 * throws *while the importing module is being evaluated*, which takes
 * the whole route down with it (expo-router then reports the route as
 * "missing the required default export"). We therefore import the exact
 * submodules we need, none of which touch the topic module.
 *
 * **2. Nothing native is resolved at import time.** Each submodule is
 * required lazily, inside the function that needs it, behind its own
 * `try`/`catch`. A build without one native module degrades that single
 * capability instead of the whole app.
 */

export const REMINDERS_CHANNEL_ID = 'reminders';

export type { ReminderTarget };

export type PermissionState = 'granted' | 'denied' | 'undetermined';

interface NotificationResponseLike {
  notification?: { request?: { content?: { data?: unknown } } };
}

interface PermissionsModule {
  getPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
}

interface ChannelModule {
  setNotificationChannelAsync: (id: string, channel: unknown) => Promise<unknown>;
}

interface ChannelTypesModule {
  AndroidImportance: { DEFAULT: number };
}

interface ScheduleModule {
  scheduleNotificationAsync: (request: unknown) => Promise<string>;
}

interface ScheduleListModule {
  getAllScheduledNotificationsAsync: () => Promise<{ identifier: string }[]>;
}

interface ScheduleCancelModule {
  cancelScheduledNotificationAsync: (id: string) => Promise<void>;
}

interface EmitterModule {
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponseLike) => void,
  ) => { remove: () => void };
  getLastNotificationResponseAsync: () => Promise<NotificationResponseLike | null>;
}

interface HandlerModule {
  setNotificationHandler: (handler: unknown) => void;
}

interface TypesModule {
  SchedulableTriggerInputTypes: { DATE: string };
}

/**
 * Requires a submodule once, remembering the result. A throw is cached as
 * `null` so a missing native module is not retried on every call.
 */
function lazy<T>(load: () => T): () => T | null {
  let cached: T | null | undefined;
  return () => {
    if (cached === undefined) {
      try {
        cached = load();
      } catch {
        cached = null;
      }
    }
    return cached;
  };
}

/* eslint-disable @typescript-eslint/no-require-imports */
const loadPermissions = lazy<PermissionsModule>(
  () => require('expo-notifications/build/NotificationPermissions'),
);
const loadChannels = lazy<ChannelModule>(
  () => require('expo-notifications/build/setNotificationChannelAsync'),
);
const loadChannelTypes = lazy<ChannelTypesModule>(
  () => require('expo-notifications/build/NotificationChannelManager.types'),
);
const loadSchedule = lazy<ScheduleModule>(
  () => require('expo-notifications/build/scheduleNotificationAsync'),
);
const loadScheduleList = lazy<ScheduleListModule>(
  () => require('expo-notifications/build/getAllScheduledNotificationsAsync'),
);
const loadScheduleCancel = lazy<ScheduleCancelModule>(
  () => require('expo-notifications/build/cancelScheduledNotificationAsync'),
);
const loadEmitter = lazy<EmitterModule>(
  () => require('expo-notifications/build/NotificationsEmitter'),
);
const loadHandler = lazy<HandlerModule>(
  () => require('expo-notifications/build/NotificationsHandler'),
);
const loadTypes = lazy<TypesModule>(
  () => require('expo-notifications/build/Notifications.types'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Foreground presentation: quiet, and only where the OS still needs telling.
 */
export function configureHandler(): void {
  const handler = loadHandler();
  if (!handler) return;
  try {
    handler.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Presentation config is cosmetic; never fatal.
  }
}

/** D3-ish app default: reminders are quiet by design (brief §7). */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const channels = loadChannels();
  const channelTypes = loadChannelTypes();
  if (!channels || !channelTypes) return;
  try {
    await channels.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
      name: 'Reminders',
      importance: channelTypes.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [0, 120],
    });
  } catch {
    // A missing channel only means quieter delivery; never block a write.
  }
}

async function readPermission(permissions: PermissionsModule): Promise<PermissionState> {
  const settings = await permissions.getPermissionsAsync();
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  const permissions = loadPermissions();
  if (!permissions) return 'undetermined';
  try {
    return await readPermission(permissions);
  } catch {
    return 'undetermined';
  }
}

/**
 * D16: the only place the OS prompt is ever triggered — from a Settings
 * switch. A refusal is reported back so the UI can fall back silently.
 */
export async function requestPermission(): Promise<PermissionState> {
  const permissions = loadPermissions();
  if (!permissions) return 'denied';
  try {
    const current = await readPermission(permissions);
    if (current === 'granted') return 'granted';
    if (current === 'denied') return 'denied';
    const asked = await permissions.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export interface InstalledTrigger {
  identifier: string;
}

export async function listScheduled(): Promise<InstalledTrigger[]> {
  const list = loadScheduleList();
  if (!list) return [];
  try {
    const scheduled = await list.getAllScheduledNotificationsAsync();
    return scheduled.map((item) => ({ identifier: item.identifier }));
  } catch {
    return [];
  }
}

export interface TaskNotificationInput {
  id: string;
  title: string;
  date: Date;
  /** D19: the payload a tap uses to open this task's sheet. */
  taskId?: string;
}

function dateTrigger(date: Date): { type: string; date: Date; channelId: string } {
  const types = loadTypes();
  return {
    type: types?.SchedulableTriggerInputTypes.DATE ?? 'date',
    date,
    channelId: REMINDERS_CHANNEL_ID,
  };
}

export async function scheduleTaskNotification(input: TaskNotificationInput): Promise<void> {
  const schedule = loadSchedule();
  if (!schedule) return;
  await schedule.scheduleNotificationAsync({
    identifier: input.id,
    content: {
      title: input.title,
      // Factual, never scolding (FR-R4).
      body: 'Starting now',
      sound: false,
      data: { kind: 'task', taskId: input.taskId ?? input.id.replace(/^task:/, '') },
    },
    trigger: dateTrigger(input.date),
  });
}

export async function scheduleHabitNudge(id: string, title: string, body: string, date: Date) {
  const schedule = loadSchedule();
  if (!schedule) return;
  await schedule.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: false,
      data: { kind: 'habits' },
    },
    trigger: dateTrigger(date),
  });
}

export async function cancelById(id: string): Promise<void> {
  const cancel = loadScheduleCancel();
  if (!cancel) return;
  try {
    await cancel.cancelScheduledNotificationAsync(id);
  } catch (error) {
    throw new AppError('write', 'Could not cancel a reminder', { cause: error });
  }
}

function targetOf(response: NotificationResponseLike | null): ReminderTarget | null {
  return parseReminderTarget(response?.notification?.request?.content?.data);
}

/** D19: opening a task reminder opens its sheet. */
export function onNotificationResponse(handler: (target: ReminderTarget | null) => void): () => void {
  const emitter = loadEmitter();
  if (!emitter) return () => undefined;
  const subscription = emitter.addNotificationResponseReceivedListener((response) => {
    handler(targetOf(response));
  });
  return () => subscription.remove();
}

export async function getLastResponseTarget(): Promise<ReminderTarget | null> {
  const emitter = loadEmitter();
  if (!emitter) return null;
  try {
    return targetOf(await emitter.getLastNotificationResponseAsync());
  } catch {
    return null;
  }
}
