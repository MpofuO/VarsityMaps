export interface Application {
  applicationId: number;
  universityName: string;
  universityAlias: string;
  dateCreated: string;
  isApproved: boolean | null;
  decisionReason: string;
}