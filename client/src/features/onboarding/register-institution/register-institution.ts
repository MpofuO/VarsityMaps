import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { Stepper } from '../../../shared/stepper/stepper';
import { TextInput } from '../../../shared/text-input/text-input';
import { RegisterInstitutionModel } from '../../../types/auth';

@Component({
  selector: 'app-register-institution',
  standalone: true,
  imports: [ReactiveFormsModule, Stepper, TextInput],
  templateUrl: './register-institution.html',
  styleUrl: './register-institution.css',
})
export class RegisterInstitution {
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected step = 0;

  protected readonly personalForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly institutionForm = this.fb.nonNullable.group({
    universityName: ['', Validators.required],
    universityAlias: ['', Validators.required],
    campusCount: [1, Validators.required],
  });

  nextStep() {
    if (this.personalForm.valid) {
      this.step = 1;
    }
  }

  prevStep() {
      this.step = 0;
  }

  submit() {
    if (this.institutionForm.invalid) {
      return;
    }

    const model = {
      ...this.personalForm.value,
      ...this.institutionForm.value,
    };

    this.accountService.registerInstitution(model as RegisterInstitutionModel).subscribe({
      next: () => {
        this.toastService.success('Application submitted successfully.');
        this.router.navigate(['/']);
      },
      error: () => {
        this.toastService.error('Unable to submit application.');
      },
    });
  }
}
