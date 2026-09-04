import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Edge } from '../../types/edge';

@Injectable({ providedIn: 'root' })
export class EdgeService extends BaseService {
  getEdges() {
    return this.http.get<Edge[]>(`${this.apiUrl}/edge`);
  }

  addEdge(fromNodeId: number, toNodeId: number) {
    return this.http.post<Edge>(`${this.apiUrl}/edge?fromNodeId=${fromNodeId}&toNodeId=${toNodeId}`, {});
  }

  renameEdge(id: number, name: string | null) {
    return this.http.put<Edge>(`${this.apiUrl}/edge/${id}/name`, { name: name });
  }

  deleteEdge(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/edge/${id}`);
  }
}