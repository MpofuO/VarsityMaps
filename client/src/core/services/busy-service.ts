import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BusyService {
  readonly busyCount = signal(0);

  begin(): void {
    this.busyCount.update((value) => value + 1);
  }

  end(): void {
    this.busyCount.update((value) => Math.max(0, value - 1));
  }
}
