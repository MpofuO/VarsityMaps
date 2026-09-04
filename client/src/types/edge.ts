export interface Edge {
  edgeId: number;
  fromNodeId: number;
  toNodeId: number;
  weight: number;
  name: string | null;
}