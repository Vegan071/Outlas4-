import type { GameState } from '../game/GameState';
export class Hud {
  private interaction=document.getElementById('interaction-text');
  private counter=document.getElementById('note-counter');
  private message=document.getElementById('menu-note');
  showInteraction(text:string):void{if(this.interaction){this.interaction.textContent=text;this.interaction.style.display=text?'block':'none';}}
  update(state:GameState):void{if(this.counter)this.counter.textContent='Записки: '+state.notesFound+' / '+state.totalNotes;}
  notify(text:string):void{if(this.message)this.message.textContent=text;}
}
