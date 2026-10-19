import { useUiStore } from '@/stores/uiStore';

describe('date navigation (D4/FR-D2)', () => {
  it('starts on today', () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(useUiStore.getState().viewDate).toBe(expected);
  });

  it('shifts days forward and back across month boundaries', () => {
    useUiStore.getState().setViewDate('2026-11-01');
    useUiStore.getState().shiftViewDate(-1);
    expect(useUiStore.getState().viewDate).toBe('2026-10-31');
    useUiStore.getState().shiftViewDate(1);
    expect(useUiStore.getState().viewDate).toBe('2026-11-01');
  });

  it('returns to today from any past day', () => {
    useUiStore.getState().setViewDate('2026-01-15');
    useUiStore.getState().goToday();

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(useUiStore.getState().viewDate).toBe(expected);
  });
});
