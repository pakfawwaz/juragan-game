'use strict';
/* ---------- Boot */
function start(data){
  if(data && data.S){ S=data.S; }
  else { try{ const s=localStorage.getItem(SAVE_KEY); if(s) S=JSON.parse(s); }catch(e){ S=null; } }
  if(S){ if(!S.P||!S.seed) S=null; else { buildMarket(S.seed); migrate(); S.paused=true; } }
  render();
  if(S) toast('Paused','Press a speed button or Space to resume.');
  requestAnimationFrame(frame);
}
window.claude?.hot?.snapshot?.(()=>({S}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
