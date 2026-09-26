import { Component, input, output, signal, effect } from '@angular/core';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-entity-detail-modal',
  imports: [Modal],
  templateUrl: './entity-detail-modal.html',
  styleUrl: './entity-detail-modal.css'
})
export class EntityDetailModal {
  isOpen = input(false);
  title = input('Edit');
  name = input<string | null>(null);
  namePlaceholder = input('Name');
  showEntranceInterest = input(false);
  interestOfEntrance = input<string | null>(null);

  save = output<{ name: string | null; interestOfEntrance: string | null }>();
  delete = output<void>();
  closed = output<void>();

  protected value = signal('');
  protected interestValue = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.value.set(this.name() ?? '');
        this.interestValue.set(this.interestOfEntrance() ?? '');
      }
    });
  }

  onSave(): void {
    this.save.emit({
      name: this.value().trim() || null,
      interestOfEntrance: this.interestValue().trim() || null
    });
  }
}