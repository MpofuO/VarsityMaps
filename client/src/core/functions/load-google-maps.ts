import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  loadPromise ??= (() => {
    setOptions({ key: environment.googleMapsApiKey, v: 'weekly' });
    return importLibrary('maps').then(() => google);
  })();

  return loadPromise;
}