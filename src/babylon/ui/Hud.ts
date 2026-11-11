import type { GameState } from '../game/GameState';
import type { MonsterMode } from '../entities/Monster';

export class Hud {
  private interaction = document.getElementById('interaction-text');
  private counter = document.getElementById('note-counter');
  private message: HTMLDivElement;
  private stats: HTMLDivElement;
  private flashOverlay: HTMLDivElement;
  private bodycamOverlay: HTMLDivElement;
  private hideTimer: number | undefined;

  constructor() {
    const layer = document.getElementById('ui-layer') ?? document.body;
    this.message = document.createElement('div');
    this.message.id = 'babylon-message';
    Object.assign(this.message.style, {
      position: 'absolute', top: '16%', left: '50%', transform: 'translateX(-50%)',
      maxWidth: 'min(760px,90vw)', padding: '10px 18px', background: 'rgba(0,0,0,.82)',
      border: '1px solid #886644', color: '#ffeedd', font: 'bold 16px Courier New',
      textAlign: 'center', textShadow: '1px 1px 3px #000', display: 'none', zIndex: '12',
    });
    layer.append(this.message);
    this.stats = document.createElement('div');
    this.stats.id = 'babylon-stats';
    Object.assign(this.stats.style, {
      position: 'absolute', left: '20px', bottom: '20px', padding: '8px 12px',
      background: 'rgba(0,0,0,.72)', borderLeft: '3px solid #aa0000', color: '#eee',
      font: '14px Courier New', whiteSpace: 'pre-line',
    });
    layer.append(this.stats);
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.id = 'flashbang-overlay';
    Object.assign(this.flashOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '30', pointerEvents: 'none',
      background: '#fff', opacity: '0', transition: 'opacity 90ms linear',
    });
    document.body.append(this.flashOverlay);
    this.bodycamOverlay = document.createElement('div');
    this.bodycamOverlay.id = 'bodycam-overlay';
    Object.assign(this.bodycamOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '5', pointerEvents: 'none', opacity: '.04',
      background: 'linear-gradient(90deg, rgba(255,0,0,.06), transparent 20%, transparent 80%, rgba(0,70,255,.06)',
      mixBlendMode: 'multiply',
    });
    document.body.append(this.bodycamOverlay);
  }

  showInteraction(text: string): void {
    if (!this.interaction) return;
    this.interaction.textContent = text;
    this.interaction.style.display = text ? 'block' : 'none';
  }

  flashScreen(): void {
    this.flashOverlay.style.opacity = '1';
    window.setTimeout(() => { this.flashOverlay.style.opacity = '0'; }, 130);
  }

  update(state: GameState, monsterMode?: MonsterMode, monsterDistance?: number, playerNoise = 0): void {
    if (this.counter) this.counter.textContent = 'Записки: ' + state.notesFound + ' / ' + state.totalNotes;
    const now = performance.now();
    const lines = [
      'ЗДОРОВЬЕ  ' + Math.ceil(state.health) + '%',
      'ВЫНОСЛИВОСТЬ  ' + Math.ceil(state.stamina) + '%',
    ];
    if (state.flashlightOn) lines.push('ФОНАРИК  ВКЛ');
    if (state.flashbangReadyAt > now) lines.push('ВСПЫШКА  ' + Math.ceil((state.flashbangReadyAt - now) / 1000) + 'с');
    if (state.radarReadyAt > now && state.radarUntil <= now) lines.push('ЭМП  ' + Math.ceil((state.radarReadyAt - now) / 1000) + 'с');
    if (state.substationPowered) lines.push('ПОДСТАНЦИЯ  ВКЛ');
    if (state.radarUntil > now) lines.push('ЭМП  СКАНИРОВАНИЕ');
    const fear = monsterDistance === undefined ? 0 : Math.max(0, 1 - monsterDistance / 58);
    this.bodycamOverlay.style.opacity = String(.04 + fear * .12);
    const noiseLabels = ['ТИХО', 'ШАГИ', 'СПРИНТ', 'ХРУСТ ВЕТКИ'];
    lines.push('ШУМ  ' + noiseLabels[Math.max(0, Math.min(3, playerNoise))]);
    if (monsterMode) {
      const labels: Record<MonsterMode, string> = {
        patrol: 'ПАТРУЛЬ', investigate_sound: 'ИЩЕТ ВАС', investigate_light: 'ИЩЕТ СВЕТ',
        ambush: 'В ЗАСАДЕ', chase: 'ОХОТА!', stunned: 'ОСЛЕПЛЁН',
      };
      const terror = monsterDistance === undefined ? 0 : Math.max(0, 1 - monsterDistance / 58);
      lines.push('ПУЛЬС  ' + Math.round(72 + terror * 95) + ' BPM');
      lines.push('ВЕНДИГО  ' + labels[monsterMode] + (monsterDistance === undefined ? '' : ' · ' + Math.round(monsterDistance) + 'м'));
    }
    this.stats.textContent = lines.join('\n');
  }

  notify(text: string, duration = 3600): void {
    this.message.textContent = text;
    this.message.style.display = 'block';
    if (this.hideTimer !== undefined) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => { this.message.style.display = 'none'; }, duration);
  }
}
