import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ResetScreen from '../../app/reset';
import type { Task } from '@/domain/types';

/**
 * The Reset My Day review screen (v1.2, FR-X2/FR-X4).
 *
 * The screen lists exactly the carried-over tasks, grouped by how late
 * they are, and it is the only place where the choices are confirmed.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  const mock = require('react-native-safe-area-context/jest/mock').default;
  return { ...actual, ...mock };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'picker'),
  };
});

const NOW = new Date('2026-10-22T12:00:00');

function carriedOver(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write the report',
    notes: '',
    deadlineDate: null,
    deadlineTime: null,
    scheduledDate: '2026-10-21',
    startTime: '09:00',
    durationMin: 30,
    status: 'open',
    createdAt: 0,
    completedAt: null,
    ...overrides,
  };
}

const mockTasksStore = {
  status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
  tasks: [] as Task[],
  load: jest.fn(),
};

jest.mock('@/stores/tasksStore', () => ({
  useTasksStore: Object.assign(
    (selector: (state: typeof mockTasksStore) => unknown) => selector(mockTasksStore),
    { getState: () => mockTasksStore },
  ),
}));

const mockResetStore = {
  applying: false,
  apply: jest.fn(),
  undo: jest.fn(),
};

jest.mock('@/stores/resetStore', () => ({
  useResetStore: (selector: (state: typeof mockResetStore) => unknown) => selector(mockResetStore),
}));

const mockUiStore = {
  now: NOW,
  showToast: jest.fn(),
};

jest.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: typeof mockUiStore) => unknown) => selector(mockUiStore),
}));

beforeEach(() => {
  mockTasksStore.status = 'ready';
  mockTasksStore.tasks = [];
  mockTasksStore.load.mockReset();
  mockResetStore.apply.mockReset();
  mockResetStore.undo.mockReset();
  mockUiStore.showToast.mockReset();
});

describe('reset screen', () => {
  it('groups the carried-over tasks by how late they are', async () => {
    mockTasksStore.tasks = [
      carriedOver({ id: 'task-1', title: 'Write the report', scheduledDate: '2026-10-21' }),
      carriedOver({ id: 'task-2', title: 'Read the contract', scheduledDate: '2026-10-19' }),
    ];

    await render(<ResetScreen />);

    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    expect(screen.getByText('Write the report')).toBeTruthy();
    expect(screen.getByText('Read the contract')).toBeTruthy();
  });

  it('shows when nothing is waiting', async () => {
    mockTasksStore.tasks = [];

    await render(<ResetScreen />);

    expect(screen.getByText('Nothing is waiting.')).toBeTruthy();
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('starts every row on Keep time', async () => {
    mockTasksStore.tasks = [carriedOver()];

    await render(<ResetScreen />);

    expect(screen.getByText('Keep 09:00')).toBeTruthy();
  });

  it('states the exact date each row was scheduled for (D27)', async () => {
    mockTasksStore.tasks = [carriedOver()];

    await render(<ResetScreen />);

    expect(screen.getByText('was scheduled Wed 21 Oct, 09:00')).toBeTruthy();
  });

  it('applies the plan and announces the result with an undo', async () => {
    mockTasksStore.tasks = [carriedOver()];
    mockResetStore.apply.mockResolvedValue({ resetId: 'reset-1', changed: 1 });

    await render(<ResetScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Confirm'));
    });

    expect(mockResetStore.apply).toHaveBeenCalledTimes(1);
    const [entries, dateKey] = mockResetStore.apply.mock.calls[0];
    expect(dateKey).toBe('2026-10-22');
    expect(entries[0].action).toBe('keep');
    expect(entries[0].to).toEqual({
      scheduledDate: '2026-10-22',
      startTime: '09:00',
      durationMin: 30,
    });

    expect(mockUiStore.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: '1 task updated', actionLabel: 'Undo' }),
    );
  });

  it('says so when nothing changed', async () => {
    mockTasksStore.tasks = [carriedOver()];
    mockResetStore.apply.mockResolvedValue({ resetId: 'reset-1', changed: 0 });

    await render(<ResetScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Confirm'));
    });

    expect(mockUiStore.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Nothing changed.' }),
    );
  });

  it('keeps the screen open when the write failed', async () => {
    mockTasksStore.tasks = [carriedOver()];
    mockResetStore.apply.mockResolvedValue(null);

    await render(<ResetScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Confirm'));
    });

    expect(mockUiStore.showToast).not.toHaveBeenCalled();
  });
});
