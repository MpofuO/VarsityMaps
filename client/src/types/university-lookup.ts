export interface UniversityLookup {
  universityLookupId: number;
  name: string;
  latitude: number;
  longitude: number;
}

export type UniversityLookupInput = Omit<UniversityLookup, 'universityLookupId'>;