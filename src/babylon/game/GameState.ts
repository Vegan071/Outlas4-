export type GamePhase = 'menu' | 'playing' | 'paused' | 'won' | 'lost';
export interface GameState {
  phase: GamePhase; notesFound: number; readonly totalNotes: number;
  stamina: number; health: number; flashlightOn: boolean; flashbangReadyAt: number;
  radarReadyAt: number; radarUntil: number; lastMessage: string; messageUntil: number;
}
export function createGameState(): GameState {
  return { phase:'menu', notesFound:0, totalNotes:10, stamina:100, health:100,
    flashlightOn:false, flashbangReadyAt:0, radarReadyAt:0, radarUntil:0,
    lastMessage:'', messageUntil:0 };
}
