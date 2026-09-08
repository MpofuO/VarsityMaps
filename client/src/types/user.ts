export interface User {
  id: string;
  email: string;
  campusId: number | null;
  universityId: number;
  isVisitor?: boolean;
  token: string;
  roles: string[];
}