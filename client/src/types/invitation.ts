export interface AcceptInvitation {
  pin: string;
  password: string;
}

export interface Invitation {
  invitationId: number;
  inviteeEmail: string;
  inviteeName: string;
  isExpired: boolean;
  isLocked: boolean;
  campusId: number;
  campusName: string;
  universityName: string;
}