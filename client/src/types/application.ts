export interface Application {
  applicationId: number;
  universityName: string;
  universityAlias: string;
  campusCount: number;
  dateCreated: string;
  isApproved: boolean | null;
  decisionReason: string;
}