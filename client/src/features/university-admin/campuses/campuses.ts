import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CampusService } from '../../../core/services/campus-service';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { Campus } from '../../../types/campus';
import { Modal } from '../../../shared/modal/modal';
import { TextInput } from '../../../shared/text-input/text-input';
import { CoordinatePicker } from '../../../shared/coordinate-picker/coordinate-picker';

@Component({
  selector: 'app-campuses',
  standalone: true,
  imports: [Modal, TextInput, ReactiveFormsModule, CoordinatePicker],
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

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    alias: ['', Validators.required],
    latitude: [0, Validators.required],
    longitude: [0, Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const universityId = this.accountService.currentUser()?.universityId;
    this.campusService.getCampuses().subscribe({
      next: (campuses) => this.campuses.set(campuses.filter((c) => c.universityId === universityId))
    });
  }

  openCreate(): void {
    this.editingCampus.set(null);
    this.form.reset({ name: '', alias: '', latitude: 0, longitude: 0 });
    this.isFormOpen.set(true);
  }

  openEdit(campus: Campus): void {
    this.editingCampus.set(campus);
    this.form.reset({
      name: campus.name,
      alias: campus.alias,
      latitude: campus.center.coordinates[1],
      longitude: campus.center.coordinates[0]
    });
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingCampus.set(null);
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
      }
    });
  }
}