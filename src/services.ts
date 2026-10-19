import { AppError } from '@/lib/errors';
import type { HabitsRepository } from '@/repositories/habits';
import type { TasksRepository } from '@/repositories/tasks';

export interface Services {
  tasks: TasksRepository;
  habits: HabitsRepository;
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
