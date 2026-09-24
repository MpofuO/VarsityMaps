import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { RouteResult } from '../../types/route-result';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  public isMocking = signal(false);
  
  private locationSubject = new Subject<LocationCoordinates>();
  private errorSubject = new Subject<string>();
  
  private watchId: number | null = null;
  private mockIntervalId: any = null;

  public location$ = this.locationSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  startTracking(routeToMock?: RouteResult | null, useMock: boolean = true): void {
    this.stopTracking();
    this.isMocking.set(useMock);

    if (useMock && routeToMock) {
      this.startMockTracking(routeToMock);
    } else {
      this.startLiveTracking();
    }
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.mockIntervalId !== null) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
  }

  private startLiveTracking(): void {
    if (!navigator.geolocation) {
      this.errorSubject.next('Geolocation is not supported by your browser.');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.locationSubject.next({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading
        });
      },
      (err) => {
        this.errorSubject.next(err.message || 'Unable to retrieve location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );
  }

  private startMockTracking(route: RouteResult): void {
    const coords = route.path.coordinates;
    if (!coords || coords.length === 0) return;

    let index = 0;
    this.mockIntervalId = setInterval(() => {
      const [lng, lat] = coords[index];
      this.locationSubject.next({ latitude: lat, longitude: lng });

      index++;
      if (index >= coords.length) {
        index = coords.length - 1;
      }
    }, 2000);
  }
}