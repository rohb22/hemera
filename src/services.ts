import { AppError } from '@/lib/errors';
import type { HabitsRepository } from '@/repositories/habits';
import type { ResetsRepository } from '@/repositories/resets';
import type { SettingsRepository } from '@/repositories/settings';
import type { TasksRepository } from '@/repositories/tasks';

export interface Services {
  tasks: TasksRepository;
  habits: HabitsRepository;
  settings: SettingsRepository;
  resets: ResetsRepository;
}

let services: Services | null = null;

export function setServices(next: Services): void {
  services = next;
}

export function getServices(): Services {
  if (!services) {
    throw new AppError('read', 'Services have not been initialized');
  }
  return services;
}
