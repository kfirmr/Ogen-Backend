export interface IUserProgress {
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  currentLevelTitle: string;
  nextLevelTitle: string | null;
  nextLevelNumber: number | null;
  xpRequiredForNextLevel: number | null;
}
