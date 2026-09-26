// #region Imports
import { Component, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { BuildingService } from '../../../../core/services/building-service';
import { ParkingAreaService } from '../../../../core/services/parking-area-service';
import { CampusService } from '../../../../core/services/campus-service';
import { ToastService } from '../../../../core/services/toast-service';
import { AddNodeItem, NodeService } from '../../../../core/services/node-service';
import { EdgeService } from '../../../../core/services/edge-service';
import { AccountService } from '../../../../core/services/account-service';
import { CampusBuilding } from '../campus-building/campus-building';
import { CampusParkingArea } from '../campus-parking-area/campus-parking-area';
import { Campus } from '../../../../types/campus';
import { Building, BuildingModel } from '../../../../types/building';
import { ParkingArea, ParkingAreaModel } from '../../../../types/parking-area';
import { Node } from '../../../../types/node';
import { Edge, TravelMode } from '../../../../types/edge';
import { CampusMap } from '../../../../shared/map/campus-map/campus-map';
import { MapMarker, MapPolyline } from '../../../../types/map';
import { Modal } from '../../../../shared/modal/modal';
import { ToLatLngPipe } from '../../../../core/pipes/to-lat-lng-pipe';
import { CampusNode } from '../campus-node/campus-node';
import { CampusPaths } from '../campus-path/campus-path';
import { isPointInPolygon, toGeoPolygon } from '../../../../core/functions/geography';
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes-guard';
import { Observable, Subject, take } from 'rxjs';
// #endregion

type EditorMode = 'view' | 'draw-building'
  | 'draw-parking-area'
  | 'place-nodes' | 'place-entrance' | 'connect-nodes'
  | 'place-parking-access'
  | 'select-edges' | 'select-path-range';
type EditorTab = 'buildings' | 'parking-areas' | 'nodes' | 'paths';

@Component({
  selector: 'app-campus-admin',
  standalone: true,
  imports: [
    CampusMap,
    Modal,
    ToLatLngPipe,
    CampusBuilding,
    CampusParkingArea,
    CampusNode,
    CampusPaths
  ],
  templateUrl: './campus-admin.html',
  styleUrl: './campus-admin.css'
})
export class CampusAdmin implements OnInit, CanComponentDeactivate {
  // #region View & Map Refs
  @ViewChild(CampusBuilding) buildingsChild?: CampusBuilding;
  @ViewChild(CampusParkingArea) parkingAreasChild?: CampusParkingArea;
  @ViewChild(CampusNode) nodesChild?: CampusNode;
  private map?: google.maps.Map;
  // #endregion

  // #region Injected Services
  private readonly buildingService = inject(BuildingService);
  private readonly parkingAreaService = inject(ParkingAreaService);
  private readonly campusService = inject(CampusService);
  private readonly toastService = inject(ToastService);
  private readonly nodeService = inject(NodeService);
  private readonly edgeService = inject(EdgeService);
  protected readonly accountService = inject(AccountService);
  // #endregion

  // #region Campus & Loaded Data Properties
  protected readonly campus = signal<Campus | null>(null);
  protected readonly buildings = signal<Building[]>([]);
  protected readonly parkingAreas = signal<ParkingArea[]>([]);
  protected readonly nodes = signal<Node[]>([]);
  protected readonly edges = signal<Edge[]>([]);
  // #endregion

  // #region Editor Mode & Tabs Properties
  protected readonly activeTab = signal<EditorTab>('buildings');
  protected readonly mode = signal<EditorMode>('view');
  // #endregion

  // #region Unloading Unsaved
  protected readonly isLeaveConfirmOpen = signal(false);
  private leaveConfirmSubject: Subject<boolean> | null = null;
  hasUnsavedWork = computed(() => {
    return this.mode() === 'draw-building' || this.mode() === 'draw-parking-area' ||
      this.mode() === 'place-nodes' || this.mode() === 'place-parking-access' || this.mode() === 'connect-nodes';
  });

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hasUnsavedWork()) return true;

    this.leaveConfirmSubject = new Subject<boolean>();
    this.isLeaveConfirmOpen.set(true);
    return this.leaveConfirmSubject.asObservable();
  }

  confirmLeave(): void {
    this.isLeaveConfirmOpen.set(false);
    this.leaveConfirmSubject?.next(true);
    this.leaveConfirmSubject?.complete();
    this.leaveConfirmSubject = null;
  }

  cancelLeave(): void {
    this.isLeaveConfirmOpen.set(false);
    this.leaveConfirmSubject?.next(false);
    this.leaveConfirmSubject?.complete();
    this.leaveConfirmSubject = null;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedWork()) {
      event.preventDefault();
    }
  }
  // #endregion

  // #region Buildings Properties
  protected readonly selectedBuildingId = signal<number | null>(null);
  protected readonly selectedParkingAreaId = signal<number | null>(null);
  protected readonly draftPath = signal<google.maps.LatLngLiteral[]>([]);
  private draftBoundaryLine?: google.maps.Polyline;
  // #endregion

  // #region Nodes Properties
  protected readonly draftNodePath = signal<{ point: google.maps.LatLngLiteral; existingNodeId: number | null }[]>([]);
  protected readonly selectedNodeId = signal<number | null>(null);
  private draftPolyline?: google.maps.Polyline;
  private draftPointMarkers: google.maps.Marker[] = [];
  // #endregion

  // #region Entrances Properties
  protected readonly entranceTargetBuilding = signal<Building | null>(null);
  protected readonly isEntranceConfirmOpen = signal(false);
  protected readonly draftEntrancePoint = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly entranceName = signal('');
  protected readonly interestOfEntrance = signal('');
  protected readonly parkingAccessTarget = signal<ParkingArea | null>(null);
  protected readonly isParkingAccessConfirmOpen = signal(false);
  protected readonly parkingAccessName = signal('');
  // #endregion

  // #region Paths(Edges) Properties
  protected readonly connectFirstNodeId = signal<number | null>(null);
  protected readonly connectSecondNodeId = signal<number | null>(null);
  protected readonly selectedEdgeId = signal<number | null>(null);
  protected readonly selectedEdgeIds = signal<Set<number>>(new Set());

  protected readonly rangeStartNodeId = signal<number | null>(null);
  protected readonly rangeEndNodeId = signal<number | null>(null);

  protected readonly edgePropertiesTarget = signal<{ ids: number[] } | null>(null);
  protected readonly isEdgePropertiesOpen = signal(false);
  protected readonly isBulkDeleteConfirmOpen = signal(false);
  protected readonly propertiesName = signal('');
  protected readonly propertiesIsClosed = signal(false);
  protected readonly propertiesClosedUntil = signal('');
  protected readonly propertiesTravelModes = signal<Set<TravelMode>>(new Set([TravelMode.Walking]));
  protected readonly isBulkEdit = computed(() => (this.edgePropertiesTarget()?.ids.length ?? 0) > 1);

  readonly travelModeOptions = [
    { value: TravelMode.Walking, label: 'Walking' },
    { value: TravelMode.Cycling, label: 'Cycling' },
    { value: TravelMode.Bus, label: 'Bus' },
    { value: TravelMode.Car, label: 'Car' }
  ];
  // #endregion

  // #region Map Bindings (computed)
  protected readonly mapPolygons = computed(() => [
    ...this.buildings().map((b) => ({
      id: `building-${b.buildingId}`,
      paths: b.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected: b.buildingId === this.selectedBuildingId(),
      clickable: this.mode() !== 'place-nodes' || !b.allowsPassage,
      strokeColor: '#7c3aed',
      fillColor: '#8b5cf6'
    })),
    ...this.parkingAreas().map((p) => ({
      id: `parking-${p.parkingAreaId}`,
      paths: p.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected: p.parkingAreaId === this.selectedParkingAreaId(),
      clickable: this.mode() !== 'place-nodes',
      strokeColor: '#0891b2',
      fillColor: '#06b6d4'
    }))
  ]);

  protected readonly nodeMarkers = computed<MapMarker[]>(() => {
    const first = this.connectFirstNodeId();
    const second = this.connectSecondNodeId();
    const connectedToFirst = new Set<number>();
    if (first !== null) {
      for (const e of this.edges()) {
        if (e.fromNodeId === first) connectedToFirst.add(e.toNodeId);
        if (e.toNodeId === first) connectedToFirst.add(e.fromNodeId);
      }
    }

    return this.nodes().map((n) => {
      let color = n.buildingId ? '#FF8A3D' : n.parkingAreaId ? '#FFCE1B' : '#16202A';
      if (this.mode() === 'connect-nodes') {
        if (n.nodeId === first || n.nodeId === second) {
          color = '#3b82f6';
        } else if (connectedToFirst.has(n.nodeId)) {
          color = '#D3D1C7';
        }
      }
      return {
        id: n.nodeId,
        position: { lat: n.location.coordinates[1], lng: n.location.coordinates[0] },
        color,
        selected: n.nodeId === this.selectedNodeId()
      };
    });
  });

  protected readonly edgePolylines = computed<MapPolyline[]>(() => {
    const nodesById = new Map(this.nodes().map((n) => [n.nodeId, n]));
    const propertiesIds = new Set(this.edgePropertiesTarget()?.ids ?? []);
    const selectedId = this.selectedEdgeId();
    const multiSelected = this.selectedEdgeIds();

    return this.edges()
      .map((e) => {
        const from = nodesById.get(e.fromNodeId);
        const to = nodesById.get(e.toNodeId);
        if (!from || !to) return null;
        return {
          id: e.edgeId,
          path: [
            { lat: from.location.coordinates[1], lng: from.location.coordinates[0] },
            { lat: to.location.coordinates[1], lng: to.location.coordinates[0] }
          ],
          color: e.isEffectivelyClosed ? '#ef4444' : undefined,
          selected: e.edgeId === selectedId || multiSelected.has(e.edgeId) || propertiesIds.has(e.edgeId)
        } as MapPolyline;
      })
      .filter((p): p is MapPolyline => p !== null);
  });
  // #endregion

  // #region Lifecycle
  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const userCampusId = this.accountService.currentUser()?.campusId;
    if (userCampusId) {
      this.campusService.getCampus(userCampusId).subscribe({ next: (c) => this.campus.set(c) });
    }
    this.buildingService.getBuildings().subscribe({ next: (b) => this.buildings.set(b) });
    this.parkingAreaService.getParkingAreas().subscribe({ next: (p) => this.parkingAreas.set(p) });
    this.nodeService.getNodes().subscribe({ next: (n) => this.nodes.set(n) });
    this.edgeService.getEdges().subscribe({ next: (e) => this.edges.set(e) });
  }
  // #endregion

  // #region Mode & Tab Control
  switchTab(tab: EditorTab): void {
    const result = this.canDeactivate();

    if (typeof result === 'boolean') {
      if (result) {
        this.applyTabSwitch(tab);
      }
      return;
    }

    result.pipe(take(1)).subscribe((canLeave) => {
      if (canLeave) {
        this.applyTabSwitch(tab);
      }
    });
  }

  private applyTabSwitch(tab: EditorTab): void {
    this.activeTab.set(tab);
    this.selectedBuildingId.set(null);
    this.selectedParkingAreaId.set(null);
    this.selectedNodeId.set(null);
    this.selectedEdgeId.set(null);
    this.cancelMode();
  }

  cancelMode(): void {
    this.mode.set('view');
    this.draftPath.set([]);
    this.draftBoundaryLine?.setMap(null);
    this.draftBoundaryLine = undefined;
    this.draftNodePath.set([]);
    this.draftPolyline?.setMap(null);
    this.draftPolyline = undefined;
    this.clearDraftPointMarkers();
    this.entranceTargetBuilding.set(null);
    this.draftEntrancePoint.set(null);
    this.parkingAccessTarget.set(null);
    this.draftEntrancePoint.set(null);
    this.isParkingAccessConfirmOpen.set(false);
    this.connectFirstNodeId.set(null);
    this.connectSecondNodeId.set(null);
    this.rangeStartNodeId.set(null);
    this.rangeEndNodeId.set(null);
    this.selectedEdgeIds.set(new Set());
    this.isEdgePropertiesOpen.set(false);
    this.edgePropertiesTarget.set(null);
    this.isBulkDeleteConfirmOpen.set(false);
  }
  // #endregion

  // #region Map Events
  onMapReady(map: google.maps.Map): void {
    this.map = map;
  }

  onMapClick(latLng: google.maps.LatLng): void {
    const point = { lat: latLng.lat(), lng: latLng.lng() };


    if (this.mode() === 'draw-building') {
      const path = this.draftPath();
      if (path.length >= 3 && this.isNearFirstVertex(point, path[0])) {
        this.finishDrawing();
        return;
      }
      const nextPath = [...path, point];
      this.draftPath.set(nextPath);
      this.renderDraftBoundary(nextPath);
      return;
    }

    if (this.mode() === 'draw-parking-area') {
      const path = this.draftPath();
      if (path.length >= 3 && this.isNearFirstVertex(point, path[0])) {
        this.finishDrawing();
        return;
      }
      const nextPath = [...path, point];
      this.draftPath.set(nextPath);
      this.renderDraftBoundary(nextPath);
      return;
    }

    if (this.mode() === 'place-nodes') {
      if (this.isPointInAnyBuilding(point)) {
        this.toastService.error('That point is inside a building — pick a point outside it.');
        return;
      }
      const nextPath = [...this.draftNodePath(), { point, existingNodeId: null }];
      this.draftNodePath.set(nextPath);
      this.renderDraftPolyline(nextPath.map((p) => p.point));
      this.addDraftPointMarker(point);
      return;
    }

    if (this.mode() === 'place-entrance') {
      this.draftEntrancePoint.set(point);
      this.isEntranceConfirmOpen.set(true);
    }

    if (this.mode() === 'place-parking-access') {
      this.draftEntrancePoint.set(point);
      this.isParkingAccessConfirmOpen.set(true);
    }
  }

  onMarkerClick(nodeId: number): void {
    if (this.mode() === 'place-nodes') {
      const node = this.nodes().find((n) => n.nodeId === nodeId);
      if (!node) return;
      const point = { lat: node.location.coordinates[1], lng: node.location.coordinates[0] };
      const nextPath = [...this.draftNodePath(), { point, existingNodeId: nodeId }];
      this.draftNodePath.set(nextPath);
      this.renderDraftPolyline(nextPath.map((p) => p.point));
      this.finishPlacingNodes();
      return;
    }
    else if (this.mode() === 'connect-nodes') {
      this.selectedNodeId.set(null);
      const first = this.connectFirstNodeId();
      if (first === null) {
        this.connectFirstNodeId.set(nodeId);
        return;
      }
      if (nodeId === first) return;

      const alreadyConnected = this.edges().some(
        (e) => (e.fromNodeId === first && e.toNodeId === nodeId) || (e.toNodeId === first && e.fromNodeId === nodeId)
      );
      if (alreadyConnected) {
        this.toastService.error('These nodes are already connected.');
        return;
      }
      this.connectSecondNodeId.set(nodeId);
      return;
    }
    if (this.mode() === 'select-path-range') {
      const start = this.rangeStartNodeId();
      if (start === null) {
        this.rangeStartNodeId.set(nodeId);
        this.selectNode(nodeId);
        this.toastService.info('Start node selected. Now pick the end node.');
        return;
      }

      if (start === nodeId) {
        this.toastService.error('Start and end nodes must be different.');
        return;
      }

      this.rangeEndNodeId.set(nodeId);

      this.edgeService.getPathEdges(start, nodeId).subscribe({
        next: (edgeIds) => {
          this.selectNode(start);
          if (!edgeIds || edgeIds.length === 0) {
            this.toastService.error('No connected route exists between these nodes.');
            return;
          }

          const updated = new Set([...this.selectedEdgeIds(), ...edgeIds]);
          this.selectedEdgeIds.set(updated);

          this.toastService.info('Shortest route path was chosen and added to selection.');
          this.mode.set('select-edges');
        },
        error: () => {
          this.toastService.error('Unable to find a valid route between these nodes.');
          this.rangeEndNodeId.set(null);
        }
      });
      return;
    }

    if (this.activeTab() === 'nodes')
      this.selectNode(nodeId);
  }

  private isPointInAnyBuilding(point: google.maps.LatLngLiteral): boolean {
    return this.buildings().some((b) => !b.allowsPassage && isPointInPolygon(point, b.boundary.coordinates[0]));
  }

  onMarkerDblClick(nodeId: number): void {
    if (this.activeTab() === 'nodes') {
      this.nodesChild?.openDetailFromParent(nodeId);
    }
  }

  onPolygonClick(key: string): void {
    const [kind, idText] = key.split('-');
    const id = Number(idText);
    if (!Number.isInteger(id)) return;

    if (kind === 'building') this.selectBuilding(id);
    if (kind === 'parking') this.selectParkingArea(id);
  }

  onPolygonDblClick(key: string): void {
    const [kind, idText] = key.split('-');
    const id = Number(idText);
    if (!Number.isInteger(id)) return;

    if (kind === 'building' && this.activeTab() === 'buildings') {
      this.selectedBuildingId.set(id);
      this.buildingsChild?.openEditFromParent(id);
    }
    if (kind === 'parking' && this.activeTab() === 'parking-areas') {
      this.selectedParkingAreaId.set(id);
      this.parkingAreasChild?.openEditFromParent(id);
    }
  }

  onPolylineClick(edgeId: number): void {
    if (this.activeTab() === 'paths') {
      if (this.mode() === 'select-edges') {
        this.toggleEdgeSelection(edgeId);
        return;
      }
      this.selectEdge(edgeId);
    }
  }

  onPolylineDblClick(edgeId: number): void {
    if (this.activeTab() === 'paths') {
      this.openSingleEdgeProperties(edgeId);
    }
  }
  // #endregion

  // #region Buildings
  startDrawing(): void {
    this.selectedBuildingId.set(null);
    this.draftPath.set([]);
    this.mode.set('draw-building');
  }

  startDrawingParkingArea(): void {
    this.selectedParkingAreaId.set(null);
    this.draftPath.set([]);
    this.mode.set('draw-parking-area');
  }

  finishDrawing(): void {
    if (this.draftPath().length < 3) {
      this.toastService.error('A building outline needs at least three points.');
      return;
    }
    if (this.mode() === 'draw-building') this.buildingsChild?.openCreate();
    if (this.mode() === 'draw-parking-area') this.parkingAreasChild?.openCreate();
  }

  handleCreateBuilding(modelData: Omit<BuildingModel, 'boundary'>): void {
    const model: BuildingModel = { ...modelData, boundary: toGeoPolygon(this.draftPath()) };
    this.buildingService.createBuilding(model).subscribe({
      next: () => {
        this.toastService.success('Building added.');
        this.cancelMode();
        this.load();
      }
    });
  }

  handleUpdateBuilding(data: { id: number; model: Omit<BuildingModel, 'boundary'> }): void {
    const building = this.buildings().find((b) => b.buildingId === data.id);
    if (!building) return;

    const model: BuildingModel = { ...data.model, boundary: building.boundary };
    this.buildingService.updateBuilding(data.id, model).subscribe({
      next: () => {
        this.toastService.success('Building updated.');
        this.load();
      }
    });
  }

  handleDeleteBuilding(id: number): void {
    this.buildingService.deleteBuilding(id).subscribe({
      next: () => {
        this.toastService.success('Building deleted.');
        this.load();
      }
    });
  }

  handleCreateParkingArea(modelData: Omit<ParkingAreaModel, 'boundary'>): void {
    const model: ParkingAreaModel = { ...modelData, boundary: toGeoPolygon(this.draftPath()) };
    this.parkingAreaService.addParkingArea(model).subscribe({
      next: () => {
        this.toastService.success('Parking area added.');
        this.cancelMode();
        this.load();
      }
    });
  }

  handleUpdateParkingArea(data: { id: number; model: Omit<ParkingAreaModel, 'boundary'> }): void {
    const parkingArea = this.parkingAreas().find((area) => area.parkingAreaId === data.id);
    if (!parkingArea) return;

    const model: ParkingAreaModel = { ...data.model, boundary: parkingArea.boundary };
    this.parkingAreaService.updateParkingArea(data.id, model).subscribe({
      next: () => {
        this.toastService.success('Parking area updated.');
        this.load();
      }
    });
  }

  handleDeleteParkingArea(id: number): void {
    this.parkingAreaService.deleteParkingArea(id).subscribe({
      next: () => {
        this.toastService.success('Parking area deleted.');
        this.load();
      }
    });
  }

  selectBuilding(id: number): void {
    if (this.activeTab() !== 'buildings') return;
    const isSelected = id === this.selectedBuildingId();
    const selectedId = isSelected ? null : id;
    this.selectedBuildingId.set(selectedId);

    if (selectedId !== null) {
      const building = this.buildings().find((b) => b.buildingId === selectedId);
      if (building?.boundary?.coordinates[0]?.[0]) {
        const [lng, lat] = building.boundary.coordinates[0][0];
        this.panTo(lng, lat);
      }
    }
  }

  selectParkingArea(id: number): void {
    if (this.activeTab() !== 'parking-areas') return;
    const selectedId = id === this.selectedParkingAreaId() ? null : id;
    this.selectedParkingAreaId.set(selectedId);

    if (selectedId !== null) {
      const parkingArea = this.parkingAreas().find((area) => area.parkingAreaId === selectedId);
      if (parkingArea?.boundary?.coordinates[0]?.[0]) {
        const [lng, lat] = parkingArea.boundary.coordinates[0][0];
        this.panTo(lng, lat);
      }
    }
  }

  private renderDraftBoundary(path: google.maps.LatLngLiteral[]): void {
    if (!this.map) return;

    if (!this.draftBoundaryLine) {
      this.draftBoundaryLine = new google.maps.Polyline({
        map: this.map,
        path,
        strokeColor: '#7c3aed',
        strokeWeight: 3,
        strokeOpacity: 0.9
      });
    } else {
      this.draftBoundaryLine.setPath(path);
    }
  }

  private isNearFirstVertex(point: google.maps.LatLngLiteral, first: google.maps.LatLngLiteral): boolean {
    return Math.abs(point.lat - first.lat) < 0.00006 && Math.abs(point.lng - first.lng) < 0.00006;
  }
  // #endregion

  // #region Nodes
  startPlacingNodes(): void {
    this.mode.set('place-nodes');
    this.draftNodePath.set([]);
  }

  finishPlacingNodes(): void {
    const path = this.draftNodePath();
    if (path.length < 2) {
      this.toastService.error('Place at least two points to form a path.');
      return;
    }

    const items: AddNodeItem[] = path.map((p) => ({
      existingNodeId: p.existingNodeId,
      name: null,
      location: p.existingNodeId ? null : { type: 'Point', coordinates: [p.point.lng, p.point.lat] }
    }));

    this.nodeService.addNodes(items).subscribe({
      next: () => {
        this.toastService.success('Nodes added.');
        this.cancelMode();
        this.load();
      }
    });
  }

  handleRenameNode(event: { id: number; name: string | null; interestOfEntrance: string | null }): void {
    this.nodeService.updateNodeDetails(event.id, event.name, event.interestOfEntrance).subscribe({
      next: () => {
        this.toastService.success('Node updated.');
        this.load();
      }
    });
  }

  handleDeleteNode(id: number): void {
    this.nodeService.deleteNode(id).subscribe({
      next: () => {
        this.toastService.success('Node deleted.');
        this.load();
      }
    });
  }

  selectNode(id: number): void {
    const isSelected = id === this.selectedNodeId();
    const nextId = isSelected ? null : id;
    this.selectedNodeId.set(nextId);

    if (nextId !== null) {
      const node = this.nodes().find((n) => n.nodeId === nextId);
      if (node?.location?.coordinates) {
        const [lng, lat] = node.location.coordinates;
        this.panTo(lng, lat);
      }
    }
  }

  private renderDraftPolyline(path: google.maps.LatLngLiteral[]): void {
    if (!this.map) return;
    if (!this.draftPolyline) {
      this.draftPolyline = new google.maps.Polyline({
        map: this.map,
        path,
        strokeColor: '#FF8A3D',
        strokeWeight: 3
      });
    } else {
      this.draftPolyline.setPath(path);
    }
  }

  private addDraftPointMarker(point: google.maps.LatLngLiteral): void {
    if (!this.map) return;
    const marker = new google.maps.Marker({
      map: this.map,
      position: point,
      clickable: false,
      zIndex: 5,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 4,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#F6F7F5',
        strokeWeight: 1
      }
    });
    this.draftPointMarkers.push(marker);
  }

  private clearDraftPointMarkers(): void {
    this.draftPointMarkers.forEach((m) => m.setMap(null));
    this.draftPointMarkers = [];
  }
  // #endregion

  // #region Entrances
  startEntrance(building: Building): void {
    this.entranceTargetBuilding.set(building);
    this.entranceName.set('');
    this.interestOfEntrance.set('');
    this.mode.set('place-entrance');
  }

  startParkingAccessNode(parkingArea: ParkingArea): void {
    this.parkingAccessTarget.set(parkingArea);
    this.parkingAccessName.set('');
    this.mode.set('place-parking-access');
  }

  confirmEntrance(): void {
    const building = this.entranceTargetBuilding();
    const point = this.draftEntrancePoint();
    const name = this.entranceName().trim();
    if (!building || !point || !name) return;

    this.nodeService.addEntranceNode(
      building.buildingId,
      name,
      this.interestOfEntrance(),
      { type: 'Point', coordinates: [point.lng, point.lat] }
    ).subscribe({
      next: () => {
        this.toastService.success('Entrance added.');
        this.isEntranceConfirmOpen.set(false);
        this.cancelMode();
        this.load();
      },
      error: () => this.isEntranceConfirmOpen.set(false)
    });
  }

  confirmParkingAccessNode(): void {
    const parkingArea = this.parkingAccessTarget();
    const point = this.draftEntrancePoint();
    const name = this.parkingAccessName().trim();
    if (!parkingArea || !point || !name) return;

    this.nodeService.addParkingAccessNode(parkingArea.parkingAreaId, name, {
      type: 'Point',
      coordinates: [point.lng, point.lat]
    }).subscribe({
      next: () => {
        this.toastService.success('Parking access node added.');
        this.isParkingAccessConfirmOpen.set(false);
        this.cancelMode();
        this.load();
      },
      error: () => this.isParkingAccessConfirmOpen.set(false)
    });
  }
  // #endregion

  // #region Paths (Edges)
  startConnecting(): void {
    this.mode.set('connect-nodes');
    this.connectFirstNodeId.set(null);
    this.connectSecondNodeId.set(null);
  }

  startSelectingEdges(): void {
    this.mode.set('select-edges');
    this.selectedEdgeId.set(null);
    this.selectedEdgeIds.set(new Set());
  }

  toggleEdgeSelection(edgeId: number): void {
    const set = new Set(this.selectedEdgeIds());
    if (set.has(edgeId)) {
      set.delete(edgeId);
    } else {
      set.add(edgeId);
    }
    this.selectedEdgeIds.set(set);
  }

  submitConnection(): void {
    const first = this.connectFirstNodeId();
    const second = this.connectSecondNodeId();
    if (first === null || second === null) return;

    this.edgeService.addEdge(first, second).subscribe({
      next: () => {
        this.toastService.success('Nodes connected.');
        this.cancelMode();
        this.load();
      }
    });
  }

  selectEdge(id: number): void {
    const isSelected = id === this.selectedEdgeId();
    const nextId = isSelected ? null : id;
    this.selectedEdgeId.set(nextId);

    if (nextId !== null && this.map) {
      const edge = this.edges().find((e) => e.edgeId === nextId);
      if (edge) {
        const fromNode = this.nodes().find((n) => n.nodeId === edge.fromNodeId);
        if (fromNode?.location?.coordinates) {
          const [lng, lat] = fromNode.location.coordinates;
          this.panTo(lng, lat);
        }
      }
    }
  }

  startSelectingPathRange(): void {
    this.mode.set('select-path-range');
    this.selectedEdgeId.set(null);
    this.rangeStartNodeId.set(null);
    this.rangeEndNodeId.set(null);
  }

  private encodeTravelModes(modes: Set<TravelMode>): number {
    let value = 0;
    for (const m of modes) value |= m;
    return value;
  }

  private decodeTravelModes(value: number): Set<TravelMode> {
    const modes = new Set<TravelMode>();
    for (const m of [TravelMode.Walking, TravelMode.Cycling, TravelMode.Bus, TravelMode.Car]) {
      if ((value & m) !== 0) modes.add(m);
    }
    return modes;
  }

  toggleTravelMode(mode: TravelMode): void {
    const set = new Set(this.propertiesTravelModes());
    if (set.has(mode)) set.delete(mode); else set.add(mode);
    this.propertiesTravelModes.set(set);
  }

  openSingleEdgeProperties(edgeId: number): void {
    const edge = this.edges().find((e) => e.edgeId === edgeId);
    if (!edge) return;

    this.edgePropertiesTarget.set({ ids: [edge.edgeId] });
    this.propertiesName.set(edge.name ?? '');
    this.propertiesIsClosed.set(edge.isClosed);
    this.propertiesClosedUntil.set(edge.closedUntil ? edge.closedUntil.substring(0, 10) : '');
    this.propertiesTravelModes.set(this.decodeTravelModes(edge.travelModes));
    this.isEdgePropertiesOpen.set(true);
  }

  openBulkEdgeProperties(): void {
  const ids = Array.from(this.selectedEdgeIds());
  if (ids.length === 0) return;

  const selectedEdges = this.edges().filter((e) => this.selectedEdgeIds().has(e.edgeId));

  const allClosed = selectedEdges.length > 0 && selectedEdges.every((e) => e.isClosed || e.isEffectivelyClosed);
  this.propertiesIsClosed.set(allClosed);

  const commonModes = new Set<TravelMode>();

  if (selectedEdges.length > 0) {
    const availableModes = [
      TravelMode.Walking, 
      TravelMode.Cycling, 
      TravelMode.Bus, 
      TravelMode.Car
    ];

    for (const mode of availableModes) {
      const isAvailableInAll = selectedEdges.every(
        (e) => (e.travelModes & mode) === mode
      );

      if (isAvailableInAll) {
        commonModes.add(mode);
      }
    }
  }

  if (commonModes.size === 0) {
    commonModes.add(TravelMode.Walking);
  }

  this.edgePropertiesTarget.set({ ids });
  this.propertiesName.set('');
  this.propertiesClosedUntil.set('');
  this.propertiesTravelModes.set(commonModes);
  this.isEdgePropertiesOpen.set(true);
}

  openBulkDeleteConfirm(): void {
    if (this.selectedEdgeIds().size === 0) return;
    this.isBulkDeleteConfirmOpen.set(true);
  }

  saveEdgeProperties(): void {
    const target = this.edgePropertiesTarget();
    if (!target) return;

    const travelModes = this.encodeTravelModes(this.propertiesTravelModes());
    const closedUntil = this.propertiesClosedUntil() ? new Date(this.propertiesClosedUntil()).toISOString() : null;

    if (target.ids.length === 1) {
      this.edgeService.updateEdge(target.ids[0], {
        name: this.propertiesName().trim() || null,
        isClosed: this.propertiesIsClosed(),
        closedUntil,
        travelModes
      }).subscribe({
        next: () => {
          this.toastService.success('Path updated.');
          this.cancelMode();
          this.load();
        }
      });
    } else {
      this.edgeService.bulkUpdateEdges(target.ids, this.propertiesIsClosed(), closedUntil, travelModes).subscribe({
        next: () => {
          this.toastService.success(`${target.ids.length} paths updated.`);
          this.cancelMode();
          this.load();
        }
      });
    }
  }

  deleteEdgeProperties(): void {
    const target = this.edgePropertiesTarget();
    if (!target || target.ids.length !== 1) return;
    this.handleDeleteEdge(target.ids[0]);
    this.cancelMode();
  }

  handleDeleteEdge(id: number): void {
    this.edgeService.deleteEdge(id).subscribe({
      next: () => {
        this.toastService.success('Path removed.');
        this.load();
      }
    });
  }

  confirmBulkDelete(): void {
    const ids = Array.from(this.selectedEdgeIds());
    if (ids.length === 0) return;

    let deletedCount = 0;
    ids.forEach((id) => {
      this.edgeService.deleteEdge(id).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount === ids.length) {
            this.toastService.success(`${ids.length} path(s) deleted.`);
            this.isBulkDeleteConfirmOpen.set(false);
            this.cancelMode();
            this.load();
          }
        }
      });
    });
  }
  // #endregion

  private panTo(lat: number, lng: number) {
    if (this.map) {
      const targetLatLng = new google.maps.LatLng(lng, lat);
      const currentBounds = this.map.getBounds();

      if (currentBounds && !currentBounds.contains(targetLatLng)) {
        this.map.panTo(targetLatLng);
      }
    }
  }
}