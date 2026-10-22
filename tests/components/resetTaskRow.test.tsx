import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ResetTaskRow } from '@/components/ResetTaskRow';
import type { Task } from '@/domain/types';

/**
 * One row of the Reset My Day review (v1.2, FR-X3).
 *
 * The row is the whole vocabulary of the feature: four choices, and the
 * row always starts on "Keep time" (D23).
 */

// The native picker is not available under Jest; the stub fires the
// value change with a fixed 14:30 so the choice can be observed.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onValueChange }: { onValueChange: (event: unknown, date: Date) => void }) =>
      React.createElement(
        Pressable,
        { onPress: () => onValueChange({}, new Date(2026, 9, 22, 14, 30)) },
        React.createElement(Text, null, 'open-picker'),
      ),
  };
});

const task: Task = {
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
};

type Choice = { action: 'keep' | 'pool' | 'pick' | 'dismiss'; time?: string | null };

async function renderRow(choice: Choice = { action: 'keep' }) {
  const onChoose = jest.fn();
  const view = await render(
    <ResetTaskRow
      task={task}
      caption="was scheduled Tue 09:00"
      choice={choice}
      onChoose={onChoose}
    />,
  );
  return { onChoose, view };
}

/** React 19's `act` is async, so a press that changes state is awaited. */
async function press(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
}

function isSelected(label: string): boolean {
  return screen.getByLabelText(label).props.accessibilityState.selected;
}

describe('reset task row', () => {
  it('shows the task and when it was scheduled for', async () => {
    await renderRow();

    expect(screen.getByText('Write the report')).toBeTruthy();
    expect(screen.getByText('was scheduled Tue 09:00')).toBeTruthy();
  });

  it('offers exactly the four choices', async () => {
    await renderRow();

    expect(screen.getByText('Keep 09:00')).toBeTruthy();
    expect(screen.getByText('Move to pool')).toBeTruthy();
    expect(screen.getByText('Pick new time')).toBeTruthy();
    expect(screen.getByText('Dismiss')).toBeTruthy();
  });

  it('starts on Keep time (D23)', async () => {
    await renderRow();

    expect(isSelected('Keep 09:00')).toBe(true);
    expect(isSelected('Move to the pool')).toBe(false);
    expect(isSelected('Pick a new time')).toBe(false);
    expect(isSelected('Dismiss')).toBe(false);
  });

  it('reports a move to the pool', async () => {
    const { onChoose } = await renderRow();

    await press('Move to pool');

    expect(onChoose).toHaveBeenCalledWith('task-1', { action: 'pool' });
  });

  it('reports a dismissal', async () => {
    const { onChoose } = await renderRow();

    await press('Dismiss');

    expect(onChoose).toHaveBeenCalledWith('task-1', { action: 'dismiss' });
  });

  it('reports the time that was picked', async () => {
    const { onChoose } = await renderRow();

    await press('Pick new time');
    await press('open-picker');

    expect(onChoose).toHaveBeenCalledWith('task-1', { action: 'pick', time: '14:30' });
  });

  it('shows the picked time on the chip once it is chosen', async () => {
    await renderRow({ action: 'pick', time: '14:30' });

    expect(screen.getByText('Pick 14:30')).toBeTruthy();
    expect(isSelected('Pick 14:30')).toBe(true);
  });
});
