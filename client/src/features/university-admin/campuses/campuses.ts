import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CampusService } from '../../../core/services/campus-service';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { Campus } from '../../../types/campus';
import { Modal } from '../../../shared/modal/modal';
import { TextInput } from '../../../shared/text-input/text-input';
import { CoordinatePicker } from '../../../shared/map/coordinate-picker/coordinate-picker';
import { DecimalPipe } from '@angular/common';
import { CampusAdminDetails } from '../../../types/campus-admin-details';

@Component({
  selector: 'app-campuses',
  standalone: true,
  imports: [Modal, TextInput, ReactiveFormsModule, CoordinatePicker, DecimalPipe],
  templateUrl: './campuses.html',
  styleUrl: './campuses.css'
})
export class Campuses implements OnInit {
  private readonly campusService = inject(CampusService);
  private readonly accountService = inject(AccountService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly campuses = signal<Campus[] | null>(null);
  protected readonly isFormOpen = signal(false);
  protected readonly editingCampus = signal<Campus | null>(null);
  protected readonly isPickerOpen = signal(false);
  protected readonly adminCampus = signal<Campus | null>(null);
  protected readonly campusAdmin = signal<CampusAdminDetails | null>(null);
  protected readonly isLoadingAdmin = signal(false);
  protected readonly isCampusAdminOpen = signal(false);
  protected readonly isUnassignConfirmOpen = signal(false);

  private nameUniqueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim().toLowerCase();
      if (!value) return null;

      const editingId = this.editingCampus()?.campusId;
      const conflict = (this.campuses() ?? []).some(
        (c) => c.campusId !== editingId && c.name.trim().toLowerCase() === value
      );

      return conflict ? { nameTaken: true } : null;
    };
  }

  private aliasUniqueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim().toLowerCase();
      if (!value) return null;

      const editingId = this.editingCampus()?.campusId;
      const conflict = (this.campuses() ?? []).some(
        (c) => c.campusId !== editingId && c.alias.trim().toLowerCase() === value
      );

      return conflict ? { aliasTaken: true } : null;
    };
  }

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, this.nameUniqueValidator()]],
    alias: ['', [Validators.required, this.aliasUniqueValidator()]],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]]
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const universityId = this.accountService.currentUser()?.universityId;
    this.campusService.getCampuses().subscribe({
      next: (campuses) => {
        this.campuses.set(campuses.filter((c) => c.universityId === universityId));
        this.form.controls.name.updateValueAndValidity({ onlySelf: true });
        this.form.controls.alias.updateValueAndValidity({ onlySelf: true });
      },
      error: (error) => {
        this.toastService.requestError(error, 'Unable to load campuses.');
      }
    });
  }

  openCreate(): void {
    this.editingCampus.set(null);
    this.form.reset({ name: '', alias: '', latitude: 0, longitude: 0 });
    this.isFormOpen.set(true);
  }

  openEdit(campus: Campus): void {
    this.editingCampus.set(campus);
    this.adminCampus.set(campus);
    this.form.reset({
      name: campus.name,
      alias: campus.alias,
      latitude: campus.center.coordinates[1],
      longitude: campus.center.coordinates[0]
    });
    this.isFormOpen.set(true);
    this.loadCampusAdmin(campus.campusId);
  }

  openCampusAdmin(campus: Campus): void {
    this.adminCampus.set(campus);
    this.isCampusAdminOpen.set(true);
    this.loadCampusAdmin(campus.campusId);
  }

  closeCampusAdmin(): void {
    this.isCampusAdminOpen.set(false);
    this.adminCampus.set(null);
    this.campusAdmin.set(null);
    this.isLoadingAdmin.set(false);
  }

  private loadCampusAdmin(campusId: number): void {
    this.campusAdmin.set(null);
    this.isLoadingAdmin.set(true);
    this.campusService.getCampusAdmin(campusId).subscribe({
      next: (admin) => {
        if (this.adminCampus()?.campusId !== campusId) return;
        this.campusAdmin.set(admin);
        this.isLoadingAdmin.set(false);
      },
      error: (error) => {
        if (this.adminCampus()?.campusId === campusId) {
          this.isLoadingAdmin.set(false);
        }
        this.toastService.requestError(error, 'Unable to load campus administrator details.');
      }
    });
  }

  toggleSuspend(): void {
    const campus = this.adminCampus();
    const admin = this.campusAdmin();
    if (!campus || !admin) return;

    const suspend = admin.isActive;
    this.campusService.suspendAdmin(campus.campusId, suspend).subscribe({
      next: () => {
        this.toastService.success(suspend ? 'Admin suspended.' : 'Suspension revoked.');
        this.loadCampusAdmin(campus.campusId);
      },
      error: (error) => {
        this.toastService.requestError(error, suspend ? 'Unable to suspend admin.' : 'Unable to revoke suspension.');
      }
    });
  }

  openUnassignConfirm(): void {
    this.isUnassignConfirmOpen.set(true);
  }

  closeUnassignConfirm(): void {
    this.isUnassignConfirmOpen.set(false);
  }

  confirmUnassign(): void {
    const campus = this.adminCampus();
    if (!campus) return;

    this.campusService.unassignAdmin(campus.campusId).subscribe({
      next: () => {
        this.toastService.success('Admin unassigned — the account has been deleted.');
        this.campusAdmin.set(null);
        this.closeUnassignConfirm();
      },
      error: (error) => {
        this.toastService.requestError(error, 'Unable to unassign campus admin.');
      }
    });
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingCampus.set(null);
    this.adminCampus.set(null);
    this.campusAdmin.set(null);
  }

  openPicker(): void {
    this.isPickerOpen.set(true);
  }

  closePicker(): void {
    this.isPickerOpen.set(false);
  }

  onLocationPicked(point: { latitude: number; longitude: number }): void {
    this.form.patchValue({ latitude: point.latitude, longitude: point.longitude });
    this.isPickerOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { name, alias, latitude, longitude } = this.form.getRawValue();
    const model = {
      name,
      alias,
      center: { type: 'Point' as const, coordinates: [longitude, latitude] as [number, number] }
    };

    const editing = this.editingCampus();
    const request = editing
      ? this.campusService.updateCampus(editing.campusId, model)
      : this.campusService.createCampus(model);

    request.subscribe({
      next: () => {
        this.toastService.success(editing ? 'Campus updated.' : 'Campus created.');
        this.closeForm();
        this.load();
      },
      error: (error) => {
        this.toastService.requestError(error, editing ? 'Unable to update campus.' : 'Unable to create campus.');
      }
    });
  }
}