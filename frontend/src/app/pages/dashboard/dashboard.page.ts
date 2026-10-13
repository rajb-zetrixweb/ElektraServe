import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../api.service';
import { FeedbackService } from '../../feedback.service';
import { DashboardSummary } from '../../models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(FeedbackService);

  summary: DashboardSummary = {
    totalDevices: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    commandsPending: 0,
    commandsCompleted: 0,
  };
  loading = true;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getSummary().subscribe({
      next: ({ data }) => {
        this.summary = data;
        this.loading = false;
      },
      error: (error: Error) => {
        this.loading = false;
        this.feedback.error(error.message);
      },
    });
  }
}
