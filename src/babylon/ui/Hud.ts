import type {GameState} from '../game/GameState';
export class Hud{
 private interaction=document.getElementById('interaction-text');
 private counter=document.getElementById('note-counter');
 private message:HTMLDivElement;
 private stats:HTMLDivElement;
 private hideTimer:number|undefined;
 constructor(){
  const layer=document.getElementById('ui-layer')??document.body;
  this.message=document.createElement('div');this.message.id='babylon-message';
  Object.assign(this.message.style,{position:'absolute',top:'16%',left:'50%',transform:'translateX(-50%)',maxWidth:'min(760px,90vw)',padding:'10px 18px',background:'rgba(0,0,0,.82)',border:'1px solid #886644',color:'#ffeedd',font:'bold 16px Courier New',textAlign:'center',textShadow:'1px 1px 3px #000',display:'none',zIndex:'12'});
  layer.append(this.message);
  this.stats=document.createElement('div');this.stats.id='babylon-stats';
  Object.assign(this.stats.style,{position:'absolute',left:'20px',bottom:'20px',padding:'8px 12px',background:'rgba(0,0,0,.72)',borderLeft:'3px solid #aa0000',color:'#eee',font:'14px Courier New',whiteSpace:'pre-line'});
  layer.append(this.stats);
 }
 showInteraction(text:string):void{if(this.interaction){this.interaction.textContent=text;this.interaction.style.display=text?'block':'none';}}
 update(state:GameState):void{
  if(this.counter)this.counter.textContent='Записки: '+state.notesFound+' / '+state.totalNotes;
  this.stats.textContent='ЗДОРОВЬЕ  '+Math.ceil(state.health)+'%\nВЫНОСЛИВОСТЬ  '+Math.ceil(state.stamina)+'%'+(state.substationPowered?'\nПОДСТАНЦИЯ  ВКЛ':'');
 }
 notify(text:string,duration=3600):void{
  this.message.textContent=text;this.message.style.display='block';
  if(this.hideTimer!==undefined)window.clearTimeout(this.hideTimer);
  this.hideTimer=window.setTimeout(()=>{this.message.style.display='none';},duration);
 }
}
