import { SHAPE_BY_STATE } from '@/components/HabitDayCells';
import { colors } from '@/theme/tokens';

/**
 * The habit day-cell shape vocabulary (design-system §2.4).
 *
 * Regression guard for the v1.1 bug where a day that predated the habit
 * was drawn with the same filled dot as `done`, so a brand-new habit looked
 * like it already had completed days.
 */
describe('habit day-cell shapes', () => {
  it('marks done with the filled accent circle', () => {
    expect(SHAPE_BY_STATE.done).toEqual({ size: 12, kind: 'fill', color: colors.accent });
  });

  it('draws a pre-creation day as an inactive ring, never a filled dot', () => {
    expect(SHAPE_BY_STATE.neutral.kind).toBe('ring');
    expect(SHAPE_BY_STATE.neutral.color).toBe(colors.hairline);
  });

  it('keeps missed distinct from done: small and faint, not accent', () => {
    expect(SHAPE_BY_STATE.missed).toEqual({ size: 8, kind: 'fill', color: colors.inkFaint });
    expect(SHAPE_BY_STATE.missed.color).not.toBe(SHAPE_BY_STATE.done.color);
  });

  it('uses a ring for the not-yet and skipped states', () => {
    expect(SHAPE_BY_STATE.pending.kind).toBe('ring');
    expect(SHAPE_BY_STATE.skipped.kind).toBe('ring');
  });

  it('only ever fills a dot for done and missed', () => {
    const filled = Object.entries(SHAPE_BY_STATE)
      .filter(([, shape]) => shape.kind === 'fill')
      .map(([state]) => state)
      .sort();
    expect(filled).toEqual(['done', 'missed']);
  });
});
