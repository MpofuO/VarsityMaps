import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
  accuracy?: number;
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private locationSubject = new Subject<LocationCoordinates>();
  private errorSubject = new Subject<string>();
  
  private watchId: number | null = null;

  public location$ = this.locationSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  startTracking(): void {
    this.stopTracking();
    this.startLiveTracking();
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
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

}