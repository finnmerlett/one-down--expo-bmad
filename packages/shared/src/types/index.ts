export type HealthStatus = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export * from './ai';
export * from './preference';
export * from './star';
export * from './subtask';
export * from './task';
