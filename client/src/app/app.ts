import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from '../layout/nav/nav';
import { Modal } from '../shared/modal/modal';
import { NavModalService } from '../core/services/nav-modal-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Nav, Modal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly navModalService = inject(NavModalService);
}