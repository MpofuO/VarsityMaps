import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { RouteResult } from '../../types/route-result';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracy?: number;
}

export type LocationTrackingMode = 'live' | 'mock';

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  public readonly isMocking = signal(false);
  public readonly isMockDeviation = signal(false);

  private locationSubject = new Subject<LocationCoordinates>();
  private errorSubject = new Subject<string>();
  
  private trackingIntervalId: ReturnType<typeof setInterval> | null = null;
  private trackingSession = 0;
  private requestInFlight = false;
  private mockCoordinates: [number, number][] = [];
  private mockIndex = 0;

  public location$ = this.locationSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  startTracking(route: RouteResult, mode: LocationTrackingMode = 'live'): void {
    this.stopTracking();
    if (mode === 'mock') {
      this.startMockTracking(route);
    } else {
      this.startLiveTracking();
    }
  }

  stopTracking(): void {
    this.trackingSession++;
    this.requestInFlight = false;
    this.isMocking.set(false);
    this.isMockDeviation.set(false);
    if (this.trackingIntervalId !== null) {
      clearInterval(this.trackingIntervalId);
      this.trackingIntervalId = null;
    }
    this.mockCoordinates = [];
    this.mockIndex = 0;
  }

  simulateMockDeviation(): void {
    if (!this.isMocking() || this.mockCoordinates.length < 2) return;

    this.mockIndex = Math.floor(this.mockCoordinates.length / 2);
    this.isMockDeviation.set(true);
    this.emitMockLocation();
  }

  returnMockToRoute(): void {
    if (!this.isMocking() || this.mockCoordinates.length === 0) return;

    this.isMockDeviation.set(false);
    this.emitMockLocation();
  }

  private startLiveTracking(): void {
    if (!navigator.geolocation) {
      this.errorSubject.next('Geolocation is not supported by your browser.');
      return;
    }

    const session = ++this.trackingSession;
    const requestLocation = () => {
      if (session !== this.trackingSession || this.requestInFlight) return;
      this.requestInFlight = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (session !== this.trackingSession) return;
          this.requestInFlight = false;
          this.locationSubject.next({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          if (session !== this.trackingSession) return;
          this.requestInFlight = false;
          this.errorSubject.next(err.message || 'Unable to retrieve location.');
          if (err.code === 1) {
            this.stopTracking();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    requestLocation();
    this.trackingIntervalId = setInterval(requestLocation, 2500);
  }

  private startMockTracking(route: RouteResult): void {
    if (route.path.coordinates.length === 0) {
      this.errorSubject.next('Cannot start mock navigation because the route has no coordinates.');
      return;
    }

    this.isMocking.set(true);
    this.mockCoordinates = route.path.coordinates;
    this.mockIndex = 0;
    const session = ++this.trackingSession;
    this.emitMockLocation();
    this.trackingIntervalId = setInterval(() => {
      if (session !== this.trackingSession) return;
      this.mockIndex = Math.min(this.mockIndex + 1, this.mockCoordinates.length - 1);
      this.emitMockLocation();
    }, 2500);
  }

  private emitMockLocation(): void {
    const coordinates = this.mockCoordinates;
    if (coordinates.length === 0) return;

    const [longitude, latitude] = coordinates[this.mockIndex];
    if (!this.isMockDeviation() || coordinates.length < 2) {
      this.locationSubject.next({ latitude, longitude, accuracy: 5 });
      return;
    }

    const start = coordinates[Math.max(0, this.mockIndex - 1)];
    const end = coordinates[Math.min(this.mockIndex + 1, coordinates.length - 1)];
    const latitudeScale = 110_574;
    const longitudeScale = 111_320 * Math.cos(latitude * Math.PI / 180);
    const safeLongitudeScale = Math.abs(longitudeScale) < 1
      ? (longitudeScale < 0 ? -1 : 1)
      : longitudeScale;
    const deltaX = (end[0] - start[0]) * longitudeScale;
    const deltaY = (end[1] - start[1]) * latitudeScale;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const offsetMeters = 35;

    this.locationSubject.next({
      latitude: latitude + deltaX / length * offsetMeters / latitudeScale,
      longitude: longitude - deltaY / length * offsetMeters / safeLongitudeScale,
      accuracy: 5
    });
  }

}