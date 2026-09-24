import { Component, OnInit, OnDestroy, computed, effect, inject, signal, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountService } from '../../../core/services/account-service';
import { BuildingService } from '../../../core/services/building-service';
import { NavigationService } from '../../../core/services/navigation-service';
import { ToastService } from '../../../core/services/toast-service';
import { Building } from '../../../types/building';
import { CampusMap } from '../../../shared/map/campus-map/campus-map';
import { MapPolygon, MapPolyline } from '../../../types/map';
import { RouteResult } from '../../../types/route-result';
import { DecimalPipe } from '@angular/common';
import { CampusService } from '../../../core/services/campus-service';
import { TravelMode } from '../../../types/edge';
import { LocationCoordinates, LocationTrackingService } from '../../../core/services/location-tracking-service';
import { RouteGuide } from '../../../types/route-guide';

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
  protected readonly currentInstruction = signal<string>('Follow the highlighted path');
  protected readonly remainingRouteDistance = signal<number>(0);

  protected readonly activePickField = signal<PickField>(null);
  protected readonly originBuildingId = signal<number | null>(null);
  protected readonly destinationBuildingId = signal<number | null>(null);

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
  private readonly element = inject(ElementRef);

  protected readonly activeRoute = computed(() => {
    const list = this.routes();
    const index = this.selectedRouteIndex();
    return list[index] ?? null;
  });

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

  protected readonly mapPolygons = computed<MapPolygon[]>(() =>
    this.buildings().map((b) => ({
      id: b.buildingId,
      paths: b.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected:
        b.buildingId === this.selectedBuildingId() ||
        b.buildingId === this.originBuildingId() ||
        b.buildingId === this.destinationBuildingId()
    }))
  );

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
    this.destinationBuildingId();
    this.selectedTravelMode();

    if (!this.isNavigating()) {
      this.routes.set([]);
      this.selectedRouteIndex.set(0);
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
  }

  selectBuilding(buildingId: number): void {
    if (this.isNavigating()) return;

    const field = this.activePickField();

    if (field === 'origin') {
      if (buildingId === this.destinationBuildingId()) {
        this.toastService.error('Origin and destination must be different buildings.');
        return;
      }
      this.originBuildingId.set(buildingId);
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
        let nearest: Building | null = null;
        let minDistance = Infinity;

        for (const b of this.buildings()) {
          const [bLng, bLat] = b.boundary.coordinates[0][0];
          const dist = Math.hypot(bLat - latitude, bLng - longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = b;
          }
        }

        if (nearest) {
          this.originBuildingId.set(nearest.buildingId);
          this.activePickField.set('destination');
          this.toastService.success(`Nearest origin set to ${nearest.name}`);
        }
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
    this.activePickField.set('origin');
  }

  cancelPlanningRoute(): void {
    this.isPlanningRoute.set(false);
    this.activePickField.set(null);
    this.originBuildingId.set(null);
    this.destinationBuildingId.set(null);
    this.routes.set([]);
  }

  pickField(field: 'origin' | 'destination'): void {
    this.activePickField.set(field);
  }

  calculateRoute(): void {
    const from = this.originBuildingId();
    const to = this.destinationBuildingId();
    if (from === null || to === null) return;

    this.isCalculatingRoute.set(true);
    this.navigationService.getRoute(from, to, this.selectedTravelMode()).subscribe({
      next: (routes: any) => {
        this.isCalculatingRoute.set(false);
        const routeList = Array.isArray(routes) ? routes : [routes];
        this.routes.set(routeList);
        this.selectedRouteIndex.set(0);
      },
      error: () => {
        this.isCalculatingRoute.set(false);
        this.toastService.error('No route could be found between these buildings.');
      }
    });
  }

  startNavigation(useMock: boolean = true): void {
    const route = this.activeRoute();
    if (!route) return;

    this.navigationService.getRouteGuides(route.routeId).subscribe({
      next: (guides) => {
        this.routeGuides.set(guides);
        this.activeGuideIndex.set(0);

        if (guides.length > 0) {
          this.currentInstruction.set(guides[0].instruction);
        }

        this.remainingRouteDistance.set(Math.round(this.routeDistance(route.path.coordinates)));

        this.isNavigating.set(true);
        this.isPlanningRoute.set(false);
        this.locationService.startTracking(route, useMock);
      },
      error: () => {
        this.toastService.error('Failed to load navigation instructions.');
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
    this.destinationBuildingId.set(null);

    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = undefined;
    }
  }

  private updateUserMarker(loc: LocationCoordinates): void {
    if (!this.map) return;

    const position = { lat: loc.latitude, lng: loc.longitude };

    if (!this.userMarker) {
      this.userMarker = new google.maps.Marker({
        position,
        map: this.map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
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

    const destCoord = active.path.coordinates[active.path.coordinates.length - 1];
    const distanceToDest = this.haversine(loc.latitude, loc.longitude, destCoord[1], destCoord[0]);

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