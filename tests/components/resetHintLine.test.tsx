import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  ResetHintLine,
  resetHintAccessibilityLabel,
  resetHintText,
} from '@/components/ResetHintLine';

/**
 * The quiet line on Today (v1.2, D21/FR-X1).
 *
 * It is the only entry point to the Reset My Day review, so the copy
 * and the accessibility label are pinned here: the line states what is
 * waiting and makes no claim about yesterday.
 */

describe('reset hint line', () => {
  it('says nothing when there is nothing carried over', async () => {
    await render(<ResetHintLine count={0} onPress={jest.fn()} />);

    expect(screen.queryByText(/still waiting/)).toBeNull();
  });

  it('uses the singular for a single task', async () => {
    await render(<ResetHintLine count={1} onPress={jest.fn()} />);

    expect(screen.getByText('1 task is still waiting.')).toBeTruthy();
    expect(resetHintText(1)).toBe('1 task is still waiting.');
  });

  it('uses the plural for several tasks', async () => {
    await render(<ResetHintLine count={3} onPress={jest.fn()} />);

    expect(screen.getByText('3 tasks are still waiting.')).toBeTruthy();
    expect(resetHintText(3)).toBe('3 tasks are still waiting.');
  });

  it('labels itself for a screen reader', async () => {
    await render(<ResetHintLine count={2} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Review 2 tasks that are still waiting')).toBeTruthy();
    expect(resetHintAccessibilityLabel(2)).toBe('Review 2 tasks that are still waiting');
    expect(resetHintAccessibilityLabel(1)).toBe('Review 1 task that is still waiting');
  });

  it('opens the review when pressed', async () => {
    const onPress = jest.fn();
    await render(<ResetHintLine count={1} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('Review 1 task that is still waiting'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('never mentions completions, totals or streaks', async () => {
    expect(resetHintText(4)).not.toMatch(/done|complete|streak|%/i);
    expect(resetHintText(1)).not.toMatch(/done|complete|streak|%/i);
  });
});
