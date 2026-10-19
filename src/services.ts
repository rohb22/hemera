import { AppError } from '@/lib/errors';
import type { TasksRepository } from '@/repositories/tasks';

export interface Services {
  tasks: TasksRepository;
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
