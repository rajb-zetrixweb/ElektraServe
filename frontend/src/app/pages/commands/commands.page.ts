import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../api.service';
import { FeedbackService } from '../../feedback.service';
import { CommandStatus, DeviceCommand } from '../../models';

@Component({
  selector: 'app-commands-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './commands.page.html',
  styleUrl: './commands.page.css',
})
export class CommandsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(FeedbackService);

  readonly statuses: CommandStatus[] = ['Pending', 'Completed', 'Failed', 'Cancelled'];
  commands: DeviceCommand[] = [];
  status = '';
  search = '';
  page = 1;
  pageSize = 5;
  loading = true;
  busy = false;
  failCommand: DeviceCommand | null = null;
  readonly failureForm = this.fb.nonNullable.group({
    failureReason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  get filteredCommands(): DeviceCommand[] {
    const term = this.search.trim().toLowerCase();
    return this.commands.filter(
      (item) =>
        !term ||
        item.deviceCode.toLowerCase().includes(term) ||
        item.deviceName.toLowerCase().includes(term) ||
        `cmd-${item.id.toString().padStart(4, '0')}`.includes(term),
    );
  }
  get pagedCommands(): DeviceCommand[] {
    return this.filteredCommands.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCommands.length / this.pageSize));
  }
  get rangeStart(): number {
    return this.filteredCommands.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredCommands.length);
  }
  get visiblePages(): number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - 4));
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  ngOnInit(): void {
    this.load();
  }

  load(resetPage = false): void {
    if (resetPage) this.page = 1;
    this.loading = true;
    this.api.getCommands(this.status).subscribe({
      next: ({ data }) => {
        this.commands = data;
        this.page = Math.min(
          this.page,
          Math.max(1, Math.ceil(this.filteredCommands.length / this.pageSize)),
        );
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.feedback.error(error.message);
      },
    });
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.page = page;
  }
  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 1;
  }
  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.load(true);
  }
  openFail(command: DeviceCommand): void {
    this.failCommand = command;
    this.failureForm.reset();
  }
  closeFail(): void {
    this.failCommand = null;
  }

  submitFailure(): void {
    if (!this.failCommand || this.failureForm.invalid) {
      this.failureForm.markAllAsTouched();
      return;
    }
    this.run(this.failCommand, 'fail', this.failureForm.getRawValue().failureReason.trim());
  }

  transition(command: DeviceCommand, action: 'complete' | 'cancel'): void {
    this.run(command, action);
  }

  trackById(_index: number, item: DeviceCommand): number {
    return item.id;
  }
  formatDate(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(value),
        )
      : '—';
  }

  private run(
    command: DeviceCommand,
    action: 'complete' | 'fail' | 'cancel',
    failureReason?: string,
  ): void {
    this.busy = true;
    this.api.transitionCommand(command.id, action, failureReason).subscribe({
      next: () => {
        this.busy = false;
        this.closeFail();
        this.feedback.success(
          `Command ${action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'marked failed'}.`,
        );
        this.load();
      },
      error: (error: Error) => {
        this.busy = false;
        this.feedback.error(error.message);
      },
    });
  }
}
