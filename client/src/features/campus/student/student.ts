import { Component, inject } from '@angular/core';
import { AccountService } from '../../../core/services/account-service';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [],
  templateUrl: './student.html',
  styleUrl: './student.css'
})
export class Student {
  protected readonly accountService = inject(AccountService);
}
