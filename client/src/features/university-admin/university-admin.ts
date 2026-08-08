import { Component, inject } from '@angular/core';
import { AccountService } from '../../core/services/account-service';

@Component({
  selector: 'app-university-admin',
  standalone: true,
  imports: [],
  templateUrl: './university-admin.html',
  styleUrl: './university-admin.css'
})
export class UniversityAdmin {
  protected readonly accountService = inject(AccountService);
}
