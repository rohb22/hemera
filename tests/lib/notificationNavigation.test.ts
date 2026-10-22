import type { ReminderTarget } from '@/domain/reminders';

const mockGetLastResponseTarget = jest.fn(async () => null as ReminderTarget | null);
const mockOnNotificationResponse = jest.fn(
  (_handler: (target: ReminderTarget | null) => void) => () => undefined,
);

jest.mock('@/services/reminders', () => ({
  getLastResponseTarget: () => mockGetLastResponseTarget(),
  onNotificationResponse: (handler: (target: ReminderTarget | null) => void) =>
    mockOnNotificationResponse(handler),
}));

import { openReminderTarget, subscribeToNotificationTaps } from '@/lib/notificationNavigation';

const router = () => ({ push: jest.fn() }) as unknown as Parameters<typeof openReminderTarget>[0];

describe('notification navigation', () => {
  beforeEach(() => {
    mockGetLastResponseTarget.mockReset();
    mockGetLastResponseTarget.mockResolvedValue(null);
    mockOnNotificationResponse.mockClear();
  });

  it('opens a task reminder on that task\'s sheet', () => {
    const r = router();
    openReminderTarget(r, { kind: 'task', taskId: 'abc' });
    expect(r.push).toHaveBeenCalledWith({ pathname: '/sheet/task', params: { id: 'abc' } });
  });

  it('opens a habit nudge on the habits tab', () => {
    const r = router();
    openReminderTarget(r, { kind: 'habits' });
    expect(r.push).toHaveBeenCalledWith('/habits');
  });

  it('does nothing for an unknown target', () => {
    const r = router();
    openReminderTarget(r, null);
    expect(r.push).not.toHaveBeenCalled();
  });

  it('opens the target carried by a tapped notification', async () => {
    let captured: ((target: ReminderTarget | null) => void) | undefined;
    mockOnNotificationResponse.mockImplementation((handler) => {
      captured = handler;
      return () => undefined;
    });

    const opened: ReminderTarget[] = [];
    subscribeToNotificationTaps((target) => {
      if (target) opened.push(target);
    });

    captured?.({ kind: 'task', taskId: 'abc' });
    expect(opened).toEqual([{ kind: 'task', taskId: 'abc' }]);
  });

  it('opens the pending target that a cold start left behind', async () => {
    mockGetLastResponseTarget.mockResolvedValue({ kind: 'task', taskId: 'xyz' });

    const opened: ReminderTarget[] = [];
    subscribeToNotificationTaps((target) => {
      if (target) opened.push(target);
    });

    await Promise.resolve();
    expect(opened).toEqual([{ kind: 'task', taskId: 'xyz' }]);
  });

  /**
   * One tap can reach us twice — once as a live response event and once as
   * the native module's stored "last response". Pushing the sheet twice
   * would stack two modals.
   */
  it('opens the sheet only once when the same tap arrives twice', async () => {
    let captured: ((target: ReminderTarget | null) => void) | undefined;
    mockOnNotificationResponse.mockImplementation((handler) => {
      captured = handler;
      return () => undefined;
    });
    mockGetLastResponseTarget.mockResolvedValue({ kind: 'task', taskId: 'abc' });

    const opened: ReminderTarget[] = [];
    subscribeToNotificationTaps((target) => {
      if (target) opened.push(target);
    });

    captured?.({ kind: 'task', taskId: 'abc' });
    await Promise.resolve();

    expect(opened).toEqual([{ kind: 'task', taskId: 'abc' }]);
  });

  it('still opens a genuinely different notification', async () => {
    let captured: ((target: ReminderTarget | null) => void) | undefined;
    mockOnNotificationResponse.mockImplementation((handler) => {
      captured = handler;
      return () => undefined;
    });

    const opened: ReminderTarget[] = [];
    subscribeToNotificationTaps((target) => {
      if (target) opened.push(target);
    });

    captured?.({ kind: 'task', taskId: 'one' });
    captured?.({ kind: 'task', taskId: 'two' });

    expect(opened).toEqual([
      { kind: 'task', taskId: 'one' },
      { kind: 'task', taskId: 'two' },
    ]);
  });
});
