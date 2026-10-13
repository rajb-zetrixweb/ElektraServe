import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../api.service';
import { FeedbackService } from '../../feedback.service';
import { Device, DeviceInput, HealthStatus } from '../../models';

@Component({
  selector: 'app-devices-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './devices.page.html',
  styleUrl: './devices.page.css',
})
export class DevicesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly searchChanges = new Subject<string>();

  readonly healthStatuses: HealthStatus[] = ['Healthy', 'Warning', 'Critical'];
  devices: Device[] = [];
  search = '';
  status = '';
  page = 1;
  pageSize = 5;
  loading = true;
  saving = false;
  busy = '';
  modalMode: 'add' | 'edit' | 'view' | null = null;
  selected: Device | null = null;

  readonly form = this.fb.nonNullable.group({
    deviceCode: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    solutionType: ['', [Validators.required, Validators.maxLength(30)]],
    healthStatus: ['Healthy' as HealthStatus, Validators.required],
    lastSeenUtc: [''],
    notes: [''],
  });

  get pagedDevices(): Device[] {
    return this.devices.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.devices.length / this.pageSize));
  }
  get rangeStart(): number {
    return this.devices.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.devices.length);
  }
  get visiblePages(): number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - 4));
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(true));
    this.load();
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.searchChanges.next(value.trim());
  }

  load(resetPage = false): void {
    if (resetPage) this.page = 1;
    this.loading = true;
    this.api.getDevices(this.search, this.status).subscribe({
      next: ({ data }) => {
        this.devices = data;
        this.page = Math.min(this.page, Math.max(1, Math.ceil(data.length / this.pageSize)));
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.feedback.error(error.message);
      },
    });
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.load(true);
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.page = page;
  }
  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 1;
  }

  openAdd(): void {
    this.selected = null;
    this.modalMode = 'add';
    this.form.enable();
    this.form.reset({
      deviceCode: '',
      name: '',
      solutionType: '',
      healthStatus: 'Healthy',
      lastSeenUtc: '',
      notes: '',
    });
  }

  openEdit(device: Device): void {
    this.selected = device;
    this.modalMode = 'edit';
    this.form.enable();
    this.fillForm(device);
  }

  openView(device: Device): void {
    this.selected = device;
    this.modalMode = 'view';
    this.fillForm(device);
    this.form.disable();
  }

  closeModal(): void {
    this.modalMode = null;
    this.selected = null;
    this.form.enable();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input: DeviceInput = {
      deviceCode: raw.deviceCode.trim(),
      name: raw.name.trim(),
      solutionType: raw.solutionType.trim(),
      healthStatus: raw.healthStatus,
      lastSeenUtc: raw.lastSeenUtc ? new Date(raw.lastSeenUtc).toISOString() : null,
      notes: raw.notes.trim() || null,
    };
    this.saving = true;
    const request =
      this.modalMode === 'edit' && this.selected
        ? this.api.updateDevice(this.selected.id, input)
        : this.api.createDevice(input);
    request.subscribe({
      next: () => {
        const message = this.modalMode === 'edit' ? 'Device updated.' : 'Device added.';
        this.saving = false;
        this.closeModal();
        this.feedback.success(message);
        this.load();
      },
      error: (error: Error) => {
        this.saving = false;
        this.feedback.error(error.message);
      },
    });
  }

  queueRestart(device: Device): void {
    this.busy = `restart-${device.id}`;
    this.api.queueRestart(device.id).subscribe({
      next: () => {
        this.busy = '';
        this.feedback.success(`Restart queued for ${device.deviceCode}.`);
      },
      error: (error: Error) => {
        this.busy = '';
        this.feedback.error(error.message);
      },
    });
  }

  changeHealth(device: Device, value: HealthStatus): void {
    if (value === device.healthStatus) return;
    this.busy = `health-${device.id}`;
    this.api.setHealth(device.id, value).subscribe({
      next: () => {
        this.busy = '';
        this.feedback.success(`${device.deviceCode} marked ${value}.`);
        this.load();
      },
      error: (error: Error) => {
        this.busy = '';
        this.feedback.error(error.message);
        this.load();
      },
    });
  }

  async deleteDevice(device: Device): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Delete device?',
      message: `${device.deviceCode} — ${device.name} will be permanently removed. Its related demo commands will also be deleted.`,
      confirmLabel: 'Delete Device',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.busy = `delete-${device.id}`;
    this.api.deleteDevice(device.id).subscribe({
      next: () => {
        this.busy = '';
        this.feedback.success(`${device.deviceCode} was deleted.`);
        this.load();
      },
      error: (error: Error) => {
        this.busy = '';
        this.feedback.error(error.message);
      },
    });
  }

  invalid(field: 'deviceCode' | 'name' | 'solutionType' | 'healthStatus'): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  trackById(_index: number, item: Device): number {
    return item.id;
  }
  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(value),
        )
      : 'Never';
  }

  private fillForm(device: Device): void {
    this.form.reset({
      deviceCode: device.deviceCode,
      name: device.name,
      solutionType: device.solutionType,
      healthStatus: device.healthStatus,
      lastSeenUtc: device.lastSeenUtc ? this.localDate(device.lastSeenUtc) : '',
      notes: device.notes || '',
    });
  }

  private localDate(value: string): string {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}
