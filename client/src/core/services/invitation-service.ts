import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Invitation } from '../../types/invitation';

@Injectable({
  providedIn: 'root',
})
export class InvitationService extends BaseService {
  constructor() {
    super();
  }

  getById(id: number) {
    return this.http.get<Invitation>(`${this.apiUrl}/invitation/${id}`);
  }
}
