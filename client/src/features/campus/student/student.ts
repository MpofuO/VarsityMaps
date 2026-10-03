import { Component, OnInit, OnDestroy, computed, effect, inject, signal, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountService } from '../../../core/services/account-service';
import { BuildingService } from '../../../core/services/building-service';
import { NavigationService } from '../../../core/services/navigation-service';
import { ToastService } from '../../../core/services/toast-service';
import { Building } from '../../../types/building';
import { CampusMap } from '../../../shared/map/campus-map/campus-map';
import { MapMarker, MapPolygon, MapPolyline } from '../../../types/map';
import { RouteResult } from '../../../types/route-result';
import { DecimalPipe } from '@angular/common';
import { CampusService } from '../../../core/services/campus-service';
import { TravelMode } from '../../../types/edge';
import { LocationCoordinates, LocationTrackingService } from '../../../core/services/location-tracking-service';
import { RouteGuide } from '../../../types/route-guide';
import { OriginParkingRequired, ParkingAreaOption } from '../../../types/parking-area';
import { DestinationInterestRequired } from '../../../types/destination-interest-required';

type PickField = 'origin' | 'destination' | null;

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CampusMap, DecimalPipe],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class Student implements OnInit, OnDestroy {
  protected readonly accountService = inject(AccountService);
  private readonly buildingService = inject(BuildingService);
  private readonly campusService = inject(CampusService);
  private readonly navigationService = inject(NavigationService);
  private readonly toastService = inject(ToastService);
  protected readonly locationService = inject(LocationTrackingService);

  protected readonly buildings = signal<Building[]>([]);
  protected readonly campusCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly campusName = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly selectedBuildingId = signal<number | null>(null);

  protected readonly isPlanningRoute = signal(false);
  protected readonly isNavigating = signal(false);
  protected readonly showEndConfirmModal = signal(false);

  protected readonly currentLocation = signal<LocationCoordinates | null>(null);
  protected readonly originLocation = signal<LocationCoordinates | null>(null);
  protected readonly currentInstruction = signal<string>('Follow the highlighted path');
  protected readonly remainingRouteDistance = signal<number>(0);
  protected readonly isOffRoute = signal(false);
  protected readonly showDeviationPrompt = signal(false);
  protected readonly isRecalculating = signal(false);

  protected readonly activePickField = signal<PickField>(null);
  protected readonly originBuildingId = signal<number | null>(null);
  protected readonly destinationBuildingId = signal<number | null>(null);
  protected readonly originParkingAreaId = signal<number | null>(null);
  protected readonly originParkingOptions = signal<ParkingAreaOption[]>([]);
  protected readonly destinationInterestOptions = signal<string[]>([]);
  protected readonly destinationInterest = signal<string | null>(null);

  protected readonly routes = signal<RouteResult[]>([]);
  protected readonly selectedRouteIndex = signal<number>(0);
  protected readonly isCalculatingRoute = signal(false);
  protected readonly routeGuides = signal<RouteGuide[]>([]);
  protected readonly activeGuideIndex = signal<number>(0);

  protected readonly selectedTravelMode = signal<TravelMode>(TravelMode.Walking);
  protected readonly travelModeOptions = [
    { value: TravelMode.Walking, label: 'Walk' },
    { value: TravelMode.Cycling, label: 'Cycle' },
    { value: TravelMode.Bus, label: 'Bus' },
    { value: TravelMode.Car, label: 'Car' }
  ];

  private map?: google.maps.Map;
  private userMarker?: google.maps.Marker;
  private locationSub?: Subscription;
  private errorSub?: Subscription;
  private deviationSamples = 0;
  private onRouteSamples = 0;
  private checkInitialDeviation = false;
  private readonly element = inject(ElementRef);

  protected readonly activeRoute = computed(() => {
    const list = this.routes();
    const index = this.selectedRouteIndex();
    return list[index] ?? null;
  });

  protected readonly currentGuide = computed(() =>
    this.routeGuides()[this.activeGuideIndex()] ?? null
  );

  protected readonly filteredBuildings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.buildings();
    return this.buildings().filter(
      (b) => b.name.toLowerCase().includes(query) || b.alias.toLowerCase().includes(query)
    );
  });

  protected readonly selectedBuilding = computed(() =>
    this.buildings().find((b) => b.buildingId === this.selectedBuildingId()) ?? null
  );

  protected readonly originBuilding = computed(() =>
    this.buildings().find((b) => b.buildingId === this.originBuildingId()) ?? null
  );

  protected readonly destinationBuilding = computed(() =>
    this.buildings().find((b) => b.buildingId === this.destinationBuildingId()) ?? null
  );

  protected readonly mapPolygons = computed<MapPolygon[]>(() => [
    ...this.buildings().map((b) => ({
      id: `building-${b.buildingId}`,
      paths: b.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      label: b.alias,
      selected:
        b.buildingId === this.selectedBuildingId() ||
        b.buildingId === this.originBuildingId() ||
        b.buildingId === this.destinationBuildingId()
    })),
    ...this.originParkingOptions().map((parkingArea) => ({
      id: `origin-parking-${parkingArea.parkingAreaId}`,
      paths: parkingArea.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected: parkingArea.parkingAreaId === this.originParkingAreaId(),
      strokeColor: '#f59e0b',
      fillColor: '#fbbf24'
    }))
  ]);

  protected readonly routePolylines = computed<MapPolyline[]>(() => {
    const active = this.activeRoute();
    if (this.isNavigating() && active) {
      return [{
        id: active.routeId || 0,
        path: active.path.coordinates.map(([lng, lat]) => ({ lat, lng })),
        color: '#22c55e'
      }] as MapPolyline[];
    }

    return this.routes().map((r, index) => ({
      id: r.routeId || index,
      path: r.path.coordinates.map(([lng, lat]) => ({ lat, lng })),
      color: index === this.selectedRouteIndex() ? '#22c55e' : '#a855f7',
      selected: index === this.selectedRouteIndex()
    })) as MapPolyline[];
  });

  protected readonly routeMarkers = computed<MapMarker[]>(() => {
    const route = this.activeRoute();
    if (!route) return [];

    const markers: MapMarker[] = [];

    if (route.originParkingLocation) {
      markers.push({
        id: route.routeId * -1 || -1,
        position: {
          lat: route.originParkingLocation.coordinates[1],
          lng: route.originParkingLocation.coordinates[0]
        },
        color: '#0ea5e9',
        selected: this.isNavigating()
      });
    }

    if (route.transitionLocation) {
      markers.push({
        id: route.routeId * -2 || -2,
        position: {
          lat: route.transitionLocation.coordinates[1],
          lng: route.transitionLocation.coordinates[0]
        },
        color: '#f59e0b',
        selected: this.isNavigating()
      });
    }

    return markers;
  });

  constructor() {
  effect(() => {
    const user = this.accountService.currentUser();
    if (user?.universityId && user.campusId) {
      this.loadCampus(user.universityId, user.campusId);
      this.loadBuildings();
    }
  });

  effect(() => {
      const selectedId = this.selectedBuildingId();
      if (selectedId !== null) {
        setTimeout(() => {
          const selectedEl = this.element.nativeElement.querySelector(`#building-${selectedId}`);
          selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });

  effect(() => {
    this.originBuildingId();
    this.originLocation();
    this.destinationBuildingId();
    this.selectedTravelMode();

    if (!this.isNavigating()) {
      this.routes.set([]);
      this.selectedRouteIndex.set(0);
      this.originParkingAreaId.set(null);
      this.originParkingOptions.set([]);
    }
  });
}

  ngOnInit(): void {
    this.locationSub = this.locationService.location$.subscribe((loc) => {
      this.currentLocation.set(loc);
      this.updateUserMarker(loc);

      if (this.isNavigating()) {
        this.evaluateProgress(loc);
      }
    });

    this.errorSub = this.locationService.error$.subscribe((msg) => {
      this.toastService.error(msg);
    });
  }

  ngOnDestroy(): void {
    this.locationSub?.unsubscribe();
    this.errorSub?.unsubscribe();
    this.locationService.stopTracking();
    if (this.userMarker) {
      this.userMarker.setMap(null);
    }
  }

  private loadBuildings(): void {
    this.buildingService.getBuildings().subscribe({
      next: (buildings) => this.buildings.set(buildings)
    });
  }

  private loadCampus(universityId: number, campusId: number): void {
    this.campusService.getCampus(campusId).subscribe({
      next: (campus) => {
        if (campus) {
          this.campusName.set(campus.name);
          const point: google.maps.LatLngLiteral = {
            lat: campus.center.coordinates[1],
            lng: campus.center.coordinates[0]
          };

          this.campusCenter.set(point);
          this.centerMapOnBoundsIfNeeded([[campus.center.coordinates[0], campus.center.coordinates[1]]], true);
        }
      }
    });
  }

  onMapReady(map: google.maps.Map): void {
    this.map = map;
    const location = this.currentLocation() ?? this.originLocation();
    if (location) this.updateUserMarker(location);
  }

  selectBuilding(key: string): void {
    if (this.isNavigating()) return;

    const buildingId = Number(key.replace('building-', ''));
    if (!Number.isInteger(buildingId)) return;

    const field = this.activePickField();

    if (field === 'origin') {
      if (buildingId === this.destinationBuildingId()) {
        this.toastService.error('Origin and destination must be different buildings.');
        return;
      }
      this.originBuildingId.set(buildingId);
      this.originLocation.set(null);
      this.routes.set([]);
      this.originParkingAreaId.set(null);
      this.originParkingOptions.set([]);
      this.recordRecentSearch(buildingId);
      if (this.destinationBuildingId() !== null)
        this.activePickField.set(null);
      else
        this.activePickField.set('destination');
    } else if (field === 'destination') {
      if (buildingId === this.originBuildingId()) {
        this.toastService.error('Origin and destination must be different buildings.');
        return;
      }
      this.destinationInterest.set(null);
      this.destinationInterestOptions.set([]);
      this.originParkingAreaId.set(null);
      this.originParkingOptions.set([]);
      this.routes.set([]);
      this.destinationBuildingId.set(buildingId);
      this.recordRecentSearch(buildingId);
      this.activePickField.set(null);
    } else {
      this.selectedBuildingId.set(buildingId === this.selectedBuildingId() ? null : buildingId);
      this.cancelPlanningRoute();
    }

    const building = this.buildings().find((b) => b.buildingId === buildingId);
    if (building) {
      this.centerMapOnBoundsIfNeeded(building.boundary.coordinates[0]);
    }
  }

  private recordRecentSearch(buildingId: number): void {
    const building = this.buildings().find(b => b.buildingId === buildingId);
    if (!building) return;

    this.accountService.addRecentSearch(building);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.toastService.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.originBuildingId.set(null);
        const location = { latitude, longitude, accuracy: pos.coords.accuracy };
        this.originLocation.set(location);
        this.updateUserMarker(location);
        this.map?.panTo({ lat: latitude, lng: longitude });
        this.activePickField.set('destination');
        this.toastService.success('Current location set as origin.');
      },
      () => {
        this.toastService.error('Access to location was denied or is unavailable.');
      }
    );
  }

  private centerMapOnBoundsIfNeeded(ring: [number, number][], forcePan = false): void {
    if (!this.map || !ring.length) return;

    const bounds = new google.maps.LatLngBounds();
    for (const [lng, lat] of ring) {
      bounds.extend({ lat, lng });
    }

    const mapBounds = this.map.getBounds();

    if (forcePan || !mapBounds) {
      this.map.panTo(bounds.getCenter());
      return;
    }

    const alreadyVisible =
      mapBounds.contains(bounds.getNorthEast()) &&
      mapBounds.contains(bounds.getSouthWest());

    if (!alreadyVisible) {
      this.map.panTo(bounds.getCenter());
    }
  }

  startPlanningRoute(): void {
    const preselected = this.selectedBuildingId();
    this.isPlanningRoute.set(true);
    this.routes.set([]);

    if (preselected !== null) {
      this.destinationBuildingId.set(preselected);
    } else {
      this.destinationBuildingId.set(null);
    }

    this.originBuildingId.set(null);
    this.originLocation.set(null);
    this.originParkingAreaId.set(null);
    this.originParkingOptions.set([]);
    this.destinationInterest.set(null);
    this.destinationInterestOptions.set([]);
    this.activePickField.set('origin');
  }

  cancelPlanningRoute(): void {
    this.isPlanningRoute.set(false);
    this.activePickField.set(null);
    this.originBuildingId.set(null);
    this.originLocation.set(null);
    this.destinationBuildingId.set(null);
    this.originParkingAreaId.set(null);
    this.originParkingOptions.set([]);
    this.destinationInterest.set(null);
    this.destinationInterestOptions.set([]);
    this.routes.set([]);
  }

  pickField(field: 'origin' | 'destination'): void {
    this.activePickField.set(field);
  }

  calculateRoute(): void {
    const from = this.originBuildingId();
    const liveOrigin = this.originLocation();
    const to = this.destinationBuildingId();
    if ((from === null && liveOrigin === null) || to === null) return;

    this.isCalculatingRoute.set(true);
    if (liveOrigin) {
      this.navigationService.getLiveRoute(
        liveOrigin.latitude,
        liveOrigin.longitude,
        to,
        this.selectedTravelMode(),
        this.destinationInterest()
      ).subscribe({
        next: (result) => {
          this.isCalculatingRoute.set(false);
          result.route.routeGuides = result.routeGuides;
          this.routes.set([result.route]);
          this.selectedRouteIndex.set(0);
          this.destinationInterestOptions.set([]);
        },
        error: (error) => this.handleRouteError(error)
      });
      return;
    }

    this.navigationService.getRoute(
      from!,
      to,
      this.selectedTravelMode(),
      this.originParkingAreaId(),
      this.destinationInterest()
    ).subscribe({
      next: (routes: any) => {
        this.isCalculatingRoute.set(false);
        const routeList = Array.isArray(routes) ? routes : [routes];
        this.routes.set(routeList);
        this.selectedRouteIndex.set(0);
        this.destinationInterestOptions.set([]);
      },
      error: (error) => {
        this.handleRouteError(error);
      }
    });
  }

  private handleRouteError(error: any): void {
    this.isCalculatingRoute.set(false);
    if (error.status === 409) {
      const response = error.error as OriginParkingRequired | DestinationInterestRequired | undefined;
      if (response?.code === 'DESTINATION_INTEREST_REQUIRED') {
        this.destinationInterestOptions.set(response.interests);
        this.destinationInterest.set(null);
        this.originParkingAreaId.set(null);
        this.originParkingOptions.set([]);
        return;
      }
      if (response?.code === 'ORIGIN_PARKING_REQUIRED') {
        this.destinationInterestOptions.set([]);
        this.originParkingOptions.set(response.parkingAreas);
        return;
      }
    }
    this.toastService.error('No route could be found from this origin to the destination.');
  }

  selectDestinationInterest(interest: string): void {
    this.destinationInterest.set(interest);
  }

  selectOriginParkingArea(parkingAreaId: number): void {
    this.originParkingAreaId.set(parkingAreaId);
    const parkingArea = this.originParkingOptions().find((area) => area.parkingAreaId === parkingAreaId);
    if (parkingArea) this.centerMapOnBoundsIfNeeded(parkingArea.boundary.coordinates[0], true);
  }

  startNavigation(): void {
    const route = this.activeRoute();
    if (!route) return;

    const beginNavigation = (guides: RouteGuide[]) => {
      this.routeGuides.set(guides);
      this.activeGuideIndex.set(0);
      this.currentInstruction.set(guides[0]?.instruction ?? 'Follow the highlighted path');
      this.remainingRouteDistance.set(Math.round(this.routeDistance(route.path.coordinates)));
      this.isOffRoute.set(false);
      this.showDeviationPrompt.set(false);
      this.deviationSamples = 0;
      this.onRouteSamples = 0;
      this.checkInitialDeviation = true;
      this.isNavigating.set(true);
      this.isPlanningRoute.set(false);
      this.locationService.startTracking();
    };

    if (route.routeGuides) {
      beginNavigation(route.routeGuides);
      return;
    }

    this.navigationService.getRouteGuides(route.routeId).subscribe({
      next: beginNavigation,
      error: () => this.toastService.error('Failed to load navigation instructions.')
    });
  }

  dismissDeviationPrompt(): void {
    this.showDeviationPrompt.set(false);
    this.currentInstruction.set('Return to the highlighted route to resume guidance.');
  }

  recalculateRoute(): void {
    const location = this.currentLocation();
    const route = this.activeRoute();
    if (!location || !route || this.isRecalculating()) return;

    this.isRecalculating.set(true);
    this.navigationService.getLiveRoute(
      location.latitude,
      location.longitude,
      route.toBuildingId,
      route.travelMode,
      this.destinationInterest()
    ).subscribe({
      next: (result) => {
        result.route.routeGuides = result.routeGuides;
        this.routes.set([result.route]);
        this.selectedRouteIndex.set(0);
        this.routeGuides.set(result.routeGuides);
        this.activeGuideIndex.set(0);
        this.currentInstruction.set(result.routeGuides[0]?.instruction ?? 'Follow the highlighted path');
        this.remainingRouteDistance.set(Math.round(this.routeDistance(result.route.path.coordinates)));
        this.isOffRoute.set(false);
        this.showDeviationPrompt.set(false);
        this.deviationSamples = 0;
        this.onRouteSamples = 0;
        this.checkInitialDeviation = true;
        this.originLocation.set(location);
        this.updateUserMarker(location);
        this.locationService.startTracking();
        this.isRecalculating.set(false);
      },
      error: (error) => {
        this.isRecalculating.set(false);
        this.toastService.error(error.status === 404
          ? 'No route could be found from your current location.'
          : 'Failed to recalculate the route.');
      }
    });
  }

  promptEndNavigation(): void {
    this.showEndConfirmModal.set(true);
  }

  cancelEndNavigation(): void {
    this.showEndConfirmModal.set(false);
  }

  confirmEndNavigation(): void {
    this.showEndConfirmModal.set(false);
    this.endNavigationSession();
  }

  private endNavigationSession(): void {
    this.isNavigating.set(false);
    this.locationService.stopTracking();
    this.routes.set([]);
    this.selectedRouteIndex.set(0);
    this.originBuildingId.set(null);
    this.originLocation.set(null);
    this.destinationBuildingId.set(null);
    this.isOffRoute.set(false);
    this.showDeviationPrompt.set(false);
    this.deviationSamples = 0;
    this.onRouteSamples = 0;
    this.checkInitialDeviation = false;

    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = undefined;
    }
  }

  private updateUserMarker(loc: LocationCoordinates): void {
    if (!this.map) return;

    const position = { lat: loc.latitude, lng: loc.longitude };

    if (!this.userMarker) {
      const pinSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64">' +
        '<path d="M24 2C11.8 2 2 11.8 2 24c0 16 22 38 22 38s22-22 22-38C46 11.8 36.2 2 24 2Z" fill="#2563eb" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="24" cy="24" r="10" fill="#fff"/></svg>';
      this.userMarker = new google.maps.Marker({
        position,
        map: this.map,
        title: 'Your Location',
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
          scaledSize: new google.maps.Size(30, 40),
          anchor: new google.maps.Point(15, 40)
        },
        zIndex: 1000
      });
    } else {
      this.userMarker.setPosition(position);
    }

    if (this.isNavigating()) {
      this.map.panTo(position);
    }
  }

  private evaluateProgress(loc: LocationCoordinates): void {
    const active = this.activeRoute();
    const guides = this.routeGuides();
    if (!active || !active.path.coordinates.length) return;

    const isInitialFix = this.checkInitialDeviation;
    this.checkInitialDeviation = false;
    const destCoord = active.path.coordinates[active.path.coordinates.length - 1];
    const distanceToDest = this.haversine(loc.latitude, loc.longitude, destCoord[1], destCoord[0]);

    const distanceToRoute = this.distanceFromRoute(loc, active.path.coordinates);
    const deviationThreshold = Math.max(15, Math.min(35, (loc.accuracy ?? 0) * 1.5));
    if (this.isOffRoute()) {
      this.remainingRouteDistance.set(Math.round(this.routeDistanceFromLocation(loc, active.path.coordinates)));
      this.onRouteSamples = distanceToRoute < deviationThreshold * 0.6 ? this.onRouteSamples + 1 : 0;
      if (this.onRouteSamples >= 2) {
        this.isOffRoute.set(false);
        this.showDeviationPrompt.set(false);
        this.deviationSamples = 0;
        this.onRouteSamples = 0;
      } else {
        return;
      }
    } else {
      this.deviationSamples = distanceToRoute > deviationThreshold ? this.deviationSamples + 1 : 0;
      if (distanceToRoute > deviationThreshold && (isInitialFix || this.deviationSamples >= 3)) {
        this.isOffRoute.set(true);
        this.showDeviationPrompt.set(true);
        this.currentInstruction.set('You are off route. Return to the highlighted path or recalculate.');
        this.remainingRouteDistance.set(Math.round(this.routeDistanceFromLocation(loc, active.path.coordinates)));
        return;
      }
    }

    if (distanceToDest < 3) {
      this.endNavigationSession();
      alert('You have arrived at your destination!');
      return;
    }

    if (guides.length > 0) {
      let currentIndex = this.activeGuideIndex();
      const nextGuide = guides[currentIndex + 1];

      if (nextGuide) {
        const [guideLng, guideLat] = nextGuide.location.coordinates;
        const distanceToNextGuide = this.haversine(loc.latitude, loc.longitude, guideLat, guideLng);

        if (distanceToNextGuide < 5) {
          currentIndex++;
          this.activeGuideIndex.set(currentIndex);
        }
      }

      this.currentInstruction.set(guides[currentIndex].instruction);

      this.remainingRouteDistance.set(Math.round(this.routeDistanceFromLocation(loc, active.path.coordinates)));
    } else {
      this.currentInstruction.set(`Navigating towards ${this.destinationBuilding()?.name || 'Destination'}`);
      this.remainingRouteDistance.set(Math.round(distanceToDest));
    }
  }

  private distanceFromRoute(loc: LocationCoordinates, coordinates: [number, number][]): number {
    if (coordinates.length === 0) return Infinity;
    if (coordinates.length === 1) {
      return this.haversine(loc.latitude, loc.longitude, coordinates[0][1], coordinates[0][0]);
    }

    let nearestDistance = Infinity;
    for (let index = 0; index < coordinates.length - 1; index++) {
      const projection = this.projectOntoSegment(loc, coordinates[index], coordinates[index + 1]);
      nearestDistance = Math.min(nearestDistance, this.haversine(
        loc.latitude,
        loc.longitude,
        projection[1],
        projection[0]
      ));
    }
    return nearestDistance;
  }

  private routeDistance(coordinates: [number, number][]): number {
    let distance = 0;
    for (let index = 0; index < coordinates.length - 1; index++) {
      distance += this.haversine(
        coordinates[index][1],
        coordinates[index][0],
        coordinates[index + 1][1],
        coordinates[index + 1][0]
      );
    }
    return distance;
  }

  private routeDistanceFromLocation(loc: LocationCoordinates, coordinates: [number, number][]): number {
    if (coordinates.length < 2) return 0;

    let nearestDistance = Infinity;
    let remainingDistance = this.routeDistance(coordinates);

    for (let index = 0; index < coordinates.length - 1; index++) {
      const start = coordinates[index];
      const end = coordinates[index + 1];
      const projection = this.projectOntoSegment(loc, start, end);
      const distanceToProjection = this.haversine(
        loc.latitude,
        loc.longitude,
        projection[1],
        projection[0]
      );
      const distanceFromProjectionToEnd = this.haversine(projection[1], projection[0], end[1], end[0]);
      const candidateRemaining = distanceFromProjectionToEnd +
        this.routeDistance(coordinates.slice(index + 1));

      if (distanceToProjection < nearestDistance) {
        nearestDistance = distanceToProjection;
        remainingDistance = candidateRemaining;
      }

    }

    return remainingDistance;
  }

  private projectOntoSegment(
    loc: LocationCoordinates,
    start: [number, number],
    end: [number, number]
  ): [number, number] {
    const latitudeScale = Math.cos(loc.latitude * Math.PI / 180);
    const startX = start[0] * latitudeScale;
    const startY = start[1];
    const endX = end[0] * latitudeScale;
    const endY = end[1];
    const pointX = loc.longitude * latitudeScale;
    const pointY = loc.latitude;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const factor = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared));

    return [start[0] + (end[0] - start[0]) * factor, start[1] + (end[1] - start[1]) * factor];
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}