import { IXpEvent } from './xp-event.interface';

export interface IXpAwardResult {
  totalXp: number;
  xpEvent: IXpEvent;
  levelTitle: string;
  leveledUp: boolean;
  currentLevel: number;
}
