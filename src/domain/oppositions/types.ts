export type ActiveOppositionContext = {
  oppositionId: string;
  oppositionName: string;
  oppositionCode: string | null;
  curriculumKey: string;
  userOppositionProfileId: string | null;
  isActiveContext: boolean;
  isPrimary: boolean;
  onboardingCompleted: boolean;
  examDate: string | null;
  targetScore: number | null;
  startedAt: string | null;
  updatedAt: string | null;
};

export type OppositionOption = {
  id: string;
  name: string;
  code: string | null;
  curriculumKey: string | null;
  isActive: boolean;
};
