import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { Stepper } from '../../../shared/stepper/stepper';
import { TextInput } from '../../../shared/text-input/text-input';
import { RegisterInstitutionModel } from '../../../types/auth';
import { passwordsMatchValidator } from '../../../core/functions/account-functions';

@Component({
  selector: 'app-register-institution',
  standalone: true,
  imports: [ReactiveFormsModule, Stepper, TextInput],
  templateUrl: './register-institution.html',
  styleUrl: './register-institution.css',
})
export class RegisterInstitution implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected step = 0;
  protected readonly isCheckingEmail = signal(false);

  protected readonly personalForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', [Validators.required, passwordsMatchValidator]],
  });

  protected readonly institutionForm = this.fb.nonNullable.group({
    universityName: ['', Validators.required],
    universityAlias: ['', Validators.required]
  });

  ngOnInit(): void {
    this.personalForm.controls.password.valueChanges.subscribe(() => {
      this.personalForm.controls.confirmPassword.updateValueAndValidity({ onlySelf: true });
    });

    this.personalForm.controls.email.valueChanges.subscribe(() => {
      const errors = this.personalForm.controls.email.errors;
      if (errors?.['emailTaken']) {
        const { emailTaken, ...rest } = errors;
        this.personalForm.controls.email.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  nextStep(): void {
  if (!this.personalForm.valid) {
    return;
  }

  const email = this.personalForm.controls.email.value;
  this.isCheckingEmail.set(true);

  this.accountService.emailExists(email).subscribe({
    next: (result) => {
      this.isCheckingEmail.set(false);

      if (result.pendingInvitationId) {
        this.router.navigate(['/accept-invitation', result.pendingInvitationId], {
          queryParams: { redirected: 'true' },
        });
        return;
      }

      if (result.exists) {
        this.personalForm.controls.email.setErrors({ emailTaken: true });
        this.personalForm.controls.email.markAsTouched();
        return;
      }

      this.step = 1;
    },
    error: () => {
      this.isCheckingEmail.set(false);
      this.toastService.error('Unable to verify email right now — please try again.');
    },
  });
}

  prevStep() {
    this.step = 0;
  }

  submit() {
    if (this.institutionForm.invalid) {
      return;
    }

    const model = { ...this.personalForm.value, ...this.institutionForm.value };

    this.accountService.registerInstitution(model as RegisterInstitutionModel).subscribe({
      next: () => {
        this.toastService.success('Application submitted successfully.');
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.toastService.requestError(error, 'Unable to submit application.');
      }
    });
  }
}