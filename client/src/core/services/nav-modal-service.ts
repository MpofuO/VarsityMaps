import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountService, StandardUserRole } from './account-service';
import { UniversityService } from './university-service';
import { ToastService } from './toast-service';
import { Campus } from '../../types/campus';
import { University } from '../../types/university';

@Injectable({ providedIn: 'root' })
export class NavModalService implements OnDestroy {
  private readonly accountService = inject(AccountService);
  private readonly universityService = inject(UniversityService);
  private readonly toastService = inject(ToastService);

  private dataSub?: Subscription;

  readonly isSwitchCampusOpen = signal(false);
  readonly isSwitchInstitutionOpen = signal(false);
  readonly campusSearchQuery = signal('');
  readonly institutionSearchQuery = signal('');
  readonly availableCampuses = signal<Campus[]>([]);
  readonly universities = signal<University[]>([]);

  readonly isStandardUser = computed(() => {
    const roles = this.accountService.currentUser()?.roles ?? [];
    return roles.includes(StandardUserRole);
  });

  readonly filteredCampusOptions = computed(() => {
    const query = this.campusSearchQuery().trim().toLowerCase();
    const currentCampusId = this.accountService.currentUser()?.campusId;
    const list = this.availableCampuses().filter((c) => c.campusId !== currentCampusId);
    if (!query) return list;
    return list.filter((c) => c.name.toLowerCase().includes(query) || c.alias?.toLowerCase().includes(query));
  });

  readonly filteredInstitutionOptions = computed(() => {
    const query = this.institutionSearchQuery().trim().toLowerCase();
    const currentUniId = this.accountService.currentUser()?.universityId;
    const list = this.universities().filter((u) => u.universityId !== currentUniId);
    if (!query) return list;
    return list.filter((u) => u.name.toLowerCase().includes(query) || u.alias?.toLowerCase().includes(query));
  });

  constructor() {
    effect(() => this.initDataLoad());
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }

  private initDataLoad(): void {
    const user = this.accountService.currentUser();
    if (!user || !this.isStandardUser()) return;

    this.dataSub?.unsubscribe();
    this.dataSub = new Subscription();

    this.dataSub.add(
      this.universityService.getUniversities().subscribe({
        next: (universities) => this.universities.set(universities),
        error: () => this.toastService.error('Failed to load universities.')
      })
    );

    if (user.universityId) {
      this.dataSub.add(
        this.universityService.getCampuses(user.universityId).subscribe({
          next: (campuses) => this.availableCampuses.set(campuses),
          error: () => this.toastService.error('Failed to load campuses.')
        })
      );
    }
  }

  openSwitchCampus(): void {
    if (!this.isStandardUser()) return;
    this.campusSearchQuery.set('');
    this.isSwitchCampusOpen.set(true);
  }

  closeSwitchCampus(): void {
    this.isSwitchCampusOpen.set(false);
  }

  selectCampus(campus: Campus): void {
    this.accountService.switchCampus(campus.campusId).subscribe({
      next: () => {
        this.closeSwitchCampus();
        this.toastService.success(`Switched to ${campus.name}`);
      },
      error: () => this.toastService.error('Failed to switch campus.')
    });
  }

  openSwitchInstitution(): void {
    if (!this.isStandardUser()) return;
    this.institutionSearchQuery.set('');
    this.isSwitchInstitutionOpen.set(true);
  }

  closeSwitchInstitution(): void {
    this.isSwitchInstitutionOpen.set(false);
  }

  selectInstitution(university: University): void {
    this.universityService.getCampuses(university.universityId).subscribe({
      next: (campuses) => {
        if (campuses.length === 0) {
          this.toastService.error(`${university.name} has no campuses available.`);
          return;
        }

        this.accountService.switchInstitution(university.universityId).subscribe({
          next: () => {
            this.closeSwitchInstitution();
            this.toastService.success(`Switched to ${university.name}`);
          },
          error: () => this.toastService.error('Failed to switch institution.')
        });
      },
      error: () => this.toastService.error('Unable to fetch institution campuses.')
    });
  }
}