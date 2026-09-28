export type ApplicationProfile = {
  id: string;
  name: string;
  username: string | null;
  studentId: string | null;
  program: string | null;
  institution: string | null;
};

export type ApplicationProfileInput = {
  name: string;
  username?: string | null;
  studentId?: string | null;
  program?: string | null;
  institution?: string | null;
};
