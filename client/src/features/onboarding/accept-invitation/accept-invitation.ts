import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../../core/services/account-service';
import { InvitationService } from '../../../core/services/invitation-service';
import { ToastService } from '../../../core/services/toast-service';
import { Stepper } from '../../../shared/stepper/stepper';
import { TextInput } from '../../../shared/text-input/text-input';
import { Invitation } from '../../../types/invitation';
import { passwordsMatchValidator } from '../../../core/functions/account-functions';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [ReactiveFormsModule, Stepper, TextInput],
  templateUrl: './accept-invitation.html',
  styleUrl: './accept-invitation.css',
})
export class AcceptInvitation implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly invitationService = inject(InvitationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected step = 0;
  protected invitationId = 0;
  protected invitationDetails = signal<Invitation | null>(null);
  protected isLoading = signal(true);
  protected wasRedirected = signal(false);
  protected isDeclined = signal(false);

  protected readonly passwordForm = this.fb.nonNullable.group({
    pin: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, passwordsMatchValidator]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.wasRedirected.set(this.route.snapshot.queryParamMap.get('redirected') === 'true');

    if (!idParam) {
      this.toastService.error('Invalid invitation link.');
      this.isLoading.set(false);
      return;
    }

    this.invitationId = Number(idParam);
    this.loadInvitationDetails();

    this.passwordForm.controls.password.valueChanges.subscribe(() => {
      this.passwordForm.controls.confirmPassword.updateValueAndValidity({ onlySelf: true });
    });
  }

  private loadInvitationDetails(): void {
    this.invitationService.getById(this.invitationId).subscribe({
      next: (details) => {
        this.invitationDetails.set(details);
        this.isLoading.set(false);
      },
      error: (err) => {
        const message = err?.error || 'Failed to load invitation details.';
        this.toastService.error(message);
        this.isLoading.set(false);
      },
    });
  }

  declineInvitation(): void {
    this.invitationService.reject(this.invitationId).subscribe({
      next: () => this.isDeclined.set(true),
      error: (err) => {
        const message = err?.error || 'Unable to decline invitation.';
        this.toastService.error(message);
      },
    });
  }

  nextStep(): void {
    const details = this.invitationDetails();
    if (details?.isExpired || details?.isLocked) {
      this.toastService.error('This invitation is no longer valid.');
      return;
    }
    this.step = 1;
  }

  submit(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    const { pin, password } = this.passwordForm.getRawValue();
    const model = { pin, password };

    this.accountService.acceptInvitation(this.invitationId, model).subscribe({
      next: () => {
        this.toastService.success('Invitation accepted successfully.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        const message = err?.error || 'Unable to accept invitation.';
        this.toastService.error(message);
      },
    });
  }
}