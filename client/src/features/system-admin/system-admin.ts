import { Component, inject } from '@angular/core';
import { AccountService } from '../../core/services/account-service';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [],
  templateUrl: './system-admin.html',
  styleUrl: './system-admin.css'
})
export class SystemAdmin {
  protected readonly accountService = inject(AccountService);
}
