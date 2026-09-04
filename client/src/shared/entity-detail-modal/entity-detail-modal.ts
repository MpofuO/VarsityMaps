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

  save = output<string | null>();
  delete = output<void>();
  closed = output<void>();

  protected value = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.value.set(this.name() ?? '');
      }
    });
  }

  onSave(): void {
    this.save.emit(this.value().trim() || null);
  }
}