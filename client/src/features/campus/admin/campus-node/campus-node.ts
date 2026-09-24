import { Component, computed, effect, ElementRef, inject, input, output, signal } from '@angular/core';
import { Node } from '../../../../types/node';
import { EntityDetailModal } from '../../../../shared/entity-detail-modal/entity-detail-modal';

@Component({
  selector: 'app-campus-node',
  imports: [EntityDetailModal],
  templateUrl: './campus-node.html',
  styleUrl: './campus-node.css'
})
export class CampusNode {
  private readonly element = inject(ElementRef);
  nodes = input.required<Node[]>();
  sortedNodes = computed(() => {
  return [...this.nodes()].sort((a, b) => {
    const nameA = a.name ?? 'unnamed';
    const nameB = b.name ?? 'unnamed';
    return nameA.localeCompare(nameB);
  });
});
  isPlacingNodes = input<boolean>(false);
  selectedNodeId = input<number | null>(null);
  isConnecting = input<boolean>(false);

  startPlacingNodes = output<void>();
  startConnecting = output<void>();
  selectNode = output<number>();
  renameNode = output<{ id: number; name: string | null }>();
  deleteNode = output<number>();

  protected isDetailOpen = signal(false);
  protected detailTarget = signal<Node | null>(null);

  constructor() {
  effect(() => {
    const selectedId = this.selectedNodeId();
    if (selectedId !== null) {
      setTimeout(() => {
        const selectedEl = this.element.nativeElement.querySelector(`#node-${selectedId}`);
        selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  });
}

  openDetail(node: Node): void {
    this.detailTarget.set(node);
    this.isDetailOpen.set(true);
  }

  openDetailFromParent(id: number): void {
  const node = this.nodes().find((n) => n.nodeId === id);
  if (node) {
    this.openDetail(node);
  }
}

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.detailTarget.set(null);
  }

  saveDetail(name: string | null): void {
    const node = this.detailTarget();
    if (!node) return;
    this.renameNode.emit({ id: node.nodeId, name });
    this.closeDetail();
  }

  deleteDetail(): void {
    const node = this.detailTarget();
    if (!node) return;
    this.deleteNode.emit(node.nodeId);
    this.closeDetail();
  }
}