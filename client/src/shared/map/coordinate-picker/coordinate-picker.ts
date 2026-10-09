import { Component, ElementRef, ViewChild, computed, effect, input, output, signal } from '@angular/core';
import { Modal } from '../../modal/modal';
import { loadGoogleMaps } from '../../../core/functions/load-google-maps';

const SOUTH_AFRICA_CENTER = { lat: -28.4793, lng: 24.6727 };
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 18;

export interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

const SOUTH_AFRICAN_CITIES: LocationSuggestion[] = [
  { name: 'Gqeberha', description: 'Eastern Cape', latitude: -33.9611, longitude: 25.6149 },
  { name: 'East London', description: 'Eastern Cape', latitude: -33.0153, longitude: 27.9116 },
  { name: 'Mthatha', description: 'Eastern Cape', latitude: -31.5889, longitude: 28.7844 },
  { name: 'Bloemfontein', description: 'Free State', latitude: -29.1181, longitude: 26.2243 },
  { name: 'Welkom', description: 'Free State', latitude: -27.9772, longitude: 26.7350 },
  { name: 'Bethlehem', description: 'Free State', latitude: -28.2308, longitude: 28.3071 },
  { name: 'Johannesburg', description: 'Gauteng', latitude: -26.2041, longitude: 28.0473 },
  { name: 'Pretoria', description: 'Gauteng', latitude: -25.7479, longitude: 28.2293 },
  { name: 'Soweto', description: 'Gauteng', latitude: -26.2485, longitude: 27.8540 },
  { name: 'Durban', description: 'KwaZulu-Natal', latitude: -29.8587, longitude: 31.0218 },
  { name: 'Pietermaritzburg', description: 'KwaZulu-Natal', latitude: -29.6006, longitude: 30.3794 },
  { name: 'Richards Bay', description: 'KwaZulu-Natal', latitude: -28.7807, longitude: 32.0383 },
  { name: 'Polokwane', description: 'Limpopo', latitude: -23.9045, longitude: 29.4689 },
  { name: 'Thohoyandou', description: 'Limpopo', latitude: -22.9456, longitude: 30.4850 },
  { name: 'Tzaneen', description: 'Limpopo', latitude: -23.8332, longitude: 30.1635 },
  { name: 'Mbombela', description: 'Mpumalanga', latitude: -25.4753, longitude: 30.9694 },
  { name: 'Middelburg', description: 'Mpumalanga', latitude: -25.7751, longitude: 29.4648 },
  { name: 'Secunda', description: 'Mpumalanga', latitude: -26.5500, longitude: 29.1700 },
  { name: 'Kimberley', description: 'Northern Cape', latitude: -28.7282, longitude: 24.7499 },
  { name: 'Upington', description: 'Northern Cape', latitude: -28.4478, longitude: 21.2561 },
  { name: 'Springbok', description: 'Northern Cape', latitude: -29.6643, longitude: 17.8865 },
  { name: 'Mahikeng', description: 'North West', latitude: -25.8652, longitude: 25.6442 },
  { name: 'Rustenburg', description: 'North West', latitude: -25.6676, longitude: 27.2421 },
  { name: 'Potchefstroom', description: 'North West', latitude: -26.7150, longitude: 27.1033 },
  { name: 'Cape Town', description: 'Western Cape', latitude: -33.9258, longitude: 18.4232 },
  { name: 'George', description: 'Western Cape', latitude: -33.9667, longitude: 22.4500 },
  { name: 'Stellenbosch', description: 'Western Cape', latitude: -33.9321, longitude: 18.8602 }
];


@Component({
  selector: 'app-coordinate-picker',
  standalone: true,
  imports: [Modal],
  templateUrl: './coordinate-picker.html',
  styleUrl: './coordinate-picker.css'
})
export class CoordinatePicker {
  public isOpen = input(false);
  public initialLatitude = input<number | null>(null);
  public initialLongitude = input<number | null>(null);
  public suggestions = input<LocationSuggestion[] | null>(null);

  public picked = output<{ latitude: number; longitude: number }>();
  public closed = output<void>();

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly selected = signal<{ lat: number; lng: number } | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    return (this.suggestions() ?? SOUTH_AFRICAN_CITIES)
      .filter((suggestion) => `${suggestion.name} ${suggestion.description ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.name} ${a.description ?? ''}`.localeCompare(`${b.name} ${b.description ?? ''}`))
      .slice(0, 7);
  });

  private map?: google.maps.Map;
  private marker?: google.maps.Marker;

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
        mapTypeId: google.maps.MapTypeId.HYBRID,
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

  selectSearchResult(suggestion: LocationSuggestion): void {
    this.searchQuery.set('');
    if (this.map) {
      this.map.panTo({ lat: suggestion.latitude, lng: suggestion.longitude });
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