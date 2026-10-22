import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mockSchedule = jest.fn(async (..._args: unknown[]): Promise<string> => 'identifier');
jest.mock('expo-notifications/build/scheduleNotificationAsync', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
}));

const mockEmitter = {
  addNotificationResponseReceivedListener: jest.fn(
    (_listener: (response: unknown) => void) => ({ remove: jest.fn() }),
  ),
  getLastNotificationResponseAsync: jest.fn(async (): Promise<unknown> => null),
  clearLastNotificationResponse: jest.fn(),
};
jest.mock('expo-notifications/build/NotificationsEmitter', () => mockEmitter);

jest.mock('expo-notifications/build/Notifications.types', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import {
  REMINDERS_CHANNEL_ID,
  getLastResponseTarget,
  onNotificationResponse,
  scheduleHabitNudge,
  scheduleTaskNotification,
} from '@/services/reminders';

const responseFor = (data: unknown) => ({
  notification: { request: { content: { data } } },
});

describe('reminders service', () => {
  beforeEach(() => {
    mockSchedule.mockClear();
    mockEmitter.clearLastNotificationResponse.mockClear();
    mockEmitter.getLastNotificationResponseAsync.mockReset();
    mockEmitter.getLastNotificationResponseAsync.mockResolvedValue(null);
  });

  it('schedules a task reminder with the task id in the payload', async () => {
    const date = new Date('2026-10-22T09:30:00');
    await scheduleTaskNotification({ id: 'task:abc', title: 'Write the report', date, taskId: 'abc' });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const request = mockSchedule.mock.calls[0][0] as unknown as {
      identifier: string;
      content: { title: string; body: string; sound: boolean; data: unknown };
      trigger: { type: string; date: Date; channelId: string };
    };

    expect(request.identifier).toBe('task:abc');
    expect(request.content.title).toBe('Write the report');
    expect(request.content.body).toBe('Starting now');
    expect(request.content.sound).toBe(false);
    expect(request.content.data).toEqual({ kind: 'task', taskId: 'abc' });
    expect(request.trigger.type).toBe('date');
    expect(request.trigger.date).toBe(date);
    expect(request.trigger.channelId).toBe(REMINDERS_CHANNEL_ID);
  });

  it('falls back to the identifier when no task id is given', async () => {
    await scheduleTaskNotification({
      id: 'task:abc',
      title: 'Write the report',
      date: new Date('2026-10-22T09:30:00'),
    });

    const request = mockSchedule.mock.calls[0][0] as unknown as { content: { data: unknown } };
    expect(request.content.data).toEqual({ kind: 'task', taskId: 'abc' });
  });

  it('schedules the habit nudge on the same channel with a habits payload', async () => {
    await scheduleHabitNudge('habit-nudge', 'Habits today', 'Read', new Date('2026-10-22T20:00:00'));

    const request = mockSchedule.mock.calls[0][0] as unknown as {
      content: { data: unknown };
      trigger: { channelId: string };
    };
    expect(request.content.data).toEqual({ kind: 'habits' });
    expect(request.trigger.channelId).toBe(REMINDERS_CHANNEL_ID);
  });

  it('reads a task response and clears it so it cannot re-open later', async () => {
    mockEmitter.getLastNotificationResponseAsync.mockResolvedValue(
      responseFor({ kind: 'task', taskId: 'abc' }),
    );

    const target = await getLastResponseTarget();

    expect(target).toEqual({ kind: 'task', taskId: 'abc' });
    expect(mockEmitter.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it('returns null for a response it does not understand', async () => {
    mockEmitter.getLastNotificationResponseAsync.mockResolvedValue(responseFor({ kind: 'nope' }));

    await expect(getLastResponseTarget()).resolves.toBeNull();
  });

  it('survives a native module that cannot clear the response', async () => {
    mockEmitter.getLastNotificationResponseAsync.mockResolvedValue(
      responseFor({ kind: 'habits' }),
    );
    mockEmitter.clearLastNotificationResponse.mockImplementation(() => {
      throw new Error('not supported');
    });

    await expect(getLastResponseTarget()).resolves.toEqual({ kind: 'habits' });
  });

  it('hands a tapped notification to the listener as a navigation target', () => {
    let captured: ((response: unknown) => void) | undefined;
    mockEmitter.addNotificationResponseReceivedListener.mockImplementation((listener) => {
      captured = listener;
      return { remove: jest.fn() };
    });

    const seen: unknown[] = [];
    onNotificationResponse((target) => seen.push(target));

    captured?.(responseFor({ kind: 'task', taskId: 'xyz' }));
    expect(seen).toEqual([{ kind: 'task', taskId: 'xyz' }]);
  });
});

describe('expo-notifications import discipline', () => {
  /**
   * The package barrel evaluates `requireNativeModule('ExpoTopicSubscriptionModule')`
   * at module scope, which only exists in a development build. Importing it
   * under Expo Go throws while the module is being evaluated and takes every
   * route that imports it down. The service must only deep-import.
   */
  const source = readFileSync(
    join(__dirname, '..', '..', 'src', 'services', 'reminders.ts'),
    'utf8',
  );

  it('never imports the expo-notifications package barrel', () => {
    expect(source).not.toMatch(/from\s+'expo-notifications'/);
    expect(source).not.toMatch(/require\(\s*'expo-notifications'\s*\)/);
  });

  it('deep-imports only the submodules it needs', () => {
    const deepImports = source.match(/expo-notifications\/build\/[A-Za-z.]+/g) ?? [];
    expect(deepImports.length).toBeGreaterThan(0);
    for (const deepImport of deepImports) {
      expect(deepImport).not.toBe('expo-notifications/build');
    }
  });
});
