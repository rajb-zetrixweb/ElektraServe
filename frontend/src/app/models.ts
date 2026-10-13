export type HealthStatus = 'Healthy' | 'Warning' | 'Critical';
export type CommandStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';

export interface Device {
  id: number;
  deviceCode: string;
  name: string;
  solutionType: string;
  healthStatus: HealthStatus;
  lastSeenUtc: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface DeviceInput {
  deviceCode: string;
  name: string;
  solutionType: string;
  healthStatus: HealthStatus;
  lastSeenUtc: string | null;
  notes: string | null;
}

export interface DeviceCommand {
  id: number;
  deviceId: number;
  commandType: 'Restart';
  status: CommandStatus;
  requestedAtUtc: string;
  completedAtUtc: string | null;
  failureReason: string | null;
  deviceCode: string;
  deviceName: string;
}

export interface DashboardSummary {
  totalDevices: number;
  healthy: number;
  warning: number;
  critical: number;
  commandsPending: number;
  commandsCompleted: number;
}

export interface ApiResponse<T> {
  data: T;
}
