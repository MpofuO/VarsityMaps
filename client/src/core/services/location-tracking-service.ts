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
  
  private trackingIntervalId: ReturnType<typeof setInterval> | null = null;
  private trackingSession = 0;
  private requestInFlight = false;

  public location$ = this.locationSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  startTracking(): void {
    this.stopTracking();
    this.startLiveTracking();
  }

  stopTracking(): void {
    this.trackingSession++;
    this.requestInFlight = false;
    if (this.trackingIntervalId !== null) {
      clearInterval(this.trackingIntervalId);
      this.trackingIntervalId = null;
    }
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
    this.trackingIntervalId = setInterval(requestLocation, 3000);
  }

}