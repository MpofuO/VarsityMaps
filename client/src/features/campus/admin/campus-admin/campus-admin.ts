// #region Imports
import { Component, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { BuildingService } from '../../../../core/services/building-service';
import { CampusService } from '../../../../core/services/campus-service';
import { ToastService } from '../../../../core/services/toast-service';
import { AddNodeItem, NodeService } from '../../../../core/services/node-service';
import { EdgeService } from '../../../../core/services/edge-service';
import { AccountService } from '../../../../core/services/account-service';
import { CampusBuilding } from '../campus-building/campus-building';
import { Campus } from '../../../../types/campus';
import { Building, BuildingModel } from '../../../../types/building';
import { Node } from '../../../../types/node';
import { Edge } from '../../../../types/edge';
import { CampusMap } from '../../../../shared/map/campus-map/campus-map';
import { MapMarker, MapPolyline } from '../../../../types/map';
import { Modal } from '../../../../shared/modal/modal';
import { ToLatLngPipe } from '../../../../core/pipes/to-lat-lng-pipe';
import { CampusNode } from '../campus-node/campus-node';
import { CampusPaths } from '../campus-path/campus-path';
import { isPointInPolygon, toGeoPolygon } from '../../../../core/functions/geography';
import { EntityDetailModal } from '../../../../shared/entity-detail-modal/entity-detail-modal';
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes-guard';
import { Observable, Subject, take } from 'rxjs';
// #endregion

type EditorMode = 'view' | 'draw-building' | 'place-nodes' | 'place-entrance' | 'connect-nodes' | 'delete-edges';
type EditorTab = 'buildings' | 'nodes' | 'paths';

@Component({
  selector: 'app-campus-admin',
  standalone: true,
  imports: [
    CampusMap,
    Modal,
    ToLatLngPipe,
    CampusBuilding,
    CampusNode,
    CampusPaths,
    EntityDetailModal
  ],
  templateUrl: './campus-admin.html',
  styleUrl: './campus-admin.css'
})
export class CampusAdmin implements OnInit, CanComponentDeactivate {
  // #region View & Map Refs
  @ViewChild(CampusBuilding) buildingsChild?: CampusBuilding;
  @ViewChild(CampusNode) nodesChild?: CampusNode;
  private map?: google.maps.Map;
  // #endregion


  // #region Injected Services
  private readonly buildingService = inject(BuildingService);
  private readonly campusService = inject(CampusService);
  private readonly toastService = inject(ToastService);
  private readonly nodeService = inject(NodeService);
  private readonly edgeService = inject(EdgeService);
  protected readonly accountService = inject(AccountService);
  // #endregion


  // #region Campus & Loaded Data Properties
  protected readonly campus = signal<Campus | null>(null);
  protected readonly buildings = signal<Building[]>([]);
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
    return this.mode() === 'draw-building' || this.mode() === 'place-nodes' || this.mode() === 'connect-nodes';
  })

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hasUnsavedWork())
      return true;

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
  // #endregion


  // #region Paths(Edges) Properties
  protected readonly connectFirstNodeId = signal<number | null>(null);
  protected readonly connectSecondNodeId = signal<number | null>(null);
  protected readonly isEdgeDetailOpen = signal(false);
  protected readonly edgeDetailTarget = signal<Edge | null>(null);
  protected readonly selectedEdgeId = signal<number | null>(null);
  // #endregion


  // #region Map Bindings (computed)
  protected readonly mapPolygons = computed(() =>
    this.buildings().map((b) => ({
      id: b.buildingId,
      paths: b.boundary.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })),
      selected: b.buildingId === this.selectedBuildingId()
    }))
  );

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
      let color = n.buildingId ? '#FF8A3D' : '#16202A';
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
    const detailId = this.edgeDetailTarget()?.edgeId ?? null;
    const selectedId = this.selectedEdgeId();
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
          selected: e.edgeId === selectedId || e.edgeId === detailId
        };
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
    this.connectFirstNodeId.set(null);
    this.connectSecondNodeId.set(null);
    this.closeEdgeDetail();
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
  }

  onMarkerClick(nodeId: number): void {
    if (this.activeTab() === 'nodes') {
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
      this.selectNode(nodeId);
    }
    if (this.mode() === 'connect-nodes') {
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
  }

  private isPointInAnyBuilding(point: google.maps.LatLngLiteral): boolean {
    return this.buildings().some((b) => isPointInPolygon(point, b.boundary.coordinates[0]));
  }

  onMarkerDblClick(nodeId: number): void {
    if (this.activeTab() === 'nodes') {
      this.nodesChild?.openDetailFromParent(nodeId);
    }
  }

  onBuildingDblClick(id: number): void {
    if (this.activeTab() === 'buildings') {
      this.buildingsChild?.openEditFromParent(id);
    }
  }

  onPolylineClick(edgeId: number): void {
    if (this.activeTab() === 'paths') {
      if (this.mode() === 'delete-edges') {
        this.handleDeleteEdge(edgeId);
        return;
      }
      else
        this.selectEdge(edgeId);
    }
  }

  onPolylineDblClick(edgeId: number): void {
    if (this.activeTab() === 'paths') {
      const edge = this.edges().find((e) => e.edgeId === edgeId);
      if (edge) {
        this.edgeDetailTarget.set(edge);
        this.isEdgeDetailOpen.set(true);
      }
    }

  }
  // #endregion


  // #region Buildings
  startDrawing(): void {
    this.selectedBuildingId.set(null);
    this.draftPath.set([]);
    this.mode.set('draw-building');
  }

  finishDrawing(): void {
    if (this.draftPath().length < 3) {
      this.toastService.error('A building outline needs at least three points.');
      return;
    }
    this.buildingsChild?.openCreate();
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

  handleRenameNode(event: { id: number; name: string | null }): void {
    this.nodeService.renameNode(event.id, event.name).subscribe({
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
    this.mode.set('place-entrance');
  }

  confirmEntrance(): void {
    const building = this.entranceTargetBuilding();
    const point = this.draftEntrancePoint();
    const name = this.entranceName().trim();
    if (!building || !point || !name) return;

    this.nodeService.addEntranceNode(building.buildingId, name, { type: 'Point', coordinates: [point.lng, point.lat] }).subscribe({
      next: () => {
        this.toastService.success('Entrance added.');
        this.isEntranceConfirmOpen.set(false);
        this.cancelMode();
        this.load();
      },
      error: () => this.isEntranceConfirmOpen.set(false)
    });
  }
  // #endregion


  // #region Paths (Edges)
  startConnecting(): void {
    this.mode.set('connect-nodes');
    this.connectFirstNodeId.set(null);
    this.connectSecondNodeId.set(null);
  }

  startDeletingEdges(): void {
    this.mode.set('delete-edges');
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

  closeEdgeDetail(): void {
    this.isEdgeDetailOpen.set(false);
    this.edgeDetailTarget.set(null);
  }

  saveEdgeDetail(name: string | null): void {
    const edge = this.edgeDetailTarget();
    if (!edge) return;
    this.edgeService.renameEdge(edge.edgeId, name).subscribe({
      next: () => {
        this.toastService.success('Path updated.');
        this.closeEdgeDetail();
        this.load();
      }
    });
  }

  deleteEdgeDetail(): void {
    const edge = this.edgeDetailTarget();
    if (!edge) return;
    this.handleDeleteEdge(edge.edgeId);
    this.closeEdgeDetail();
  }

  handleDeleteEdge(id: number): void {
    this.edgeService.deleteEdge(id).subscribe({
      next: () => {
        this.toastService.success('Path removed.');
        this.load();
      }
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

