/**
 * Stubs for the non-DB services used by write paths. Loaded first in store
 * tests so the reminder sync layer never reaches `expo-notifications` (its
 * native module is absent under Jest) or a real settings table.
 */
jest.mock('@/services/reminders', () => ({
  REMINDERS_CHANNEL_ID: 'reminders',
  ensureChannel: jest.fn(async () => undefined),
  getPermission: jest.fn(async () => 'granted' as const),
  requestPermission: jest.fn(async () => 'granted' as const),
  listScheduled: jest.fn(async () => []),
  scheduleTaskNotification: jest.fn(async () => undefined),
  scheduleHabitNudge: jest.fn(async () => undefined),
  cancelById: jest.fn(async () => undefined),
  onNotificationResponse: jest.fn(() => () => undefined),
  getLastResponseTaskId: jest.fn(async () => null),
}));
