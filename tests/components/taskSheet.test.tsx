import { act, render, screen } from '@testing-library/react-native';

import TaskSheet from '../../app/sheet/task';
import type { Task } from '@/domain/types';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'task-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  const mock = require('react-native-safe-area-context/jest/mock').default;
  return { ...actual, ...mock };
});

// The schedule and deadline pickers are irrelevant here — the sheet only
// needs to render the title field.
jest.mock('@/components/ScheduleFields', () => ({ ScheduleFields: () => null }));
jest.mock('@/components/DeadlineFields', () => ({ DeadlineFields: () => null }));

const mockStore = {
  status: 'loading' as 'idle' | 'loading' | 'ready' | 'error',
  tasks: [] as Task[],
  updateTask: jest.fn(),
  load: jest.fn(),
};

jest.mock('@/stores/tasksStore', () => ({
  useTasksStore: Object.assign(
    (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
    { getState: () => mockStore },
  ),
}));

const task: Task = {
  id: 'task-1',
  title: 'Write the report',
  notes: 'Draft the first section',
  deadlineDate: null,
  deadlineTime: null,
  scheduledDate: '2026-10-22',
  startTime: '09:30',
  durationMin: 45,
  status: 'open',
  createdAt: 0,
  completedAt: null,
};

describe('task sheet', () => {
  beforeEach(() => {
    mockStore.status = 'loading';
    mockStore.tasks = [];
    mockStore.updateTask.mockReset();
    mockStore.load.mockReset();
  });

  /**
   * Regression guard: a notification tap can open this sheet before the
   * tasks store has loaded. The draft used to be seeded only in the
   * `useState` initialiser, so it captured an empty draft and the sheet
   * rendered a blank "new task" form once the task finally arrived.
   */
  it('seeds the draft with the task once it arrives', async () => {
    const view = await render(<TaskSheet />);

    expect(screen.getByText('Opening…')).toBeTruthy();
    expect(screen.queryByText('This task is no longer available.')).toBeNull();

    mockStore.status = 'ready';
    mockStore.tasks = [task];
    await act(async () => {
      await view.rerender(<TaskSheet />);
    });

    expect(screen.getByDisplayValue('Write the report')).toBeTruthy();
    expect(screen.getByDisplayValue('Draft the first section')).toBeTruthy();
    expect(screen.queryByText('Opening…')).toBeNull();
  });

  it('does not show the unavailable message while the store is still loading', async () => {
    await render(<TaskSheet />);
    expect(screen.queryByText('This task is no longer available.')).toBeNull();
  });

  it('reports a genuinely missing task once the store has loaded', async () => {
    mockStore.status = 'ready';
    mockStore.tasks = [];
    await render(<TaskSheet />);
    expect(screen.getByText('This task is no longer available.')).toBeTruthy();
  });
});
