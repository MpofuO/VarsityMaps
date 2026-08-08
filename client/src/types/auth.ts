export interface LoginModel {
  email: string;
  password: string;
}

export interface RegisterModel {
  email: string;
  campusId: number;
  universityId: number;
  password: string;
  confirmPassword: string;
}

export interface RegisterInstitutionModel {
  email: string;
  password: string;
  universityName: string;
  universityAlias: string;
  campusCount: number;
}

export interface AcceptInvitationModel {
  pin: string;
  password: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
