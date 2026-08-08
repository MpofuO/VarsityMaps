import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { roleHomeRoute } from '../../../core/functions/role-home';
import { TextInput } from '../../../shared/text-input/text-input';
import { LoginModel } from '../../../types/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, TextInput],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.accountService.login(this.form.getRawValue() as LoginModel).subscribe({
      next: () => {
        const role = this.accountService.currentUser()?.roles?.[0] ?? '';
        this.router.navigate([roleHomeRoute(role)]);
        this.toastService.success('Signed in successfully.');
      },
          error: () => {
          }
    });
  }
}
