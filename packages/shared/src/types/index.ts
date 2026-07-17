export type HealthStatus = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export * from './ai';
export * from './task';
