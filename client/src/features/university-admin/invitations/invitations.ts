import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvitationService } from '../../../core/services/invitation-service';
import { CampusService } from '../../../core/services/campus-service';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';
import { Invitation, CreateInvitationModel } from '../../../types/invitation';
import { Campus } from '../../../types/campus';
import { Modal } from '../../../shared/modal/modal';
import { TextInput } from '../../../shared/text-input/text-input';
import { SelectInput } from '../../../shared/select-input/select-input';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DatePipe } from '@angular/common';

export type InvitationStatusFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'expired' | 'locked' | 'revoked';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [Modal, TextInput, SelectInput, ReactiveFormsModule, DatePipe],
  templateUrl: './invitations.html',
  styleUrl: './invitations.css'
})
export class Invitations implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly campusService = inject(CampusService);
  private readonly accountService = inject(AccountService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly campuses = signal<Campus[]>([]);

  protected readonly statusFilter = signal<InvitationStatusFilter>('all');

  protected readonly isCreateOpen = signal(false);
  protected readonly isDurationOpen = signal(false);
  protected readonly isRevokeOpen = signal(false);
  protected readonly isCheckingEmail = signal(false);
  protected readonly targetInvitation = signal<Invitation | null>(null);

  protected readonly campusOptions = computed(() => {
    return this.campuses().map((c) => ({
      label: `${c.name} (${c.alias})`,
      value: c.campusId
    }));
  });

  protected readonly pendingCount = computed(() =>
    this.invitations().filter((i) => !i.isAccepted && !i.isRevoked && !i.isRejected && !i.isExpired && !i.isLocked).length
  );

  protected readonly filteredInvitations = computed(() => {
    const filter = this.statusFilter();
    const list = this.invitations();

    if (filter === 'all') return list;

    return list.filter((i) => {
      switch (filter) {
        case 'accepted':
          return i.isAccepted;
        case 'revoked':
          return i.isRevoked;
        case 'declined':
          return i.isRejected;
        case 'locked':
          return !i.isAccepted && !i.isRevoked && !i.isRejected && i.isLocked;
        case 'expired':
          return !i.isAccepted && !i.isRevoked && !i.isRejected && !i.isLocked && i.isExpired;
        case 'pending':
          return !i.isAccepted && !i.isRevoked && !i.isRejected && !i.isExpired && !i.isLocked;
        default:
          return true;
      }
    });
  });

  protected readonly createForm = this.fb.group({
    inviteeName: ['', Validators.required],
    inviteeEmail: ['', [Validators.required, Validators.email]],
    campusId: this.fb.control<number | null>(null, Validators.required),
    duration: [7, [Validators.required, Validators.min(1)]]
  });

  protected readonly durationDraft = signal(0);

  protected readonly expiresInDays = computed(() => {
    const invitation = this.targetInvitation();
    if (!invitation?.dateCreated) return 0;

    const created = new Date(invitation.dateCreated).getTime();
    if (isNaN(created)) return 0;

    const projectedExpirationMs = created + this.durationDraft() * 24 * 60 * 60 * 1000;
    const diffMs = projectedExpirationMs - Date.now();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return remainingDays > 0 ? remainingDays : 0;
  });

  ngOnInit(): void {
    this.load();

    this.createForm.controls.inviteeEmail.valueChanges.subscribe(() => {
      const errors = this.createForm.controls.inviteeEmail.errors;
      if (errors?.['emailTaken'] || errors?.['emailHasPendingInvitation']) {
        const { emailTaken, emailHasPendingInvitation, ...rest } = errors;
        this.createForm.controls.inviteeEmail.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }

  private load(): void {
    this.invitationService.getInvitations().subscribe({
      next: (invitations) => this.invitations.set(invitations)
    });

    this.campusService.getCampuses().pipe(
      switchMap(campuses => {
        if (!campuses || campuses.length === 0) return of([]);

        const adminChecks$ = campuses.map(campus =>
          this.campusService.getCampusAdmin(campus.campusId).pipe(
            map(admin => ({ campus, hasAdmin: admin !== null && admin !== undefined })),
            catchError(() => of({ campus, hasAdmin: false }))
          )
        );

        return forkJoin(adminChecks$);
      }),
      map(results =>
        results.filter(r => !r.hasAdmin
          && !this.invitations().some(i => i.campusId === r.campus.campusId &&
            !i.isExpired && !i.isRejected && !i.isRevoked))
          .map(r => r.campus)
      )
    ).subscribe({
      next: (availableCampuses) => this.campuses.set(availableCampuses),
      error: (err) => console.error('Error fetching campuses', err)
    });
  }

  setFilter(status: InvitationStatusFilter): void {
    this.statusFilter.set(status);
  }

  openCreate(): void {
    this.createForm.reset({ inviteeName: '', inviteeEmail: '', campusId: null, duration: 7 });
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      return;
    }

    const email = this.createForm.controls.inviteeEmail.value!;
    this.isCheckingEmail.set(true);

    this.accountService.emailExists(email).subscribe({
      next: (result) => {
        this.isCheckingEmail.set(false);

        if (result.exists) {
          this.createForm.controls.inviteeEmail.setErrors({ emailTaken: true });
          this.createForm.controls.inviteeEmail.markAsTouched();
          return;
        }

        if (result.pendingInvitationId) {
          this.createForm.controls.inviteeEmail.setErrors({ emailHasPendingInvitation: true });
          this.createForm.controls.inviteeEmail.markAsTouched();
          return;
        }

        this.invitationService.createInvitation(this.createForm.getRawValue() as CreateInvitationModel).subscribe({
          next: () => {
            this.toastService.success('Invitation sent successfully.');
            this.createForm.reset({ inviteeName: '', inviteeEmail: '', campusId: null, duration: 7 });
            this.closeCreate();
            this.load();
          }
        });
      },
      error: () => {
        this.isCheckingEmail.set(false);
        this.toastService.error('Unable to verify email right now — please try again.');
      }
    });
  }

  openDuration(invitation: Invitation): void {
    this.targetInvitation.set(invitation);
    this.durationDraft.set(invitation.duration ?? 0);
    this.isDurationOpen.set(true);
  }

  closeDuration(): void {
    this.isDurationOpen.set(false);
    this.targetInvitation.set(null);
  }

  incrementDuration(): void {
    this.durationDraft.update((d) => d + 1);
  }

  submitDuration(): void {
    const invitation = this.targetInvitation();
    if (!invitation) return;

    this.invitationService.updateDuration(invitation.invitationId, this.durationDraft()).subscribe({
      next: () => {
        this.toastService.success('Invitation duration updated.');
        this.closeDuration();
        this.load();
      }
    });
  }

  openRevoke(invitation: Invitation): void {
    this.targetInvitation.set(invitation);
    this.isRevokeOpen.set(true);
  }

  closeRevoke(): void {
    this.isRevokeOpen.set(false);
    this.targetInvitation.set(null);
  }

  confirmRevoke(): void {
    const invitation = this.targetInvitation();
    if (!invitation) {
      return;
    }

    this.invitationService.revoke(invitation.invitationId).subscribe({
      next: () => {
        this.toastService.success('Invitation revoked.');
        this.closeRevoke();
        this.load();
      }
    });
  }

  resend(invitation: Invitation): void {
    const action = invitation.isLocked
      ? this.invitationService.resetPin(invitation.invitationId)
      : this.invitationService.resend(invitation.invitationId);

    action.subscribe({
      next: () => {
        this.toastService.success('Invitation resent.');
        this.load();
      }
    });
  }
}