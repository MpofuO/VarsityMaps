import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { CreateInvitationModel, Invitation } from '../../types/invitation';

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

  getInvitations() {
    return this.http.get<Invitation[]>(`${this.apiUrl}/invitation`);
  }

  createInvitation(model: CreateInvitationModel) {
    console.log("Model: ", model);
    return this.http.post<Invitation>(`${this.apiUrl}/invitation`, model);
  }

  updateDuration(id: number, duration: number) {
    return this.http.put<Invitation>(`${this.apiUrl}/invitation/${id}/duration`, duration);
  }

  resend(id: number) {
    return this.http.post<Invitation>(`${this.apiUrl}/invitation/${id}/resend`, {});
  }

  resetPin(id: number) {
    return this.http.post<Invitation>(`${this.apiUrl}/invitation/${id}/reset-pin`, {});
  }

  revoke(id: number) {
    return this.http.post<Invitation>(`${this.apiUrl}/invitation/${id}/revoke`, {});
  }
  
  reject(id: number) {
    return this.http.post(`${this.apiUrl}/invitation/${id}/reject`, {});
  }
}
