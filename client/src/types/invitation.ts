export interface Invitation {
  invitationId: number;
  inviteeEmail: string;
  inviteeName: string;
  isAccepted: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  isLocked: boolean;
  duration: number;
  campusId: number;
  campusName: string;
  universityName: string;
}

export interface CreateInvitationModel {
  inviteeEmail: string;
  inviteeName: string;
  campusId: number;
  duration: number;
}

export interface AcceptInvitationModel {
  pin: string;
  password: string;
}