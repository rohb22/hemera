import type { Task } from './types';

export type PoolSection = 'reschedule' | 'attention' | 'pool' | 'later';

export function taskPoolSection(task: Task, _today: string, _now: Date): PoolSection | null {
  if (task.status === 'done') return null;
  return 'pool';
}
