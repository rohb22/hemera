import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HabitDayCells } from '@/components/HabitDayCells';
import type { Habit, HabitOccurrence } from '@/domain/types';
import { colors } from '@/theme/tokens';

/**
 * Render-level guards for the habit day-cell shape vocabulary
 * (design-system §2.4).
 *
 * The map-level test in `habitDayCells.test.ts` covers the lookup; this
 * one asserts what actually reaches the screen, which is where the
 * "a new habit looked like it already had completed days" bug lived.
 */

// A Monday-start week: 2026-10-19 (Mon) .. 2026-10-25 (Sun).
const weekDates = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
];

const todayKey = '2026-10-22';

/** A habit created on 2026-10-20 (Tuesday), planned every day. */
const habit: Habit = {
  id: 'habit-1',
  name: 'Read',
  daysMask: 127,
  createdAt: new Date('2026-10-20T09:00:00Z').getTime(),
  archivedAt: null,
};

function cell(label: string) {
  return screen.getByLabelText(label);
}

/** The shape is the cell's last child: a plain View with no label of its own. */
function shapeOf(label: string): Record<string, unknown> {
  const children = cell(label).children;
  const shape = children[children.length - 1] as unknown as { props: { style: unknown } };
  return StyleSheet.flatten(shape.props.style) as Record<string, unknown>;
}

/** The weekday letter is the cell's first child. */
function letterColorOf(label: string): string | undefined {
  const letter = cell(label).children[0] as unknown as { props: { style: unknown } };
  return (StyleSheet.flatten(letter.props.style) as { color?: string })?.color;
}

function renderCells(occurrences: HabitOccurrence[] = []) {
  return render(
    <HabitDayCells
      habit={habit}
      weekDates={weekDates}
      todayKey={todayKey}
      occurrences={occurrences}
    />,
  );
}

describe('habit day cells (rendered)', () => {
  it('draws a day before the habit existed as an inactive ring, not a filled dot', async () => {
    await renderCells();

    // Monday, before the habit existed.
    const style = shapeOf('Monday, not planned');
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderWidth).toBeGreaterThan(0);
    expect(style.borderColor).toBe(colors.hairline);
  });

  it('keeps the weekday letter faint on a pre-creation day', async () => {
    await renderCells();
    expect(letterColorOf('Monday, not planned')).toBe(colors.inkFaint);
  });

  it('draws a completed day as a filled accent dot', async () => {
    await renderCells([
      { habitId: 'habit-1', date: '2026-10-21', state: 'done', updatedAt: 0 },
    ]);

    const style = shapeOf('Wednesday, done');
    expect(style.backgroundColor).toBe(colors.accent);
    expect(style.borderWidth).toBe(0);
  });

  it('draws a missed planned day as a small faint dot, never the accent fill', async () => {
    await renderCells();

    // Tuesday is the creation day itself: planned, in the past, no record.
    const style = shapeOf('Tuesday, missed');
    expect(style.backgroundColor).toBe(colors.inkFaint);
    expect(style.backgroundColor).not.toBe(colors.accent);
    expect(style.width).toBe(8);
  });

  it('never paints a pre-creation day with the done accent', async () => {
    await renderCells();

    const style = shapeOf('Monday, not planned');
    expect(style.backgroundColor).not.toBe(colors.accent);
  });

  it('shows a future planned day as an empty ring', async () => {
    await renderCells();

    const style = shapeOf('Sunday, not yet');
    expect(style.backgroundColor).toBe('transparent');
    expect(style.backgroundColor).not.toBe(colors.accent);
  });

  it('shows today as an empty ring, not a filled dot', async () => {
    await renderCells();

    const style = shapeOf('Thursday, not yet');
    expect(style.backgroundColor).toBe('transparent');
    expect(style.backgroundColor).not.toBe(colors.accent);
  });
});
