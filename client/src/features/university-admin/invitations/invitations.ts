import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvitationService } from '../../../core/services/invitation-service';
import { CampusService } from '../../../core/services/campus-service';
import { ToastService } from '../../../core/services/toast-service';
import { Invitation, CreateInvitationModel } from '../../../types/invitation';
import { Campus } from '../../../types/campus';
import { Modal } from '../../../shared/modal/modal';
import { TextInput } from '../../../shared/text-input/text-input';
import { SelectInput } from '../../../shared/select-input/select-input';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [Modal, TextInput, SelectInput, ReactiveFormsModule],
  templateUrl: './invitations.html',
  styleUrl: './invitations.css'
})
export class Invitations implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly campusService = inject(CampusService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly invitations = signal<Invitation[]>([]);
  protected readonly campuses = signal<Campus[]>([]);

  protected readonly isCreateOpen = signal(false);
  protected readonly isDurationOpen = signal(false);
  protected readonly isRevokeOpen = signal(false);
  protected readonly targetInvitation = signal<Invitation | null>(null);

  protected readonly campusOptions = computed(() => {
    return this.campuses()
      .map((c) => ({ label: `${c.name} (${c.alias})`, value: c.campusId }));
  });

  protected readonly createForm = this.fb.group({
    inviteeName: ['', Validators.required],
    inviteeEmail: ['', [Validators.required, Validators.email]],
    campusId: this.fb.control<number | null>(null, Validators.required),
    duration: [7, [Validators.required, Validators.min(1)]]
  });

  protected readonly durationForm = this.fb.nonNullable.group({
    duration: [7, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.load();
    this.campusService.getCampuses().subscribe({
      next: (campuses) => this.campuses.set(campuses)
    });
  }

  private load(): void {
    this.invitationService.getInvitations().subscribe({
      next: (invitations) => {
        console.log("Invitations", invitations);
        this.invitations.set(invitations);
      }
    });
  }

  openCreate(): void {
    this.createForm.reset({ inviteeName: '', inviteeEmail: '', campusId: 0, duration: 7 });
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      return;
    }
    this.invitationService.createInvitation(this.createForm.getRawValue() as CreateInvitationModel).subscribe({
      next: () => {
        this.toastService.success('Invitation sent.');
        this.closeCreate();
        this.load();
      }
    });
  }

  openDuration(invitation: Invitation): void {
    this.targetInvitation.set(invitation);
    this.durationForm.reset({ duration: invitation.duration });
    this.isDurationOpen.set(true);
  }

  closeDuration(): void {
    this.isDurationOpen.set(false);
    this.targetInvitation.set(null);
  }

  submitDuration(): void {
    const invitation = this.targetInvitation();
    if (!invitation || this.durationForm.invalid) {
      return;
    }

    this.invitationService.updateDuration(invitation.invitationId, this.durationForm.getRawValue().duration).subscribe({
      next: () => {
        this.toastService.success('Invitation updated.');
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