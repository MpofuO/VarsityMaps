import { Component, ElementRef, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Building, BuildingModel } from '../../../../types/building';
import { Modal } from '../../../../shared/modal/modal';
import { TextInput } from '../../../../shared/text-input/text-input';

@Component({
  selector: 'app-campus-building',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, TextInput],
  templateUrl: './campus-building.html',
  styleUrl: './campus-building.css',
})
export class CampusBuilding {
  buildings = input.required<Building[]>();
  selectedBuildingId = input<number | null>(null);
  isDrawing = input<boolean>(false);

  startDrawing = output<void>();
  selectBuilding = output<number>();
  createBuilding = output<Omit<BuildingModel, 'boundary'>>();
  updateBuilding = output<{ id: number; model: Omit<BuildingModel, 'boundary'> }>();
  deleteBuilding = output<number>();
  addEntrance = output<Building>();

  private readonly element = inject(ElementRef);
  private readonly fb = new FormBuilder();

  protected isFormOpen = false;
  protected editingBuilding: Building | null = null;
  protected isDeleteOpen = false;
  protected targetBuilding: Building | null = null;

  private nameUniqueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim().toLowerCase();
      if (!value) return null;

      const editingId = this.editingBuilding?.buildingId;
      const conflict = this.buildings().some(
        (b) => b.buildingId !== editingId && b.name.trim().toLowerCase() === value
      );

      return conflict ? { nameTaken: true } : null;
    };
  }

  private aliasUniqueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim().toLowerCase();
      if (!value) return null;

      const editingId = this.editingBuilding?.buildingId;
      const conflict = this.buildings().some(
        (b) => b.buildingId !== editingId && b.alias.trim().toLowerCase() === value
      );

      return conflict ? { aliasTaken: true } : null;
    };
  }

  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, this.nameUniqueValidator()]],
    alias: ['', [Validators.required, this.aliasUniqueValidator()]],
    isAccessible: [true],
    isGuestAccessible: [false]
  });

  constructor() {
    effect(() => {
      const selectedId = this.selectedBuildingId();
      if (selectedId !== null) {
        setTimeout(() => {
          const selectedEl = this.element.nativeElement.querySelector(`#building-${selectedId}`);
          selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });

    effect(() => {
      this.buildings();
      this.form.controls.name.updateValueAndValidity({ onlySelf: true });
      this.form.controls.alias.updateValueAndValidity({ onlySelf: true });
    });
  }

  openCreate(): void {
    this.editingBuilding = null;
    this.form.reset({ name: '', alias: '', isAccessible: true, isGuestAccessible: false });
    this.isFormOpen = true;
  }

  openEdit(building: Building): void {
    this.editingBuilding = building;
    this.form.reset({
      name: building.name,
      alias: building.alias,
      isAccessible: building.isAccessible,
      isGuestAccessible: building.isGuestAccessible
    });
    this.isFormOpen = true;
  }

  public openEditFromParent(id: number): void {
    const building = this.buildings().find((b) => b.buildingId === id);
    if (building) {
      this.openEdit(building);
    }
  }

  requestAddEntrance(building: Building): void {
    this.closeForm();
    this.addEntrance.emit(building);
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.editingBuilding = null;
  }

  submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();

    if (this.editingBuilding) {
      this.updateBuilding.emit({ id: this.editingBuilding.buildingId, model: values });
    } else {
      this.createBuilding.emit(values);
    }
    this.closeForm();
  }

  openDelete(building: Building): void {
    this.targetBuilding = building;
    this.isDeleteOpen = true;
  }

  confirmDelete(): void {
    if (this.targetBuilding) {
      this.deleteBuilding.emit(this.targetBuilding.buildingId);
      this.isDeleteOpen = false;
      this.targetBuilding = null;
    }
  }
}