import { Component, inject } from '@angular/core';
import { AccountService } from '../../../core/services/account-service';

@Component({
  selector: 'app-campus-admin',
  standalone: true,
  imports: [],
  templateUrl: './campus-admin.html',
  styleUrl: './campus-admin.css'
})
export class CampusAdmin {
  protected readonly accountService = inject(AccountService);
}
