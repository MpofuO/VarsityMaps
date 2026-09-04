import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../core/services/account-service';
import { UniversityService } from '../../../core/services/university-service';
import { ToastService } from '../../../core/services/toast-service';
import { Stepper } from '../../../shared/stepper/stepper';
import { TextInput } from '../../../shared/text-input/text-input';
import { SelectInput, SelectOption } from '../../../shared/select-input/select-input';
import { University } from '../../../types/university';
import { Campus } from '../../../types/campus';
import { RegisterModel } from '../../../types/auth';
import { passwordsMatchValidator } from '../../../core/functions/account-functions';

@Component({
  selector: 'app-register-standard-user',
  standalone: true,
  imports: [ReactiveFormsModule, Stepper, TextInput, SelectInput],
  templateUrl: './register-standard-user.html',
  styleUrl: './register-standard-user.css',
})
export class RegisterStandardUser implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly universityService = inject(UniversityService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected step = 0;
  protected isVerified = false;
  protected readonly isCheckingEmail = signal(false);

  protected universityOptions = signal<SelectOption[]>([]);
  protected campusOptions = signal<SelectOption[]>([]);

  protected readonly accountForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', [Validators.required, passwordsMatchValidator]],
    universityId: ['', Validators.required],
    campusId: [{ value: '', disabled: true }, Validators.required],
  });

  ngOnInit(): void {
    this.loadUniversities();

    this.accountForm.controls.universityId.valueChanges.subscribe((univId) => {
      this.onUniversityChange(Number(univId));
    });

    this.accountForm.controls.password.valueChanges.subscribe(() => {
      this.accountForm.controls.confirmPassword.updateValueAndValidity({ onlySelf: true });
    });

    this.accountForm.controls.email.valueChanges.subscribe(() => {
      const errors = this.accountForm.controls.email.errors;
      if (errors?.['emailTaken']) {
        const { emailTaken, ...rest } = errors;
        this.accountForm.controls.email.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  private loadUniversities(): void {
    this.universityService.getUniversities().subscribe({
      next: (universities) => {
        const options: SelectOption[] = universities.map((u: University) => ({
          label: `${u.name} (${u.alias})`,
          value: u.universityId,
        }));
        this.universityOptions.set(options);
      },
      error: () => this.toastService.error('Failed to load universities.'),
    });
  }

  private onUniversityChange(universityId: number): void {
    const campusControl = this.accountForm.controls.campusId;
    campusControl.reset('');
    this.campusOptions.set([]);

    if (!universityId) {
      campusControl.disable();
      return;
    }

    campusControl.disable();

    this.universityService.getCampuses(universityId).subscribe({
      next: (campuses) => {
        const options: SelectOption[] = campuses.map((c: Campus) => ({
          label: c.name,
          value: c.campusId,
        }));
        this.campusOptions.set(options);
        campusControl.enable();
      },
      error: () => {
        this.toastService.error('Failed to load campuses.');
      },
    });
  }

  nextStep(): void {
    if (!this.accountForm.valid) {
      return;
    }

    const email = this.accountForm.controls.email.value;
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
          this.accountForm.controls.email.setErrors({ emailTaken: true });
          this.accountForm.controls.email.markAsTouched();
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

  verifyEmail(): void {
    this.isVerified = true;
    this.toastService.success('Institutional email successfully verified.');
  }

  unverifyEmail(): void {
    this.isVerified = false;
    this.toastService.error('Failed to verify institution account.');
  }

  submit(): void {
    if (!this.isVerified) {
      this.toastService.error('Failed to verify institution account.');
      return;
    }

    const rawValue = this.accountForm.value;
    const model = {
      ...rawValue,
      universityId: Number(rawValue.universityId),
      campusId: Number(rawValue.campusId),
    };

    this.accountService.registerStandardUser(model as RegisterModel).subscribe({
      next: () => {
        this.toastService.success('Account created successfully.');
        this.router.navigate(['/']);
      },
      error: () => {
        this.toastService.error('Unable to create account.');
      },
    });
  }
}