import { Component, OnInit, inject, signal } from '@angular/core';
import { UniversityService } from '../../../core/services/university-service';
import { University } from '../../../types/university';
import { Campus } from '../../../types/campus';
import { Modal } from '../../../shared/modal/modal';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-universities',
  standalone: true,
  imports: [Modal],
  templateUrl: './universities.html',
  styleUrl: './universities.css'
})
export class Universities implements OnInit {
  private readonly universityService = inject(UniversityService);
  private readonly toastService = inject(ToastService);

  protected readonly universities = signal<University[]>([]);
  protected readonly selectedUniversity = signal<University | null>(null);
  protected readonly campuses = signal<Campus[] | null>(null);
  protected readonly isDetailOpen = signal(false);

  ngOnInit(): void {
    this.universityService.getUniversities().subscribe({
      next: (universities) => {
        this.universities.set(universities);
      },
      error: (error) => {
        this.toastService.requestError(error, 'Unable to load universities.');
      }
    });
  }

  openDetail(university: University): void {
    this.selectedUniversity.set(university);
    this.campuses.set(null);
    this.isDetailOpen.set(true);

    this.universityService.getCampuses(university.universityId).subscribe({
      next: (campuses) => this.campuses.set(campuses),
      error: (error) => {
        this.campuses.set([]);
        this.toastService.requestError(error, 'Unable to load university campuses.');
      }
    });
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.selectedUniversity.set(null);
    this.campuses.set(null);
  }
}