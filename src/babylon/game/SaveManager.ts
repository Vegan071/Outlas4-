import type { GameState } from './GameState';
const KEY = 'ponr-babylon-save-v1';
export class SaveManager {
  save(state: GameState): void {
    localStorage.setItem(KEY, JSON.stringify({
      notesFound: state.notesFound,
      health: state.health,
      stamina: state.stamina,
      substationPowered: state.substationPowered,
    }));
  }
  load(): Partial<GameState> | null {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<GameState> | null; }
    catch { return null; }
  }
  clear(): void { localStorage.removeItem(KEY); }
}
