import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor() {
    this.createToastContainer();
  }

  private createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed right-4 bottom-4 flex flex-col gap-3 z-50';
      document.body.appendChild(container);
    }
  }

  private createToastElement(message: string, alertClass = 'alert-info', duration = 3500) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} shadow-lg flex items-center justify-between`;
    toast.innerHTML = `
      <div class="flex-1"><span>${message}</span></div>
      <div class="ml-4"><button class="btn btn-ghost btn-sm">✕</button></div>
    `;

    toast.querySelector('button')?.addEventListener('click', () => {
      toastContainer.removeChild(toast);
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toastContainer.contains(toast)) toastContainer.removeChild(toast);
    }, duration);
  }

  success(message: string, duration?: number) {
    this.createToastElement(message, 'alert-success', duration ?? 3500);
  }

  error(message: string, duration?: number) {
    this.createToastElement(message, 'alert-error', duration ?? 3500);
  }

  warning(message: string, duration?: number) {
    this.createToastElement(message, 'alert-warning', duration ?? 3500);
  }

  info(message: string, duration?: number) {
    this.createToastElement(message, 'alert-info', duration ?? 3500);
  }
}
