import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { AccountService } from '../../../core/services/account-service';
import { BuildingService } from '../../../core/services/building-service';
import { UniversityService } from '../../../core/services/university-service';
import { Building } from '../../../types/building';
import { CampusMap } from '../../../shared/map/campus-map/campus-map';
import { MapPolygon } from '../../../types/map';
import { CampusService } from '../../../core/services/campus-service';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CampusMap],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class Student implements OnInit {
  protected readonly accountService = inject(AccountService);
  private readonly buildingService = inject(BuildingService);
  private readonly campusService = inject(CampusService);

  protected buildings = signal<Building[]>([]);
  protected campusCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected campusName = signal<string | null>(null);
  protected searchQuery = signal('');
  protected selectedBuildingId = signal<number | null>(null);

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

  protected readonly mapPolygons = computed<MapPolygon[]>(() =>
    this.buildings().map((b) => ({
      id: b.buildingId,
      paths: b.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected: b.buildingId === this.selectedBuildingId()
    }))
  );

  constructor() {
    effect(() => {
      const user = this.accountService.currentUser();
      if (user?.universityId && user.campusId) {
        this.campusService.getCampus(user.campusId).subscribe({
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

        this.buildingService.getBuildings().subscribe({
          next: (buildings) => this.buildings.set(buildings)
        });
      }
    });
  }

  ngOnInit(): void {}

  onMapReady(map: google.maps.Map): void {
    this.map = map;
    const center = this.campusCenter();
    if (center) {
      this.centerMapOnBoundsIfNeeded([[center.lng, center.lat]], true);
    }
  }

  selectBuilding(buildingId: number): void {
    this.selectedBuildingId.set(buildingId === this.selectedBuildingId() ? null : buildingId);

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
}