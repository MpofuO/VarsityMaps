import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Edge, EdgePropertiesModel } from '../../types/edge';

@Injectable({ providedIn: 'root' })
export class EdgeService extends BaseService {
  getEdges() {
    return this.http.get<Edge[]>(`${this.apiUrl}/edge`);
  }

  getPathEdges(startNodeId: number, endNodeId: number) {
    return this.http.get<number[]>(`${this.apiUrl}/navigation/path-edges`, {
      params: { startNodeId, endNodeId }
    });
  }

  addEdge(fromNodeId: number, toNodeId: number) {
    return this.http.post<Edge>(`${this.apiUrl}/edge?fromNodeId=${fromNodeId}&toNodeId=${toNodeId}`, {});
  }

  updateEdge(id: number, model: EdgePropertiesModel) {
    return this.http.put<Edge>(`${this.apiUrl}/edge/${id}`, model);
  }

  bulkUpdateEdges(edgeIds: number[], isClosed: boolean, closedUntil: string | null, travelModes: number) {
    return this.http.put<Edge[]>(`${this.apiUrl}/edge/bulk`, { edgeIds, isClosed, closedUntil, travelModes });
  }

  deleteEdge(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/edge/${id}`);
  }
}