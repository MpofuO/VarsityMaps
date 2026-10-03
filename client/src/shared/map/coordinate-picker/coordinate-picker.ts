import { Component, ElementRef, OnInit, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { Modal } from '../../modal/modal';
import { defaultMapOptions, loadGoogleMaps } from '../../../core/functions/load-google-maps';
import { UniversityLookupService } from '../../../core/services/university-lookup-service';
import { UniversityLookup } from '../../../types/university-lookup';

const SOUTH_AFRICA_CENTER = { lat: -28.4793, lng: 24.6727 };
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 18;

@Component({
  selector: 'app-coordinate-picker',
  standalone: true,
  imports: [Modal],
  templateUrl: './coordinate-picker.html',
  styleUrl: './coordinate-picker.css'
})
export class CoordinatePicker implements OnInit {
  private readonly universityLookupService = inject(UniversityLookupService);
  public isOpen = input(false);
  public initialLatitude = input<number | null>(null);
  public initialLongitude = input<number | null>(null);

  public picked = output<{ latitude: number; longitude: number }>();
  public closed = output<void>();

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly selected = signal<{ lat: number; lng: number } | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly lookups = signal<UniversityLookup[]>([]);
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.lookups().filter((lookup) => lookup.name.toLowerCase().includes(q)).slice(0, 6);
  });

  private map?: google.maps.Map;
  private marker?: google.maps.Marker;

  ngOnInit(): void {
    this.universityLookupService.getAll().subscribe({
      next: (lookups) => this.lookups.set(lookups),
      error: () => this.lookups.set([])
    });
  }

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.openMap();
      }
    });
  }

  private async openMap(): Promise<void> {
    await loadGoogleMaps();
    if (!this.mapContainer) {
      return;
    }

    const hasInitial =
      this.initialLatitude() !== null &&
      this.initialLongitude() !== null &&
      this.initialLatitude() !== 0 &&
      this.initialLongitude() !== 0;

    const center = hasInitial
      ? { lat: this.initialLatitude()!, lng: this.initialLongitude()! }
      : SOUTH_AFRICA_CENTER;

    if (!this.map) {
      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom: hasInitial ? SELECTED_ZOOM : DEFAULT_ZOOM,
        streetViewControl: false,
        fullscreenControl: true,
        ...defaultMapOptions()
      });

      this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          this.placeMarker(event.latLng);
        }
      });
    } else {
      google.maps.event.trigger(this.map, 'resize');
      this.map.setCenter(center);
      this.map.setZoom(hasInitial ? SELECTED_ZOOM : DEFAULT_ZOOM);
    }

    if (hasInitial) {
      this.placeMarker(new google.maps.LatLng(center.lat, center.lng));
    } else {
      this.selected.set(null);
      this.marker?.setMap(null);
      this.marker = undefined;
    }
  }

  private placeMarker(position: google.maps.LatLng): void {
    if (!this.marker) {
      this.marker = new google.maps.Marker({
        map: this.map,
        position,
        draggable: true,
        animation: google.maps.Animation.DROP
      });

      this.marker.addListener('dragend', () => {
        const pos = this.marker!.getPosition();
        if (pos) {
          this.selected.set({ lat: pos.lat(), lng: pos.lng() });
        }
      });
    } else {
      this.marker.setPosition(position);
    }

    this.selected.set({ lat: position.lat(), lng: position.lng() });
  }

  selectSearchResult(lookup: UniversityLookup): void {
    this.searchQuery.set('');
    if (this.map) {
      this.map.panTo({ lat: lookup.latitude, lng: lookup.longitude });
      this.map.setZoom(SELECTED_ZOOM);
    }
  }

  confirm(): void {
    const point = this.selected();
    if (point) {
      this.picked.emit({ latitude: point.lat, longitude: point.lng });
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}