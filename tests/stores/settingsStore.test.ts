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
  useSettingsStore.setState({ status: 'idle', error: null, weekStartsOn: 1 });
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
