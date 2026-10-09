import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../core/services/toast-service';
import { UniversityLookupService } from '../../../core/services/university-lookup-service';
import { UniversityLookup, UniversityLookupInput } from '../../../types/university-lookup';
import { CoordinatePicker } from '../../../shared/map/coordinate-picker/coordinate-picker';
import { Modal } from '../../../shared/modal/modal';
import { TextInput } from '../../../shared/text-input/text-input';

@Component({
  selector: 'app-university-lookups',
  standalone: true,
  imports: [CoordinatePicker, Modal, ReactiveFormsModule, TextInput],
  templateUrl: './university-lookups.html',
  styleUrl: './university-lookups.css'
})
export class UniversityLookups implements OnInit {
  private readonly lookupService = inject(UniversityLookupService);
  private readonly toastService = inject(ToastService);

  protected readonly lookups = signal<UniversityLookup[] | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly selectedLookup = signal<UniversityLookup | null>(null);
  protected readonly lookupToDelete = signal<UniversityLookup | null>(null);
  protected readonly isEditorOpen = signal(false);
  protected readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] });
  protected readonly latitude = signal<number | null>(null);
  protected readonly longitude = signal<number | null>(null);
  protected readonly isPickerOpen = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly filteredLookups = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const lookups = this.lookups() ?? [];
    return query ? lookups.filter((lookup) => lookup.name.toLowerCase().includes(query)) : lookups;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.lookupService.getAll().subscribe({
      next: (lookups) => this.lookups.set(lookups),
      error: (error) => {
        this.lookups.set([]);
        this.toastService.requestError(error, 'Unable to load location lookups.');
      }
    });
  }

  openCreate(): void {
    this.selectedLookup.set(null);
    this.name.reset('');
    this.latitude.set(null);
    this.longitude.set(null);
    this.isEditorOpen.set(true);
  }

  openEdit(lookup: UniversityLookup): void {
    this.selectedLookup.set(lookup);
    this.name.reset(lookup.name);
    this.latitude.set(lookup.latitude);
    this.longitude.set(lookup.longitude);
    this.isEditorOpen.set(true);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
    this.selectedLookup.set(null);
  }

  onLocationPicked(point: { latitude: number; longitude: number }): void {
    this.latitude.set(point.latitude);
    this.longitude.set(point.longitude);
    this.isPickerOpen.set(false);
  }

  save(): void {
    const name = this.name.value.trim();
    const latitude = this.latitude();
    const longitude = this.longitude();
    if (!name || latitude === null || longitude === null) return;

    const model: UniversityLookupInput = { name, latitude, longitude };
    const selected = this.selectedLookup();
    this.isSaving.set(true);
    const request = selected
      ? this.lookupService.update(selected.universityLookupId, model)
      : this.lookupService.create(model);

    request.subscribe({
      next: (saved) => {
        this.lookups.update((items) =>
          [...(items ?? []).filter((item) => item.universityLookupId !== saved.universityLookupId), saved]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        this.toastService.success(selected ? 'Location lookup updated.' : 'Location lookup added.');
        this.isSaving.set(false);
        this.closeEditor();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.toastService.requestError(error, selected ? 'Unable to update location lookup.' : 'Unable to add location lookup.');
      }
    });
  }

  requestDelete(lookup: UniversityLookup): void {
    this.lookupToDelete.set(lookup);
  }

  closeDeleteConfirmation(): void {
    this.lookupToDelete.set(null);
  }

  confirmDelete(): void {
    const lookup = this.lookupToDelete();
    if (!lookup) return;

    this.lookupService.delete(lookup.universityLookupId).subscribe({
      next: () => {
        this.lookups.update((items) =>
          (items ?? []).filter((item) => item.universityLookupId !== lookup.universityLookupId)
        );
        this.toastService.success('Location lookup deleted.');
        this.closeDeleteConfirmation();
      },
      error: (error) => {
        this.toastService.requestError(error, 'Unable to delete location lookup.');
      }
    });
  }
}