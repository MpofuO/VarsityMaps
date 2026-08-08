import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BaseService {
  protected readonly apiUrl = environment.apiUrl;
  protected readonly http = inject(HttpClient);
}
