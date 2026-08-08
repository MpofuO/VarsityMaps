import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class Modal {
  isOpen = input(false);
  title = input('');
  closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}