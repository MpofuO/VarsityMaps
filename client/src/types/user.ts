export interface User {
  id: string;
  email: string;
  campusId: number | null;
  universityId: number;
  token: string;
  roles: string[];
}
