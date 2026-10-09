import { AfterViewInit, Component, ElementRef, ViewChild, effect, input, output, signal } from '@angular/core';
import { loadGoogleMaps } from '../../../core/functions/load-google-maps';
import { MapPolygon, MapMarker, MapPolyline } from '../../../types/map';

const SOUTH_AFRICA_CENTER = { lat: -28.4793, lng: 24.6727 };
const DEFAULT_ZOOM = 5;
const CAMPUS_ZOOM = 18.5;

function createPolygonLabelOverlay(position: google.maps.LatLngLiteral, text: string) {
  class PolygonLabelOverlay extends google.maps.OverlayView {
    private element?: HTMLDivElement;
    private visible = true;

    constructor(
      private position: google.maps.LatLngLiteral,
      private text: string
    ) {
      super();
    }

    override onAdd(): void {
      this.element = document.createElement('div');
      this.element.textContent = this.text;
      Object.assign(this.element.style, {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        zIndex: '50',
        borderRadius: '4px',
        color: '#DCD7C8',
        fontSize: '13px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        textShadow: '0 0 2px #000, 0 0 4px #000, 1px 1px 2px #000, -1px -1px 2px #000',
        display: this.visible ? '' : 'none'
      });
      this.getPanes()?.overlayLayer.appendChild(this.element);
    }

    override draw(): void {
      if (!this.element) {
        return;
      }

      const projection = this.getProjection();
      if (!projection) {
        return;
      }

      const pixel = projection.fromLatLngToDivPixel(this.position);

      if (pixel) {

        this.element.style.left = `${pixel.x}px`;
        this.element.style.top = `${pixel.y}px`;
      }
    }


    override onRemove(): void {
      this.element?.remove();
      this.element = undefined;
    }

    update(position: google.maps.LatLngLiteral, text: string): void {
      this.position = position;
      this.text = text;
      if (this.element) {
        this.element.textContent = text;
        this.draw();
      }
    }
  }

  return new PolygonLabelOverlay(position, text);
}

@Component({
  selector: 'app-campus-map',
  standalone: true,
  imports: [],
  templateUrl: './campus-map.html',
  styleUrl: './campus-map.css'
})
export class CampusMap implements AfterViewInit {
  center = input<google.maps.LatLngLiteral | null>(null);
  polygons = input<MapPolygon[]>([]);
  markers = input<MapMarker[]>([]);
  polylines = input<MapPolyline[]>([]);
  isStudent = input<boolean>(false);
  placingPathNodes = input<boolean>(false);

  mapClick = output<google.maps.LatLng>();
  polygonClick = output<string>();
  polygonDblClick = output<string>();
  markerClick = output<number>();
  markerDblClick = output<number>();
  polylineClick = output<number>();
  polylineDblClick = output<number>();
  ready = output<google.maps.Map>();

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private map?: google.maps.Map;
  private readonly renderedPolygons = new Map<string, google.maps.Polygon>();
  private readonly renderedPolygonLabels = new Map<
    string,
    ReturnType<typeof createPolygonLabelOverlay>
  >();
  private readonly renderedMarkers = new Map<number, google.maps.Marker>();
  private readonly renderedPolylines = new Map<number, google.maps.Polyline>();
  private readonly isReady = signal(false);
  protected readonly showGoogleLabels = signal(false);

  constructor() {
    effect(() => this.syncCenter(this.center()));
    effect(() => this.syncPolygons(this.polygons()));
    effect(() => this.syncMarkers(this.markers()));
    effect(() => this.syncPolylines(this.polylines()));
    effect(() => this.syncMapCursor());
  }

  async ngAfterViewInit(): Promise<void> {
    await loadGoogleMaps();
    if (!this.mapContainer) {
      return;
    }

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: this.center() ?? SOUTH_AFRICA_CENTER,
      zoom: this.center() ? CAMPUS_ZOOM : DEFAULT_ZOOM,
      streetViewControl: false,
      fullscreenControl: false,
      disableDoubleClickZoom: true,
      mapTypeControl: false,
      mapTypeId: this.isStudent() && this.showGoogleLabels() ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.SATELLITE
    });
    this.syncCenter(this.center());

    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        this.mapClick.emit(event.latLng);
      }
    });

    this.isReady.set(true);
    this.ready.emit(this.map);
    this.syncPolygons(this.polygons());
    this.syncMarkers(this.markers());
    this.syncPolylines(this.polylines());
  }

  toggleGoogleLabels(): void {
    const enabled = !this.showGoogleLabels();
    this.showGoogleLabels.set(enabled);
    this.map?.setMapTypeId(enabled ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.SATELLITE);
  }

  private syncMapCursor(): void {
    const isPlacingPathNodes = this.placingPathNodes();

    if (this.mapContainer) {
      this.mapContainer.nativeElement.style.cursor = isPlacingPathNodes ? 'crosshair' : 'default';
    }

    if (this.map) {
      this.map.setOptions({
        draggableCursor: isPlacingPathNodes ? 'crosshair' : 'grab',
        draggingCursor: isPlacingPathNodes ? 'crosshair' : 'grabbing'
      });
    }
  }

  private syncCenter(center: google.maps.LatLngLiteral | null): void {
    if (!this.map || !center) {
      return;
    }

    this.map.setCenter(center);
    this.map.setZoom(CAMPUS_ZOOM);
  }

  private syncPolygons(polygons: MapPolygon[]): void {
    if (!this.isReady() || !this.map) {
      return;
    }

    const incomingIds = new Set(polygons.map((p) => p.id));
    for (const [id, polygon] of this.renderedPolygons) {
      if (!incomingIds.has(id)) {
        polygon.setMap(null);
        this.renderedPolygons.delete(id);
      }
    }

    const labeledIds = new Set(
      polygons.filter((item) => item.label?.trim() && item.paths.length > 0).map((item) => item.id)
    );
    for (const [id, label] of this.renderedPolygonLabels) {
      if (!labeledIds.has(id)) {
        label.setMap(null);
        this.renderedPolygonLabels.delete(id);
      }
    }

    const isStudentUser = this.isStudent();

    for (const item of polygons) {
      const isHiddenForStudent = isStudentUser && !item.selected;

      const options: google.maps.PolygonOptions = {
        paths: item.paths,
        strokeColor: item.selected ? '#FFD700' : (item.strokeColor ?? '#7c3aed'),
        strokeWeight: item.selected ? 3 : 2,
        strokeOpacity: isHiddenForStudent ? 0 : 1,
        fillColor: item.selected ? '#FFFF00' : (item.fillColor ?? '#8b5cf6'),
        fillOpacity: isHiddenForStudent ? 0 : item.selected ? 0.50 : 0.40,
        clickable: item.clickable ?? true,
        zIndex: item.selected ? 10 : 1
      };

      const existing = this.renderedPolygons.get(item.id);
      if (!existing) {
        const polygon = new google.maps.Polygon({ ...options, map: this.map });
        polygon.addListener('click', () => this.polygonClick.emit(item.id));
        polygon.addListener('dblclick', () => this.polygonDblClick.emit(item.id));
        this.renderedPolygons.set(item.id, polygon);
      } else {
        existing.setOptions(options);
      }

      const labelText = item.label?.trim();
      if (labelText && item.paths.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        item.paths.forEach((point) => bounds.extend(point));
        const labelPosition = bounds.getCenter().toJSON();
        const label = this.renderedPolygonLabels.get(item.id);
        if (label) {
          label.update(labelPosition, labelText);
        } else {
          const newLabel = createPolygonLabelOverlay(labelPosition, labelText);
          newLabel.setMap(this.map);
          newLabel.update(labelPosition, labelText);
          this.renderedPolygonLabels.set(item.id, newLabel);
        }
      }
    }
  }

  private syncMarkers(markers: MapMarker[]): void {
    if (!this.isReady() || !this.map) {
      return;
    }

    const incomingIds = new Set(markers.map((m) => m.id));
    for (const [id, marker] of this.renderedMarkers) {
      if (!incomingIds.has(id)) {
        marker.setMap(null);
        this.renderedMarkers.delete(id);
      }
    }

    for (const item of markers) {
      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: item.selected ? 9 : 6,
        fillColor: item.selected ? '#22c55e' : item.color ?? '#16202A',
        fillOpacity: 1,
        strokeColor: item.selected ? '#22c55e' : '#F6F7F5',
        strokeWeight: item.selected ? 3 : 1.5
      };

      const existing = this.renderedMarkers.get(item.id);
      if (!existing) {
        const marker = new google.maps.Marker({ map: this.map, position: item.position, icon });
        marker.addListener('click', () => this.markerClick.emit(item.id));
        marker.addListener('dblclick', () => this.markerDblClick.emit(item.id));
        this.renderedMarkers.set(item.id, marker);
      } else {
        existing.setPosition(item.position);
        existing.setIcon(icon);
      }
    }
  }

  private syncPolylines(polylines: MapPolyline[]): void {
    if (!this.isReady() || !this.map) {
      return;
    }

    const incomingIds = new Set(polylines.map((p) => p.id));
    for (const [id, polyline] of this.renderedPolylines) {
      if (!incomingIds.has(id)) {
        polyline.setMap(null);
        this.renderedPolylines.delete(id);
      }
    }

    for (const item of polylines) {
      const options: google.maps.PolylineOptions = {
        path: item.path,
        strokeColor: item.selected ? '#22c55e' : (item.color ?? '#64748b'),
        strokeWeight: item.selected ? 10 : 8,
        zIndex: item.selected ? 10 : 3
      };

      const existing = this.renderedPolylines.get(item.id);
      if (!existing) {
        const polyline = new google.maps.Polyline({ ...options, map: this.map });
        polyline.addListener('click', () => this.polylineClick.emit(item.id));
        polyline.addListener('dblclick', () => this.polylineDblClick.emit(item.id));
        this.renderedPolylines.set(item.id, polyline);
      } else {
        existing.setOptions(options);
      }
    }
  }
}