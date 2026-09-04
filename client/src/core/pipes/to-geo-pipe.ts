import { Pipe, PipeTransform } from '@angular/core';
import { GeoPoint, GeoPolygon } from '../../types/geography';

@Pipe({
  name: 'toGeo',
  standalone: true
})
export class ToGeoPipe implements PipeTransform {
  transform(path: google.maps.LatLngLiteral): GeoPoint | null;
  transform(path: google.maps.LatLngLiteral[]): GeoPolygon | null;
  transform(
    path: google.maps.LatLngLiteral | google.maps.LatLngLiteral[] | null | undefined
  ): GeoPoint | GeoPolygon | null {
    if (!path) {
      return null;
    }

    if ('lat' in path && 'lng' in path && !Array.isArray(path)) {
      return {
        type: 'Point',
        coordinates: [path.lng, path.lat]
      };
    }

    if (Array.isArray(path)) {
      if (path.length === 0) {
        return null;
      }
      const ring = path.map((point): [number, number] => [point.lng, point.lat]);
      ring.push(ring[0]);
      return {
        type: 'Polygon',
        coordinates: [ring]
      };
    }

    return null;
  }
}