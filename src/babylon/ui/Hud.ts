import type { GameState } from '../game/GameState';
import type { MonsterMode } from '../entities/Monster';

export class Hud {
  private interaction = document.getElementById('interaction-text');
  private counter = document.getElementById('note-counter');
  private message: HTMLDivElement;
  private stats: HTMLDivElement;
  private recording: HTMLDivElement;
  private flashOverlay: HTMLDivElement;
  private bloodOverlay: HTMLDivElement;
  private bodycamOverlay: HTMLDivElement;
  private glitchText: HTMLDivElement;
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
      font: '13px Courier New', whiteSpace: 'pre-line', lineHeight: '1.5',
    });
    layer.append(this.stats);

    this.recording = document.createElement('div');
    this.recording.id = 'bodycam-recording';
    Object.assign(this.recording.style, {
      position: 'absolute', top: '18px', right: '24px', color: '#ff4444',
      font: 'bold 15px Courier New', letterSpacing: '2px', textShadow: '0 0 5px #f00',
    });
    layer.append(this.recording);

    this.flashOverlay = document.createElement('div');
    this.flashOverlay.id = 'flashbang-overlay';
    Object.assign(this.flashOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '30', pointerEvents: 'none',
      background: '#fff', opacity: '0', transition: 'opacity 90ms linear',
    });
    document.body.append(this.flashOverlay);

    this.bloodOverlay = document.createElement('div');
    this.bloodOverlay.id = 'blood-overlay-babylon';
    Object.assign(this.bloodOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '6', pointerEvents: 'none', opacity: '0',
      background: 'radial-gradient(ellipse at center, transparent 28%, rgba(90,0,0,.2) 62%, rgba(100,0,0,.8) 100%)',
      transition: 'opacity 180ms linear',
    });
    document.body.append(this.bloodOverlay);

    this.bodycamOverlay = document.createElement('div');
    this.bodycamOverlay.id = 'bodycam-overlay';
    Object.assign(this.bodycamOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '5', pointerEvents: 'none', opacity: '.04',
      background: 'linear-gradient(90deg, rgba(255,0,0,.06), transparent 20%, transparent 80%, rgba(0,70,255,.06))',
      mixBlendMode: 'multiply',
    });
    document.body.append(this.bodycamOverlay);

    this.glitchText = document.createElement('div');
    this.glitchText.id = 'bodycam-glitch-text';
    Object.assign(this.glitchText.style, {
      position: 'fixed', left: '50%', top: '43%', transform: 'translate(-50%,-50%)',
      zIndex: '14', display: 'none', color: '#ff3030', font: 'bold 18px Courier New',
      letterSpacing: '3px', textAlign: 'center', textShadow: '2px 0 #0ff,-2px 0 #f00,0 0 12px #f00',
      pointerEvents: 'none', width: '90vw',
    });
    document.body.append(this.glitchText);
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

  setBlood(value: number): void {
    this.bloodOverlay.style.opacity = String(Math.max(0, Math.min(1, value)));
  }

  setGlitch(visible: boolean, text = 'СИГНАЛ ПОТЕРЯН // ФАТАЛЬНАЯ ОШИБКА'): void {
    this.glitchText.style.display = visible ? 'block' : 'none';
    if (visible) this.glitchText.textContent = text;
  }

  update(state: GameState, monsterMode?: MonsterMode, monsterDistance?: number, playerNoise = 0, elapsed = 0): void {
    if (this.counter) this.counter.textContent = 'Записки: ' + state.notesFound + ' / ' + state.totalNotes;
    const now = performance.now();
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(Math.floor(elapsed % 60)).padStart(2, '0');
    this.recording.textContent = '● REC ' + mins + ':' + secs;

    const lines = [
      'ЗДОРОВЬЕ  ' + Math.ceil(state.health) + '%',
      'ВЫНОСЛИВОСТЬ  ' + Math.ceil(state.stamina) + '%',
      'ФОНАРИК  ' + (state.flashlightOn ? 'ВКЛ' : 'ВЫКЛ'),
      'ВСПЫШКА  ' + (state.flashbangReadyAt > now ? Math.ceil((state.flashbangReadyAt - now) / 1000) + 'с' : 'ГОТОВО'),
      'ЭМП  ' + (state.radarUntil > now ? 'СКАНИРОВАНИЕ' : state.radarReadyAt > now ? Math.ceil((state.radarReadyAt - now) / 1000) + 'с' : 'ГОТОВ'),
      'ПОДСТАНЦИЯ  ' + (state.substationPowered ? 'ПИТАНИЕ ВКЛ' : 'ОТКЛЮЧЕНА'),
    ];
    const noiseLabels = ['ТИХО', 'ШАГИ', 'СПРИНТ', 'ХРУСТ ВЕТКИ'];
    lines.push('ШУМ  ' + noiseLabels[Math.max(0, Math.min(3, playerNoise))]);

    const fear = monsterDistance === undefined ? 0 : Math.max(0, 1 - monsterDistance / 58);
    this.bodycamOverlay.style.opacity = String(.04 + fear * .12);
    if (monsterMode) {
      const labels: Record<MonsterMode, string> = {
        patrol: 'ПАТРУЛЬ', investigate_sound: 'ИЩЕТ ВАС', investigate_light: 'ИЩЕТ СВЕТ',
        ambush: 'В ЗАСАДЕ', chase: 'ОХОТА!', stunned: 'ОСЛЕПЛЁН',
      };
      lines.push('ПУЛЬС  ' + Math.round(72 + fear * 95) + ' BPM');
      lines.push('ВЕНДИГО  ' + labels[monsterMode] + (monsterDistance === undefined ? '' : ' · ' + Math.round(monsterDistance) + 'м'));
      this.stats.style.borderLeftColor = monsterMode === 'chase' ? '#ff1111' : fear > .5 ? '#cc5533' : '#aa0000';
    } else {
      lines.push('СОСТОЯНИЕ  СПИТ');
      this.stats.style.borderLeftColor = '#aa0000';
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
