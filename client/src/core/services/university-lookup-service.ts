import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { UniversityLookup, UniversityLookupInput } from '../../types/university-lookup';

@Injectable({ providedIn: 'root' })
export class UniversityLookupService extends BaseService {
  getAll() {
    return this.http.get<UniversityLookup[]>(`${this.apiUrl}/universitylookup`);
  }

  create(model: UniversityLookupInput) {
    return this.http.post<UniversityLookup>(`${this.apiUrl}/universitylookup`, model);
  }

  update(id: number, model: UniversityLookupInput) {
    return this.http.put<UniversityLookup>(`${this.apiUrl}/universitylookup/${id}`, model);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/universitylookup/${id}`);
  }
}