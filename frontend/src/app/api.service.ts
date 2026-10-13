import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  ApiResponse,
  CommandStatus,
  DashboardSummary,
  Device,
  DeviceCommand,
  DeviceInput,
  HealthStatus,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api';

  getDevices(search = '', status = ''): Observable<ApiResponse<Device[]>> {
    let params = new HttpParams();
    if (search.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    return this.request(this.http.get<ApiResponse<Device[]>>(`${this.api}/devices`, { params }));
  }

  createDevice(device: DeviceInput): Observable<ApiResponse<Device>> {
    return this.request(this.http.post<ApiResponse<Device>>(`${this.api}/devices`, device));
  }

  updateDevice(id: number, device: DeviceInput): Observable<ApiResponse<Device>> {
    return this.request(this.http.put<ApiResponse<Device>>(`${this.api}/devices/${id}`, device));
  }

  deleteDevice(id: number): Observable<ApiResponse<{ id: number; deleted: boolean }>> {
    return this.request(
      this.http.delete<ApiResponse<{ id: number; deleted: boolean }>>(`${this.api}/devices/${id}`),
    );
  }

  setHealth(id: number, healthStatus: HealthStatus): Observable<ApiResponse<Device>> {
    return this.request(
      this.http.post<ApiResponse<Device>>(`${this.api}/devices/${id}/health-status`, {
        healthStatus,
      }),
    );
  }

  getCommands(status = ''): Observable<ApiResponse<DeviceCommand[]>> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.request(
      this.http.get<ApiResponse<DeviceCommand[]>>(`${this.api}/commands`, { params }),
    );
  }

  queueRestart(deviceId: number): Observable<ApiResponse<DeviceCommand>> {
    return this.request(
      this.http.post<ApiResponse<DeviceCommand>>(`${this.api}/commands`, {
        deviceId,
        commandType: 'Restart',
      }),
    );
  }

  transitionCommand(
    id: number,
    action: 'complete' | 'fail' | 'cancel',
    failureReason?: string,
  ): Observable<ApiResponse<DeviceCommand>> {
    return this.request(
      this.http.post<ApiResponse<DeviceCommand>>(
        `${this.api}/commands/${id}/${action}`,
        failureReason ? { failureReason } : {},
      ),
    );
  }

  getSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.request(
      this.http.get<ApiResponse<DashboardSummary>>(`${this.api}/dashboard/summary`),
    );
  }

  private request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      catchError((error: HttpErrorResponse) => {
        const apiError = error.error?.error;
        return throwError(() => new Error(apiError || 'Unable to reach the diagnostics service.'));
      }),
    );
  }
}
