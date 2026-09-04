import { Component, computed, effect, ElementRef, inject, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Edge } from '../../../../types/edge';
import { Node } from '../../../../types/node';

@Component({
  selector: 'app-campus-paths',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './campus-path.html',
  styleUrl: './campus-path.css',
})
export class CampusPaths {
  private element = inject(ElementRef);
  edges = input.required<Edge[]>();
  nodes = input.required<Node[]>();
  isConnecting = input<boolean>(false);
  isDeletingEdges = input<boolean>(false);
  selectedEdgeId = input<number | null>(null);

  startConnecting = output<void>();
  startDeletingEdges = output<void>();
  pathEditClick = output<number>();
  selectEdge = output<number>();


  constructor() {
    effect(() => {
      const selectedId = this.selectedEdgeId();
      if (selectedId !== null) {
        setTimeout(() => {
          const selectedEl = this.element.nativeElement.querySelector(`#edge-${selectedId}`);
          selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    });
  }

  protected edgeRows = computed(() => {
    const nodesById = new Map(this.nodes().map((n) => [n.nodeId, n]));
    return this.edges().map((e) => ({
      edge: e,
      fromName: nodesById.get(e.fromNodeId)?.name || `Node ${e.fromNodeId}`,
      toName: nodesById.get(e.toNodeId)?.name || `Node ${e.toNodeId}`
    }));
  });
}