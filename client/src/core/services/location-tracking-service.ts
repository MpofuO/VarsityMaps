import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { RouteResult } from '../../types/route-result';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracy?: number;
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  public isMocking = signal(false);
  
  private locationSubject = new Subject<LocationCoordinates>();
  private errorSubject = new Subject<string>();
  
  private watchId: number | null = null;
  private mockIntervalId: any = null;
  private mockCoordinates: [number, number][] = [];
  private mockIndex = 0;
  private mockDeviation = false;

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

    this.mockCoordinates = [];
    this.mockDeviation = false;
  }

  simulateMockDeviation(): void {
    if (!this.isMocking() || this.mockCoordinates.length < 2) return;

    this.mockIndex = Math.floor(this.mockCoordinates.length / 2);
    this.mockDeviation = true;
    this.emitMockLocation();
  }

  returnMockToRoute(): void {
    if (!this.isMocking() || this.mockCoordinates.length === 0) return;

    this.mockDeviation = false;
    this.emitMockLocation();
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
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy
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

    this.mockCoordinates = coords;
    this.mockIndex = 0;
    this.mockIntervalId = setInterval(() => {
      this.emitMockLocation();
      this.mockIndex = Math.min(this.mockIndex + 1, this.mockCoordinates.length - 1);
    }, 2000);
  }

  private emitMockLocation(): void {
    const coordinates = this.mockCoordinates;
    if (coordinates.length === 0) return;

    const [longitude, latitude] = coordinates[this.mockIndex];
    if (!this.mockDeviation || coordinates.length < 2) {
      this.locationSubject.next({ latitude, longitude, accuracy: 5 });
      return;
    }

    const start = coordinates[Math.max(0, this.mockIndex - 1)];
    const end = coordinates[Math.min(this.mockIndex + 1, coordinates.length - 1)];
    const latitudeScale = 110_574;
    const longitudeScale = 111_320 * Math.cos(latitude * Math.PI / 180);
    const deltaX = (end[0] - start[0]) * longitudeScale;
    const deltaY = (end[1] - start[1]) * latitudeScale;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const offsetMeters = 35;

    this.locationSubject.next({
      latitude: latitude + deltaX / length * offsetMeters / latitudeScale,
      longitude: longitude - deltaY / length * offsetMeters / longitudeScale,
      accuracy: 5
    });
  }
}