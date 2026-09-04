export interface Invitation {
  invitationId: number;
  inviteeEmail: string;
  inviteeName: string;
  isAccepted: boolean;
  isRejected: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  isLocked: boolean;
  dateCreated: string;
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