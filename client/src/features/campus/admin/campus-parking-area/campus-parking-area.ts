import { Component, ElementRef, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ParkingArea, ParkingAreaModel } from '../../../../types/parking-area';
import { Modal } from '../../../../shared/modal/modal';
import { TextInput } from '../../../../shared/text-input/text-input';

@Component({
  selector: 'app-campus-parking-area',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, TextInput],
  templateUrl: './campus-parking-area.html',
  styleUrl: './campus-parking-area.css'
})
export class CampusParkingArea {
  parkingAreas = input.required<ParkingArea[]>();
  selectedParkingAreaId = input<number | null>(null);
  isDrawing = input<boolean>(false);

  startDrawing = output<void>();
  selectParkingArea = output<number>();
  createParkingArea = output<Omit<ParkingAreaModel, 'boundary'>>();
  updateParkingArea = output<{ id: number; model: Omit<ParkingAreaModel, 'boundary'> }>();
  deleteParkingArea = output<number>();
  addAccessNode = output<ParkingArea>();

  private readonly element = inject(ElementRef);
  private readonly fb = new FormBuilder();

  protected isFormOpen = false;
  protected editingParkingArea: ParkingArea | null = null;
  protected isDeleteOpen = false;
  protected targetParkingArea: ParkingArea | null = null;

  private nameUniqueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string)?.trim().toLowerCase();
      if (!value) return null;

      const editingId = this.editingParkingArea?.parkingAreaId;
      const conflict = this.parkingAreas().some(
        (area) => area.parkingAreaId !== editingId && area.name.trim().toLowerCase() === value
      );

      return conflict ? { nameTaken: true } : null;
    };
  }

  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, this.nameUniqueValidator()]],
    isAccessible: [true],
    isGuestAccessible: [false]
  });

  constructor() {
    effect(() => {
      const selectedId = this.selectedParkingAreaId();
      if (selectedId !== null) {
        setTimeout(() => {
          const selectedEl = this.element.nativeElement.querySelector(`#parking-area-${selectedId}`);
          selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });

    effect(() => {
      this.parkingAreas();
      this.form.controls.name.updateValueAndValidity({ onlySelf: true });
    });
  }

  openCreate(): void {
    this.editingParkingArea = null;
    this.form.reset({ name: '', isAccessible: true, isGuestAccessible: false });
    this.isFormOpen = true;
  }

  openEdit(parkingArea: ParkingArea): void {
    this.editingParkingArea = parkingArea;
    this.form.reset({
      name: parkingArea.name,
      isAccessible: parkingArea.isAccessible,
      isGuestAccessible: parkingArea.isGuestAccessible
    });
    this.isFormOpen = true;
  }

  public openEditFromParent(id: number): void {
    const parkingArea = this.parkingAreas().find((area) => area.parkingAreaId === id);
    if (parkingArea) this.openEdit(parkingArea);
  }

  requestAddAccessNode(parkingArea: ParkingArea): void {
    this.closeForm();
    this.addAccessNode.emit(parkingArea);
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.editingParkingArea = null;
  }

  submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();

    if (this.editingParkingArea) {
      this.updateParkingArea.emit({ id: this.editingParkingArea.parkingAreaId, model: values });
    } else {
      this.createParkingArea.emit(values);
    }
    this.closeForm();
  }

  openDelete(parkingArea: ParkingArea): void {
    this.targetParkingArea = parkingArea;
    this.isDeleteOpen = true;
  }

  confirmDelete(): void {
    if (!this.targetParkingArea) return;
    this.deleteParkingArea.emit(this.targetParkingArea.parkingAreaId);
    this.isDeleteOpen = false;
    this.targetParkingArea = null;
  }
}
