import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { httpErrorMessage } from '../functions/http-error-message';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor() {
    this.createToastContainer();
  }

  private createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed right-4 bottom-4 flex flex-col gap-3 z-[10000]';
      document.body.appendChild(container);
    }
  }

  private createToastElement(message: string, alertClass = 'alert-info', duration = 3500) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} shadow-lg flex items-center justify-between`;
    const messageContainer = document.createElement('div');
    messageContainer.className = 'flex-1';
    const messageText = document.createElement('span');
    messageText.textContent = message;
    messageContainer.appendChild(messageText);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ml-4';
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-ghost btn-sm';
    closeButton.textContent = '✕';
    buttonContainer.appendChild(closeButton);

    toast.append(messageContainer, buttonContainer);

    closeButton.addEventListener('click', () => {
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

  requestError(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 400 || error.status === 0) {
      this.error(httpErrorMessage(error, fallback));
    }
  }

  warning(message: string, duration?: number) {
    this.createToastElement(message, 'alert-warning', duration ?? 3500);
  }

  info(message: string, duration?: number) {
    this.createToastElement(message, 'alert-info', duration ?? 3500);
  }
}
