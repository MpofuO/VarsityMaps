import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
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

type PickField = 'origin' | 'destination' | null;

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CampusMap, DecimalPipe],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class Student implements OnInit {
  protected readonly accountService = inject(AccountService);
  private readonly buildingService = inject(BuildingService);
  private readonly campusService = inject(CampusService);
  private readonly navigationService = inject(NavigationService);
  private readonly toastService = inject(ToastService);

  protected readonly buildings = signal<Building[]>([]);
  protected readonly campusCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly campusName = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly selectedBuildingId = signal<number | null>(null);

  protected readonly isPlanningRoute = signal(false);
  protected readonly activePickField = signal<PickField>(null);
  protected readonly originBuildingId = signal<number | null>(null);
  protected readonly destinationBuildingId = signal<number | null>(null);
  protected readonly route = signal<RouteResult | null>(null);
  protected readonly isCalculatingRoute = signal(false);

  private map?: google.maps.Map;

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
    const route = this.route();
    if (!route) return [];
    return [
      {
        id: route.routeId,
        path: route.path.coordinates.map(([lng, lat]) => ({ lat, lng })),
        color: '#22c55e'
      } as MapPolyline
    ];
  });

  constructor() {
    effect(() => {
      const user = this.accountService.currentUser();
      if (user?.universityId && user.campusId) {
        this.loadCampus(user.universityId, user.campusId);
        this.loadBuildings();
      }
    });
  }

  ngOnInit(): void { }

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

          const campusCoordinates: [number, number][] = [
            [campus.center.coordinates[0], campus.center.coordinates[1]]
          ];

          this.centerMapOnBoundsIfNeeded(campusCoordinates, true);
        }
      }
    });
  }

  onMapReady(map: google.maps.Map): void {
    this.map = map;
  }

  selectBuilding(buildingId: number): void {
    const field = this.activePickField();

    if (field === 'origin') {
      if (buildingId === this.destinationBuildingId()) {
        this.toastService.error('Origin and destination must be different buildings.');
        return;
      }
      this.originBuildingId.set(buildingId);
      this.activePickField.set('destination');
    } else if (field === 'destination') {
      if (buildingId === this.originBuildingId()) {
        this.toastService.error('Origin and destination must be different buildings.');
        return;
      }
      this.destinationBuildingId.set(buildingId);
      this.activePickField.set(null);
    } else {
      this.selectedBuildingId.set(buildingId === this.selectedBuildingId() ? null : buildingId);
    }

    const building = this.buildings().find((b) => b.buildingId === buildingId);
    if (building) {
      this.centerMapOnBoundsIfNeeded(building.boundary.coordinates[0]);
    }
  }

  private centerMapOnBoundsIfNeeded(ring: [number, number][], forcePan = false): void {
    if (!this.map || !ring.length) return;

    const bounds = new google.maps.LatLngBounds();
    for (const [lng, lat] of ring) {
      bounds.extend({ lat, lng });
    }

    const mapBounds = this.map.getBounds();

    // If explicit re-center is requested (e.g. campus switch) or map bounds aren't ready yet, pan directly
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
    this.selectedBuildingId.set(null);
    this.originBuildingId.set(null);
    this.destinationBuildingId.set(null);
    this.route.set(null);
    this.isPlanningRoute.set(true);
    this.activePickField.set('origin');
  }

  cancelPlanningRoute(): void {
    this.isPlanningRoute.set(false);
    this.activePickField.set(null);
    this.originBuildingId.set(null);
    this.destinationBuildingId.set(null);
    this.route.set(null);
  }

  pickField(field: 'origin' | 'destination'): void {
    this.activePickField.set(field);
  }

  calculateRoute(): void {
    const from = this.originBuildingId();
    const to = this.destinationBuildingId();
    if (from === null || to === null) return;

    this.isCalculatingRoute.set(true);
    this.navigationService.getRoute(from, to).subscribe({
      next: (route) => {
        this.isCalculatingRoute.set(false);
        this.route.set(route);
      },
      error: () => {
        this.isCalculatingRoute.set(false);
        this.toastService.error('No route could be found between these buildings.');
      }
    });
  }
}