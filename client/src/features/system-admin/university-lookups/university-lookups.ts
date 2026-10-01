import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast-service';
import { UniversityLookupService } from '../../../core/services/university-lookup-service';
import { UniversityLookup, UniversityLookupInput } from '../../../types/university-lookup';
import { CoordinatePicker } from '../../../shared/map/coordinate-picker/coordinate-picker';

@Component({
  selector: 'app-university-lookups',
  standalone: true,
  imports: [CoordinatePicker],
  templateUrl: './university-lookups.html',
  styleUrl: './university-lookups.css'
})
export class UniversityLookups implements OnInit {
  private readonly lookupService = inject(UniversityLookupService);
  private readonly toastService = inject(ToastService);

  protected readonly lookups = signal<UniversityLookup[] | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly selectedLookup = signal<UniversityLookup | null>(null);
  protected readonly isEditorOpen = signal(false);
  protected readonly name = signal('');
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
      error: () => this.lookups.set([])
    });
  }

  openCreate(): void {
    this.selectedLookup.set(null);
    this.name.set('');
    this.latitude.set(null);
    this.longitude.set(null);
    this.isEditorOpen.set(true);
  }

  openEdit(lookup: UniversityLookup): void {
    this.selectedLookup.set(lookup);
    this.name.set(lookup.name);
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
    const name = this.name().trim();
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
      error: () => this.isSaving.set(false)
    });
  }

  delete(lookup: UniversityLookup): void {
    if (!window.confirm(`Delete the lookup for "${lookup.name}"?`)) return;

    this.lookupService.delete(lookup.universityLookupId).subscribe({
      next: () => {
        this.lookups.update((items) =>
          (items ?? []).filter((item) => item.universityLookupId !== lookup.universityLookupId)
        );
        this.toastService.success('Location lookup deleted.');
      }
    });
  }
}