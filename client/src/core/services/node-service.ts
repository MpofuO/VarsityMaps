import { Injectable } from '@angular/core';
import { BaseService } from './base-service';
import { Node } from '../../types/node';
import { GeoPoint } from '../../types/geography';

export interface AddNodeItem {
  existingNodeId: number | null;
  name: string | null;
  location: GeoPoint | null;
}

@Injectable({ providedIn: 'root' })
export class NodeService extends BaseService {
  getNodes() {
    return this.http.get<Node[]>(`${this.apiUrl}/node`);
  }

  addNodes(items: AddNodeItem[]) {
    return this.http.post<Node[]>(`${this.apiUrl}/node`, { nodes: items });
  }

  addEntranceNode(buildingId: number, name: string, location: GeoPoint) {
    return this.http.post<Node>(`${this.apiUrl}/node/${buildingId}`, { name, location, buildingId: null });
  }

  addParkingAccessNode(parkingAreaId: number, name: string, location: GeoPoint) {
    return this.http.post<Node>(`${this.apiUrl}/node/parking-area/${parkingAreaId}`, { name, location, buildingId: null });
  }

  renameNode(id: number, name: string | null) {
    return this.http.put<Node>(`${this.apiUrl}/node/${id}/name`, { name: name });
  }

  deleteNode(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/node/${id}`);
  }
}