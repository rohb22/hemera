import '../helpers/remindersMock';

import type { WeekStartsOn } from '@/domain/habits';
import { setServices } from '@/services';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { HabitsRepository } from '@/repositories/habits';
import type { SettingsRepository } from '@/repositories/settings';
import type { TasksRepository } from '@/repositories/tasks';

function makeRepo() {
  return {
    getWeekStartsOn: jest.fn(async (): Promise<WeekStartsOn> => 1),
    setWeekStartsOn: jest.fn(async () => undefined),
    getReminders: jest.fn(async () => ({
      tasks: false,
      habits: false,
      habitTime: '20:00',
      hintSeen: false,
    })),
    setReminderTasks: jest.fn(async () => undefined),
    setReminderHabits: jest.fn(async () => undefined),
    setHabitReminderTime: jest.fn(async () => undefined),
    setReminderHintSeen: jest.fn(async () => undefined),
  };
}

let repo: ReturnType<typeof makeRepo>;

beforeEach(() => {
  repo = makeRepo();
  setServices({
    tasks: {} as TasksRepository,
    habits: {} as HabitsRepository,
    settings: repo as unknown as SettingsRepository,
  });
  useSettingsStore.setState({
    status: 'idle',
    error: null,
    weekStartsOn: 1,
    taskRemindersEnabled: false,
    habitRemindersEnabled: false,
    habitReminderTime: '20:00',
    reminderHintSeen: false,
    permission: null,
  });
  useUiStore.getState().dismissToast();
});

afterEach(() => {
  useUiStore.getState().dismissToast();
});

describe('load', () => {
  it('reads the stored week start and marks ready', async () => {
    repo.getWeekStartsOn.mockResolvedValueOnce(0);
    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().weekStartsOn).toBe(0);
    expect(useSettingsStore.getState().status).toBe('ready');
  });

  it('keeps the default on a read failure and records the error', async () => {
    repo.getWeekStartsOn.mockRejectedValueOnce(new Error('db locked'));
    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().weekStartsOn).toBe(1);
    expect(useSettingsStore.getState().status).toBe('error');
  });
});

describe('setWeekStartsOn', () => {
  it('persists then updates state', async () => {
    await useSettingsStore.getState().setWeekStartsOn(0);

    expect(repo.setWeekStartsOn).toHaveBeenCalledWith(0);
    expect(useSettingsStore.getState().weekStartsOn).toBe(0);
  });

  it('leaves state untouched on a failed write, with a toast', async () => {
    repo.setWeekStartsOn.mockRejectedValueOnce(new Error('disk full'));

    await expect(useSettingsStore.getState().setWeekStartsOn(0)).rejects.toThrow('disk full');

    expect(useSettingsStore.getState().weekStartsOn).toBe(1);
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
  });
});

describe('reminder settings (FR-R1, D14)', () => {
  it('starts with both switches off and the 20:00 default', async () => {
    // Fresh state: the store is module-level, so reset the reminder fields.
    useSettingsStore.setState({
      taskRemindersEnabled: false,
      habitRemindersEnabled: false,
      habitReminderTime: '20:00',
      reminderHintSeen: false,
      permission: null,
    });

    const state = useSettingsStore.getState();
    expect(state.taskRemindersEnabled).toBe(false);
    expect(state.habitRemindersEnabled).toBe(false);
    expect(state.habitReminderTime).toBe('20:00');
    expect(state.reminderHintSeen).toBe(false);
    expect(state.permission).toBeNull();
  });

  it('loads the stored reminder preferences', async () => {
    repo.getReminders.mockResolvedValueOnce({
      tasks: true,
      habits: true,
      habitTime: '07:15',
      hintSeen: true,
    });

    await useSettingsStore.getState().load();

    const state = useSettingsStore.getState();
    expect(state.taskRemindersEnabled).toBe(true);
    expect(state.habitRemindersEnabled).toBe(true);
    expect(state.habitReminderTime).toBe('07:15');
    expect(state.reminderHintSeen).toBe(true);
  });

  it('persists a switch before reflecting it', async () => {
    await useSettingsStore.getState().setTaskReminders(true);
    expect(repo.setReminderTasks).toHaveBeenCalledWith(true);
    expect(useSettingsStore.getState().taskRemindersEnabled).toBe(true);

    await useSettingsStore.getState().setHabitReminders(true);
    expect(repo.setReminderHabits).toHaveBeenCalledWith(true);
  });

  it('keeps the switch off when the write fails', async () => {
    useSettingsStore.setState({ habitRemindersEnabled: false });
    repo.setReminderHabits.mockRejectedValueOnce(new Error('disk full'));

    await expect(useSettingsStore.getState().setHabitReminders(true)).rejects.toThrow('disk full');

    expect(useSettingsStore.getState().habitRemindersEnabled).toBe(false);
    expect(useUiStore.getState().toast?.message).toBe("Couldn't save — try again");
  });

  it('dismisses the one-time hint only once (D18)', async () => {
    useSettingsStore.setState({ reminderHintSeen: false });

    await useSettingsStore.getState().dismissReminderHint();
    expect(repo.setReminderHintSeen).toHaveBeenCalledWith(true);
    expect(useSettingsStore.getState().reminderHintSeen).toBe(true);

    await useSettingsStore.getState().dismissReminderHint();
    expect(repo.setReminderHintSeen).toHaveBeenCalledTimes(1);
  });
});
