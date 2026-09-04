import { Pipe, PipeTransform } from '@angular/core';
import { GeoPoint, GeoPolygon } from '../../types/geography';

@Pipe({
  name: 'toLatLngPipe',
  standalone: true
})
export class ToLatLngPipe implements PipeTransform {

  transform(geo: GeoPoint): google.maps.LatLngLiteral | null;
  transform(geo: GeoPolygon): google.maps.LatLngLiteral[];
  transform(
    geo: GeoPoint | GeoPolygon | null | undefined
  ): google.maps.LatLngLiteral | google.maps.LatLngLiteral[] | null {
    if (!geo) {
      return null;
    }

    if (geo.type === 'Point') {
      const [lng, lat] = geo.coordinates;
      return { lat, lng };
    }

    if (geo.type === 'Polygon') {
      const ring = geo.coordinates[0];
      if (!ring) {
        return [];
      }
      return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
    }

    return null;
  }

}
