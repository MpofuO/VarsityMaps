import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UniversityService } from '../../../core/services/university-service';
import { Application } from '../../../types/application';
import { Modal } from '../../../shared/modal/modal';
import { ToastService } from '../../../core/services/toast-service';

export type ApplicationFilter = 'pending' | 'approved' | 'rejected' | 'all';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [Modal, DatePipe],
  templateUrl: './applications.html',
  styleUrl: './applications.css'
})
export class Applications implements OnInit {
  private readonly universityService = inject(UniversityService);
  private readonly toastService = inject(ToastService);

  protected readonly applications = signal<Application[]>([]);
  protected readonly filter = signal<ApplicationFilter>('pending');
  protected readonly targetApplication = signal<Application | null>(null);
  protected readonly isRejectOpen = signal(false);
  protected readonly rejectionReason = signal('');

  protected readonly pendingCount = computed(() =>
    this.applications().filter((a) => a.isApproved === null).length
  );

  protected readonly filteredApplications = computed(() => {
    const list = this.applications();
    switch (this.filter()) {
      case 'pending': return list.filter((a) => a.isApproved === null);
      case 'approved': return list.filter((a) => a.isApproved === true);
      case 'rejected': return list.filter((a) => a.isApproved === false);
      default: return list;
    }
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.universityService.getApplications().subscribe({
      next: (applications) => this.applications.set(applications),
      error: (error) => {
        this.toastService.requestError(error, 'Unable to load applications.');
      }
    });
  }

  setFilter(status: ApplicationFilter): void {
    this.filter.set(status);
  }

  approve(application: Application): void {
    this.universityService.adjudicate(application.applicationId, true).subscribe({
      next: () => {
        this.toastService.success(`${application.universityName} approved.`);
        this.load();
      },
      error: (error) => {
        this.toastService.requestError(error, `Unable to approve ${application.universityName}.`);
      }
    });
  }

  openReject(application: Application): void {
    this.targetApplication.set(application);
    this.rejectionReason.set('');
    this.isRejectOpen.set(true);
  }

  closeReject(): void {
    this.isRejectOpen.set(false);
    this.targetApplication.set(null);
    this.rejectionReason.set('');
  }

  confirmReject(): void {
    const application = this.targetApplication();
    if (!application || !this.rejectionReason().trim()) {
      return;
    }

    this.universityService.adjudicate(application.applicationId, false, this.rejectionReason().trim()).subscribe({
      next: () => {
        this.toastService.success(`${application.universityName} rejected.`);
        this.closeReject();
        this.load();
      },
      error: (error) => {
        this.toastService.requestError(error, `Unable to reject ${application.universityName}.`);
      }
    });
  }
}