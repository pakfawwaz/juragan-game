'use strict';
/* ============================================================
   FAMILY CAPITAL · what the money would have done elsewhere
   ============================================================ */
function newBench(cap){ const q=quote('IHSG',S.h), c=cpi(S.h); return {contrib:cap,bDep:cap,bIhsgU:cap/q,bInfU:cap/c,fraudY:0}; }
function bench(){ const B=S.bench; return {dep:B.bDep, ihsg:B.bIhsgU*quote('IHSG',S.h), inf:B.bInfU*cpi(S.h)}; }
const RANKS=[[3,'Konglomerat','Your name is on buildings in Jakarta.'],[1.6,'Juragan besar','The family money became a real business group.'],[1.15,'Pengusaha mapan','Solid. You beat the bank.'],[0.9,'Pedagang biasa','You roughly kept pace with a deposito.'],[0.5,'Usaha seret','The money would have done better in the bank.'],[-Infinity,'Gulung tikar','Most of your parents\' money is gone.']];
function finalEval(){ const b=bench(), nw=nwP(), r=nw/Math.max(1,b.dep), k=RANKS.find(x=>r>=x[0]); return {nw,b,r,rank:k[1],rankTxt:k[2],yrs:(S.h-S.start)/8766,contrib:S.bench.contrib}; }

/* ============================================================
   CORPORATE ACTIONS · spin-off, inbreng, merger
   ============================================================ */
const um=u=>u.m||(u.m={rev:0,cost:0});
function unitT12(u){ const m=(u.mh||[]).slice(-12); return {n:m.length, net:m.reduce((s,x)=>s+x,0)}; }
function spinReady(u){
  const t=unitT12(u);
  if(t.n<6) return `It has ${t.n} month${t.n===1?'':'s'} of results; a spin-off needs at least 6.`;
  const ann=t.net*12/t.n;
  if(t.net<=0) return `It lost ${rp(-t.net)} over the last ${t.n} months.`;
  if(ann<0.15*u.cap) return `It earns about ${rp(ann)} a year, ${pc(ann/u.cap,0)} of the ${rp(u.cap)} invested in it. A spin-off needs at least 15%.`;
  return null;
}
const spinFee=h=>Math.round((formFee('PT',h)+5e6*cpi(h))/1000)*1000;
const kjppFee=h=>Math.round(15e6*cpi(h)/1000)*1000;
const mergeFee=h=>Math.round(25e6*cpi(h)/1000)*1000;
function spinCheck(c,u){
  if(S.h<H_UU40) return `Spin-offs (pemisahan) only became possible under UU 40/2007, in force from 16 August 2007. Until then, found a subsidiary and move the unit into it by inbreng.`;
  if(c.form!=='PT') return `${coName(c)} is a ${c.form==='PTP'?'PT Perorangan':c.form}. Only a regular PT can spin off a unit (UU 40/2007 Art. 135). Move the unit into a PT by inbreng instead.`;
  const why=spinReady(u); if(why) return `${BIZ[u.t].n} in ${REG[u.reg].n} is not successful enough to spin off yet. ${why}`;
  return null;
}
function spinOff(c,u,o){
  const h=S.h, law=lawPT(h), b=BIZ[u.t];
  const pre=spinCheck(c,u); if(pre) return pre;
  const name=(o.name||'').trim(); if(!name) return 'Give the new subsidiary a name.';
  if(S.C.some(x=>x.name.toLowerCase()===name.toLowerCase())) return `You already have a company called ${name}. Pick another name.`;
  const cashIn=Math.max(0,+o.cash||0), pct=clamp((+o.pct||1)/100,0.01,0.49), partner=o.partner||'F';
  if(partner===c.id) return `${coName(c)} is already the main shareholder. Pick a different second shareholder.`;
  const fee=spinFee(h), total=(u.book+cashIn)/(1-pct), pcap=total*pct;
  if(total<law.minPaid) return `Paid-up capital would be ${rp(total)}, below the ${rp(law.minPaid,true)} minimum under ${law.law}. Add working capital.`;
  if(c.cash<cashIn+fee) return `Not enough capital in ${coName(c)}. The spin-off needs ${rp(cashIn+fee)} (working capital ${rp(cashIn)} plus notary, ministry and announcement fees ${rp(fee)}), but the account holds ${rp(c.cash)}.`;
  if(partner!=='F'){ const pa=acct(partner); if(!pa) return 'Choose the second shareholder.'; if(partner!=='P'&&pa.form!=='PT') return 'Only a regular PT can hold shares in another PT.'; if(pa.cash<pcap) return `${acctName(partner)} needs ${rp(pcap)} for its ${pc(pct,0)} stake and holds ${rp(pa.cash)}. Lower the share.`; }
  if(!o.dir) return 'Choose the Direktur Utama. A PT cannot be registered without a director (UU 40/2007 Art. 92).';
  if(!o.kom) return 'Choose a commissioner. A PT needs at least one (UU 40/2007 Art. 108).';
  if(o.dir==='P'&&o.kom==='P') return 'You cannot be both director and commissioner of the same PT. Pick someone else for one of the two seats.';
  const tmp={id:'C'+S.nid,reg:c.reg,hired:[],level:sizeOf(total,0,h)};
  const picks=[[o.dir,'dir'],[o.kom,'kom']].map(([k,r])=>pickBoard(tmp,k,r));
  if(picks.some(p=>!p)) return 'That candidate is no longer available this month. Pick again.';
  const hf=picks.reduce((s,p)=>s+(p.fee||0),0);
  if(hf>=cashIn+pcap) return `The headhunter fees of ${rp(hf)} are more than the cash the new PT starts with (${rp(cashIn+pcap)}). Add working capital, or pick yourself or a relative.`;
  c.cash-=cashIn+fee; book(c,'opex',fee); c.units.splice(c.units.indexOf(u),1);
  if(partner!=='F') acct(partner).cash-=pcap;
  const shares=Math.max(1,Math.round(total/1000)), own={[c.id]:Math.round(shares*(1-pct))}; own[partner]=shares-own[c.id];
  const n=Object.assign(newAcct(),{id:nid('C'),name,form:'PT',parent:c.id,own,shares,paidIn:total,retained:0,dir:0,autoUMR:c.autoUMR,units:[u],mon:blankPL(),ytd:blankPL(),hist:[],taxDue:0,prevTurnover:null,founded:h,hired:[]});
  n.reg=c.reg; n.depts=[]; n.divs=[]; n.pay={...(c.pay||PAY_DEF())}; n.mfees={}; n.outs={}; n.cash=cashIn+pcap-hf; n.rups={...c.rups};
  n.board=picks.map(p=>{ const {fee:_f,key:_k,...x}=p; return {...x,id:nid('B')}; }); n.hired=picks.filter(p=>p.key).map(p=>p.key);
  { const d0=n.board.find(x=>x.role==='dir'); if(d0) d0.fn='ceo'; }
  S.C.push(n); S.sel.co=n.id; updateLevel(n,true);
  logm(`${coName(c)} spun off ${b.n} in ${REG[u.reg].n} as ${coName(n)} (pemisahan, UU 40/2007 Art. 135). Paid-up capital ${rp(total)}: the unit at book value ${rp(u.book)}${cashIn?` plus ${rp(cashIn)} working capital`:''}, and ${rp(pcap)} from ${partner==='F'?'your family':partner==='P'?'you personally':coName(acct(partner))}. ${coName(c)} holds ${pc(1-pct,0)}, ${partner==='F'?'your family':partner==='P'?'you personally':coName(acct(partner))} ${pc(pct,0)}. ${n.board.map(x=>`${titleOf(n,x)}: ${x.who==='P'?'you':x.name}`).join(' · ')}. Fees ${rp(fee)}${hf?`, headhunter fees ${rp(hf)}`:''}.`,'good');
  return n;
}
function inbrengTargets(c){ return S.C.filter(t=>t!==c&&(c.form==='PT'?(t.form==='PT'&&(t.own[c.id]||0)>0):((t.form==='PT'||t.form==='PTP')&&(t.own.P||0)>0))); }
function inbreng(c,u,tid){
  const t=acct(tid), b=BIZ[u.t], fee=kjppNeed(u.book)?kjppFee(S.h):0;
  if(!t) return 'Choose the company that receives the unit.';
  if(t.ipo) return `${coName(t)} is in registration for its IPO. Its share register is frozen until it lists.`;
  if(t.form!=='PT'&&t.form!=='PTP') return `${coName(t)} is a ${t.form}. Inbreng is a contribution of assets in exchange for shares, so the receiver must be a PT (UU 40/2007 Art. 34).`;
  if(c.form==='PT'&&t.form==='PTP') return 'A PT Perorangan can only be owned by an individual, so a company cannot take shares in it.';
  if(c.form==='PT'&&!(t.own[c.id]>0)) return `${coName(t)} is not a subsidiary of ${coName(c)}. A PT can only move a unit by inbreng into a company it holds shares in.`;
  if(c.form!=='PT'&&!(t.own.P>0)) return `You hold no shares in ${coName(t)}.`;
  if(fee&&c.cash<fee) return `Not enough in ${coName(c)}'s account for the independent appraiser (KJPP) who must value the unit first: ${rp(fee)} needed, ${rp(c.cash)} available.`;
  const holder=c.form==='PT'?c.id:'P', bv=shareVal(t), val=u.book, ns=Math.max(1,Math.round(val/bv));
  if(fee){ c.cash-=fee; book(c,'opex',fee); } c.units.splice(c.units.indexOf(u),1);
  if(c.form!=='PT') c.paidIn=Math.max(0,c.paidIn-val);
  t.units.push(u); t.shares+=ns; t.own[holder]=(t.own[holder]||0)+ns; t.paidIn+=val;
  logm(`Inbreng: ${coName(c)} transferred ${b.n} in ${REG[u.reg].n} to ${coName(t)} at ${fee?'its appraised':'its'} book value of ${rp(val)}, for ${NF.format(ns)} new shares${holder==='P'?' issued to you':''}. ${acctName(holder)} now holds ${pc(ownPct(t,holder),1)} of ${coName(t)}.${fee?` Appraisal fee ${rp(fee)}.`:' Small enough to value from the books: no appraisal fee.'}`,'good');
  return null;
}
/* ---------- Treasury desk: a team that invests the company's spare money */
const DESK_STRAT={
  kons:{n:'Conservative',w:{dep:0.6,bond:0.35,stk:0.05},tenor:5,depM:12,picks:4,blurb:'Mostly deposito and short government bonds. Small, steady returns.'},
  mod:{n:'Balanced',w:{dep:0.3,bond:0.4,stk:0.3},tenor:10,depM:6,picks:6,blurb:'A mix of deposito, 10-year SUN and blue chips.'},
  agr:{n:'Aggressive',w:{dep:0.1,bond:0.2,stk:0.7},tenor:10,depM:3,picks:8,blurb:'Mostly IDX30 shares. Bigger swings, higher long-run return.'},
  custom:{n:'Custom',w:null,tenor:10,depM:6,picks:6,blurb:'Your own split.'},
};
const deskOf=c=>(c.depts||[]).find(d=>d.desk);
const deskW=d=>d.desk.strat==='custom'?d.desk.w:DESK_STRAT[d.desk.strat].w;
const deskPort=c=>({dep:depSum(c),bond:bondMV(c),stk:holdMV(c)});
function deskManaged(c,d){ const P=deskPort(c), tot=c.cash+P.dep+P.bond+P.stk; let m=Math.max(0,tot-(d.desk.buffer||0)); if(d.desk.cap>0) m=Math.min(m,d.desk.cap); return m; }
function deskSkill(c,d){ return deptQ(c,d); }
// Analysts' view of each stock: a skilled desk sees more of what is coming, a weak one mostly noise.
function deskScore(c,d,s,rng){ const q=deskSkill(c,d), k=clamp((q-0.4)*0.2,0,0.1), i=lastFullIdx(S.h), j=Math.min(MK[s].length-1,i+63), fut=MK[s][j]/MK[s][i]-1, past=MK[s][i]/MK[s][Math.max(0,i-126)]-1;
  return k*fut+0.05*past+0.15*gauss(rng); }
function deskRebalance(c,d){
  const D=d.desk, w=deskW(d), S0=DESK_STRAT[D.strat], M=deskManaged(c,d), P=deskPort(c), q=deskSkill(c,d), lot=lotSize(S.h);
  const rng=mulberry((S.seed^S.h^parseInt(c.id.slice(1)))>>>0), acts=[];
  const tgt={dep:M*w.dep,bond:M*w.bond,stk:M*w.stk}, band=Math.max(5e6,M*0.03);
  // shares: sell what is out of favour or overweight first, so cash is free for the rest
  const uni=SYMS.filter(s=>listed(s,S.h)&&IDX30.has(s)), scored=uni.map(s=>[s,deskScore(c,d,s,rng)]).sort((a,b)=>b[1]-a[1]);
  const n=Math.max(1,S0.picks), picks=tgt.stk>5e6?scored.slice(0,n).map(x=>x[0]):[], per=picks.length?tgt.stk/picks.length:0;
  let traded=0;
  for(const s of Object.keys(c.hold)){ const v=c.hold[s].sh*quote(s,S.h), want=picks.includes(s)?per:0; if(v-want>Math.max(band/2,quote(s,S.h)*lot)){ const lots=Math.floor((v-want)/(quote(s,S.h)*lot)); if(lots>0&&!execOrder(c.id,s,'sell',lots,true)){ traded++; } } }
  // bonds: trim if well above target
  if(P.bond-tgt.bond>band*2){ let over=P.bond-tgt.bond; for(const b of [...(c.bonds||[])].sort((x,y)=>(y.face*bondPx(y)-y.cost)-(x.face*bondPx(x)-x.cost))){ if(over<=band) break; over-=b.face*bondPx(b); sellBond(c,b.id,true); acts.push('sold '+b.name); } }
  // deposito: let excess run off, top up shortfall
  if(P.dep-tgt.dep>band){ let over=P.dep-tgt.dep; for(const x of c.deps){ if(over<=0) break; if(x.aro){ x.aro=false; over-=x.amt; } } }
  const spare=()=>Math.max(0,c.cash-(D.buffer||0));
  { const need=tgt.dep-depSum(c); const amt=Math.floor(Math.min(need,spare())/1e6)*1e6; if(need>band&&amt>=1e6){ const r=depRate(S.h,S0.depM); c.cash-=amt; c.deps.push({id:nid('D'),amt,r,m:S0.depM,mat:addMonths(S.h,S0.depM),aro:true}); acts.push(`deposito ${rp(amt)} at ${pc(r)}`); } }
  { const need=tgt.bond-bondMV(c); let T=S0.tenor; if(q>0.55){ const i=tdLE(keyH(S.h)), up=MK.Y10[Math.min(MK.Y10.length-1,i+63)]-MK.Y10[i]; if(up>0.4) T=5; else if(up<-0.4&&D.strat!=='kons') T=20; }
    const face=Math.floor(Math.min(need,spare()/1.001)/1e6)*1e6; if(need>band&&face>=10e6&&!buyBond(c,'f'+T,face,true)) acts.push(`${rp(face)} SUN ${T}Y`); }
  { for(const s of picks){ const px=quote(s,S.h), v=(c.hold[s]?.sh||0)*px, gap=per-v; if(gap<px*lot) continue; const lots=Math.floor(Math.min(gap,spare()/1.0015)/(px*lot)); if(lots>0&&!execOrder(c.id,s,'buy',lots,true)) traded++; } }
  D.lastM=keyH(S.h)/100|0; D.last=S.h;
  logm(`${coName(c)} · ${d.name}: monthly rebalance of ${rp(M)} (${DESK_STRAT[D.strat].n}).${traded||acts.length?' ':''}${traded?traded+' share trades'+(picks.length?', holding '+picks.join(', '):'')+'. ':''}${acts.length?acts.join(', ')+'.':''}`);
  S.dirty=true;
}
function deskTick(){ if(!isOpen(S.h)||dOf(S.h).getUTCHours()!==10) return; const ym=keyH(S.h)/100|0; for(const c of S.C){ const d=deskOf(c); if(d&&d.head&&d.desk.lastM!==ym) deskRebalance(c,d); } }
function deskModal(cid){
  const c=acct(cid), d=deskOf(c), lv=c.level||0;
  if(!d){ if(lv<1) return err(`A treasury desk needs a finance head of at least manager level, so it opens up at Usaha Kecil. ${coName(c)} is a Usaha ${SZ(c).n}. ${nextLevelText(c)}`);
    if((c.depts||[]).length>=DEPT_MAX[lv]) return err(`As a Usaha ${SZ(c).n}, ${coName(c)} can run at most ${DEPT_MAX[lv]} teams. Close or merge one first, or grow: ${nextLevelText(c)}`); }
  const D=d?d.desk:{strat:'mod',w:{dep:0.3,bond:0.4,stk:0.3},buffer:Math.round(Math.max(50e6,(c.hist.slice(-1)[0]?.wage||0)*3+(c.hist.slice(-1)[0]?.opex||0)*3)/1e6)*1e6,cap:0};
  const st={strat:D.strat,dep:Math.round(D.w.dep*100),bond:Math.round(D.w.bond*100),stk:Math.round(D.w.stk*100),buffer:D.buffer,cap:D.cap||0};
  const draw=el=>{
    const body=el.querySelector('#tk-body'), w=st.strat==='custom'?{dep:st.dep,bond:st.bond,stk:st.stk}:Object.fromEntries(Object.entries(DESK_STRAT[st.strat].w).map(([k,v])=>[k,Math.round(v*100)]));
    const plan=d?null:deptPlan(c,['treasury']), P=deskPort(c), tot=c.cash+P.dep+P.bond+P.stk, M=Math.max(0,Math.min(st.cap>0?st.cap:Infinity,tot-st.buffer));
    body.innerHTML=`<p class="note">The desk invests ${esc(coName(c))}'s money above a cash buffer across deposito, government bonds (SUN FR) and IDX30 shares, and rebalances on the first trading day of each month. It manages <b>all</b> of the company's deposito, bonds and shares. A better team head picks better stocks and times bond purchases better; it also handles the treasury & bank relations job.</p>
      <div class="biz-pick" role="group" aria-label="Strategy">${Object.entries(DESK_STRAT).map(([k,x])=>`<button type="button" data-s="${k}" aria-pressed="${k===st.strat}"><b>${x.n}</b><span>${x.blurb}</span></button>`).join('')}</div>
      ${st.strat==='custom'?`<div class="fields"><label class="f">Deposito %<input type="number" id="tk-dep" min="0" max="100" value="${st.dep}"></label><label class="f">Bonds %<input type="number" id="tk-bond" min="0" max="100" value="${st.bond}"></label><label class="f">Shares %<input type="number" id="tk-stk" min="0" max="100" value="${st.stk}"></label></div>`:''}
      <div class="fields"><label class="f">Cash buffer kept in the rekening<input type="number" id="tk-buf" min="0" step="1000000" value="${st.buffer}"></label><label class="f">Maximum to invest (0 = no limit)<input type="number" id="tk-cap" min="0" step="1000000" value="${st.cap}"></label></div>
      <div class="rows">
        <div class="row"><span class="k">Split</span><span class="v">deposito ${w.dep}% · bonds ${w.bond}% · shares ${w.stk}%</span></div>
        <div class="row"><span class="k">Money the desk would manage now</span><span class="v">${rp(M)}</span></div>
        ${plan?`<div class="row"><span class="k">Team</span><span class="v">${HEADT[lv].t} + ${plan.need} staff · about ${rp(plan.monthly)} / month</span></div><div class="row"><span class="k">Recruitment costs</span><span class="v">about ${rp(plan.setup)}</span></div>`:`<div class="row"><span class="k">Desk quality</span><span class="v">${Math.round(deskSkill(c,d)*100)}</span></div>`}
      </div>
      <p class="note" id="tk-chk"></p>
      <div class="btns"><button class="btn pri" id="tk-go">${d?'Save mandate':'Set up the desk'}</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ const g=q=>body.querySelector(q); if(g('#tk-dep')){ st.dep=+g('#tk-dep').value||0; st.bond=+g('#tk-bond').value||0; st.stk=+g('#tk-stk').value||0; } st.buffer=Math.max(0,+g('#tk-buf').value||0); st.cap=Math.max(0,+g('#tk-cap').value||0); };
    body.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ keep(); st.strat=b.dataset.s; draw(el); });
    body.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>{ keep(); draw(el); }));
    body.querySelector('#tk-go').onclick=()=>{ keep();
      const ww=st.strat==='custom'?{dep:st.dep/100,bond:st.bond/100,stk:st.stk/100}:DESK_STRAT[st.strat].w;
      if(st.strat==='custom'&&Math.abs(st.dep+st.bond+st.stk-100)>0.5){ body.querySelector('#tk-chk').className='note down'; body.querySelector('#tk-chk').textContent=`The split adds up to ${st.dep+st.bond+st.stk}%. Make it 100%.`; return; }
      let dd=d;
      if(!dd){ const old=deptOf(c,'treasury'); if(err(saveDept(c,'Treasury Desk',['treasury'],null))) return; dd=c.depts.find(x=>x.name==='Treasury Desk'); if(old&&old!==dd&&!old.jobs.length) logm(`${coName(c)}: ${old.name} has no jobs left after handing treasury to the desk.`,'bad'); }
      dd.desk={strat:st.strat,w:ww,buffer:st.buffer,cap:st.cap,lastM:dd.desk?.lastM||0,since:dd.desk?.since||S.h};
      logm(`${coName(c)} · ${dd.name}: mandate set to ${DESK_STRAT[st.strat].n} (deposito ${Math.round(ww.dep*100)}%, bonds ${Math.round(ww.bond*100)}%, shares ${Math.round(ww.stk*100)}%), cash buffer ${rp(st.buffer)}${st.cap?`, at most ${rp(st.cap)}`:''}.`,'good');
      closeModal(); render(); };
  };
  openModal(d?`Treasury desk mandate · ${coName(c)}`:`Set up a treasury desk · ${coName(c)}`,'<div id="tk-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function deskPanel(c){
  const d=deskOf(c), lv=c.level||0;
  if(!d) return `<section class="panel"><div class="panel-h"><div><h3>Treasury desk</h3><div class="note">A finance team that invests spare cash in deposito, SUN bonds and IDX30 shares for you.${lv<1?' Opens up at Usaha Kecil.':''}</div></div><button class="btn sm ${lv>=1?'pri':'ghost'}" data-act="desk" data-id="${c.id}">Set up a desk</button></div></section>`;
  const D=d.desk, w=deskW(d);
  return `<section class="panel"><div class="panel-h"><div><h3>Treasury desk</h3><div class="note">${esc(d.name)} · ${DESK_STRAT[D.strat].n} · ${d.head?`${esc(headTitle(c,d))} ${esc(d.head.name)}, skill ${d.head.skill}`:'head being recruited'} · rebalances on the first trading day of each month</div></div><button class="btn sm" data-act="desk" data-id="${c.id}">Change mandate</button></div>
    <div class="panel-b">${LH(()=>{ const P=deskPort(c), M=deskManaged(c,d), inv=P.dep+P.bond+P.stk||1, cost=Object.values(c.hold).reduce((s,h)=>s+h.cost,0)+(c.bonds||[]).reduce((s,b)=>s+b.cost,0), unr=P.stk+P.bond-cost;
      const row=(l,k)=>`<div class="row"><span class="k">${l}</span><span class="v">${rp(P[k])} · ${pc(P[k]/inv,0)} <span class="muted">(target ${Math.round(w[k]*100)}%)</span></span></div>`;
      return `<div class="grid2"><div class="rows">${row('Deposito','dep')}${row('Government bonds','bond')}${row('IDX30 shares','stk')}<div class="row total"><span class="k">Invested</span><span class="v">${rp(P.dep+P.bond+P.stk)}</span></div></div>
        <div class="rows"><div class="row"><span class="k">Mandate now</span><span class="v">${rp(M)}</span></div><div class="row"><span class="k">Cash buffer</span><span class="v">${rp(D.buffer)}</span></div><div class="row"><span class="k">Unrealised gain, shares and bonds</span><span class="v ${cls(unr)}">${sgn(unr,x=>rp(x))}</span></div><div class="row"><span class="k">Desk quality</span><span class="v">${Math.round(deskSkill(c,d)*100)}</span></div><div class="row"><span class="k">Last rebalance</span><span class="v">${D.last?fdate(D.last):'first trading day of next month'}</span></div></div></div>
        ${Object.keys(c.hold).length?`<p class="note">Holding ${Object.keys(c.hold).map(s=>`${s} ${rp(c.hold[s].sh*quote(s,S.h))}`).join(' · ')}</p>`:''}`; })}
      <p class="note">Interest, coupons, dividends and trading gains go to the profit and loss as other income. Close the desk from Teams on the Organisation tab; its holdings stay in the company.</p></div></section>`;
}

/* ---------- Converting a UD or CV into a PT */
// Simplification: small contributions are valued from the books by the notary; a KJPP appraisal is only needed above this.
const kjppLimit=h=>1e9*cpi(h);
const kjppNeed=(val,h)=>val>kjppLimit(h??S.h);
function convInfo(c,o){
  const h=S.h, law=lawPT(h), ptp=o.form==='PTP', mode=o.mode||'new';
  const nonCash=unitBook(c)+holdMV(c)+bondMV(c), eq=equity(c), appr=kjppNeed(nonCash,h)?kjppFee(h):0;
  if(mode==='into'){ const t=acct(o.target); return {mode,t,eq,nonCash,appr,fee:formFee('PT',h)+appr,law}; }
  const pct=ptp?0:c.form==='CV'?(c.own.F||0)/c.shares:clamp((+o.pct||1)/100,0.01,0.49), partner=ptp?null:c.form==='CV'?'F':(o.partner||'F');
  const total=c.form==='CV'?Math.max(0,eq):Math.max(0,eq)/(1-pct), pcap=c.form==='CV'?0:total*pct;
  return {mode,eq,nonCash,appr,fee:formFee(o.form,h)+appr,law,pct,partner,total,pcap,ptp};
}
function convertCheck(c,o){
  if(c.form!=='UD'&&c.form!=='CV') return `${coName(c)} is already a PT.`;
  const I=convInfo(c,o), h=S.h;
  if(I.eq<=0) return `${coName(c)} has no positive net assets to put into a PT (equity ${rp(I.eq)}). Inject capital or pay down loans first.`;
  if(I.mode==='into'){
    const t=I.t; if(!t) return 'Choose the PT that takes over the business.';
    if(t.form!=='PT'&&t.form!=='PTP') return `${coName(t)} is a ${t.form}; only a PT can take a business in exchange for shares.`;
    if(!(t.own.P>0)) return `You hold no shares in ${coName(t)}, so it cannot issue you shares for the business.`;
    if(t.form==='PTP'&&c.form==='CV') return 'A PT Perorangan has one owner only, so it cannot issue shares to your CV partner. Choose a regular PT.';
    if(S.C.some(s=>s.own[c.id]>0)) return `${coName(c)} holds shares in other companies. Sell or move them first.`;
    if(c.cash<I.fee) return `Not enough in ${coName(c)}'s account for the notary${I.appr?' and the KJPP appraisal':''}: ${rp(I.fee)} needed, ${rp(c.cash)} available.`;
    return null;
  }
  if(o.form==='PTP'){ if(h<H_PTP) return 'PT Perorangan only exists from February 2021 (PP 8/2021).'; if(c.form==='CV') return 'A CV has two partners; a PT Perorangan has one. Convert to a regular PT.'; if((c.level||0)>1) return `A PT Perorangan is only for micro and small businesses. ${coName(c)} is a Usaha ${SZ(c).n}.`; }
  else if(I.total<I.law.minPaid) return `Paid-up capital would be ${rp(I.total)}, below the ${rp(I.law.minPaid,true)} minimum under ${I.law.law}. Inject capital first.`;
  if(I.partner==='P') return 'You already own the business, so you cannot also be the second shareholder. A PT needs two different founders: pick your family or one of your PTs, or choose PT Perorangan if you want to own it alone.';
  if(I.partner&&I.partner!=='F'&&c.form==='UD'){ const pa=acct(I.partner); if(!pa) return 'Choose the second shareholder.'; if(pa.cash<I.pcap) return `${acctName(I.partner)} needs ${rp(I.pcap)} for its ${pc(I.pct,0)} stake and holds ${rp(pa.cash)}.`; }
  if(o.form==='PT'){ if(!o.kom) return 'Choose a commissioner. A PT needs at least one (UU 40/2007 Art. 108).'; if(o.kom==='P'&&c.board.some(b=>b.who==='P'&&b.role==='dir')) return 'You run the business as its director, so you cannot also be its commissioner. Pick someone else.'; }
  if(c.cash<I.fee) return `Not enough in ${coName(c)}'s account for the notary and ministry fees${I.appr?' and the KJPP appraisal':''}: ${rp(I.fee)} needed, ${rp(c.cash)} available.`;
  return null;
}
function convertCo(c,o){
  const pre=convertCheck(c,o); if(pre) return pre;
  const I=convInfo(c,o), old=coName(c), was=c.form;
  if(I.mode==='into'){
    c.cash-=I.fee; book(c,'opex',I.fee);
    const t=I.t, r=mergeCos(t,c,{fee:0,label:'inbreng'}); if(r) return r;
    logm(`${old} was put into ${coName(t)} as a going concern (inbreng of the whole business), valued ${I.appr?'by a KJPP appraiser':'from its books by the notary'} at ${rp(I.eq)}. Fees ${rp(I.fee)}.`,'good');
    return null;
  }
  let kom=null;
  if(o.form==='PT'){ const tmp={id:c.id,reg:c.reg,hired:c.hired||[],level:c.level||0}; kom=pickBoard(tmp,o.kom,'kom'); if(!kom) return 'That candidate is no longer available this month. Pick again.'; }
  const hf=kom&&kom.fee||0;
  c.cash-=I.fee+hf; book(c,'opex',I.fee+hf);
  if(I.partner&&I.partner!=='F'&&was==='UD'){ acct(I.partner).cash-=I.pcap; }
  c.cash+=I.pcap;
  const shares=Math.max(1,Math.round(I.total/1000));
  if(I.ptp) c.own={P:shares};
  else if(was==='CV'){ const f=I.pct; c.own={P:Math.round(shares*(1-f)),F:0}; c.own.F=shares-c.own.P; }
  else { c.own={P:Math.round(shares*(1-I.pct))}; c.own[I.partner]=(c.own[I.partner]||0)+shares-c.own.P; }
  c.shares=shares; c.paidIn=I.total; c.retained=0; c.reserve=0; c.form=o.form; c.founded=S.h; c.rups=c.rups||RUPS_DEF();
  if(o.name&&o.name.trim()) c.name=o.name.trim();
  c.board=c.board.filter(b=>b.role==='dir'); if(!c.board.length) c.board.push({id:nid('B'),who:'P',role:'dir',src:'self',skill:0,integ:100,sal:0,since:S.h});
  if(!c.board.some(b=>b.fn==='ceo')) c.board[0].fn='ceo';
  if(kom){ const {fee:_f,key:_k,...x}=kom; c.board.push({...x,id:nid('B')}); if(kom.key) (c.hired||(c.hired=[])).push(kom.key); }
  updateLevel(c,true);
  logm(`${old} became ${coName(c)} (${o.form==='PTP'?'PT Perorangan':'PT'}). The whole business moves across: ${c.units.length} unit${c.units.length===1?'':'s'}, cash, accounts and loans. Net assets ${rp(I.eq)} were valued ${I.appr?'by a KJPP appraiser':'from the books by the notary, no appraisal needed for a business this small'}; paid-up capital ${rp(I.total)}${I.pcap?`, of which ${rp(I.pcap)} from ${I.partner==='F'?'your family':acctName(I.partner)}`:''}. Fees ${rp(I.fee)}${hf?`, headhunter fee ${rp(hf)}`:''}.`,'good');
  S.dirty=true; return null;
}
function convertModal(cid){
  const c=acct(cid); if(!c||(c.form!=='UD'&&c.form!=='CV')) return;
  const targets=S.C.filter(t=>t!==c&&(t.form==='PT'||t.form==='PTP')&&t.own.P>0);
  const st={mode:'new',form:'PT',name:c.name,partner:'F',pct:1,kom:'',target:targets[0]?.id||''};
  const draw=el=>{
    const body=el.querySelector('#cv-body'), I=convInfo(c,st), chk=convertCheck(c,st), h=S.h;
    const tmp={id:c.id,reg:c.reg,hired:c.hired||[],level:sizeOf(I.total||I.eq,turnover12(c),h)}, kc=candidates(tmp,'kom');
    const candOpt=(x,sel)=>`<option value="${x.key}" ${sel===x.key?'selected':''}>${x.src==='pro'?'Professional':'Family'} · ${esc(x.name)}, ${esc(x.bg.toLowerCase())} · skill ${x.skill} · ${rp(x.sal)}/mo${x.fee?' + fee '+rp(x.fee):''}</option>`;
    const partners=['F',...S.C.filter(x=>x.form==='PT'&&x!==c).map(x=>x.id)];
    body.innerHTML=`<p class="note">${esc(coName(c))} is a ${c.form==='UD'?'sole proprietorship: its debts are your debts':'partnership with unlimited liability for you as active partner'}. Turning it into a PT moves the whole running business across at once: every unit, the bank account, deposito, bonds, shares, loans, teams and divisions. ${I.appr?`At ${rp(I.nonCash)} of non-cash assets, the notary needs an independent KJPP appraisal (${rp(kjppFee(h))}).`:`With ${rp(I.nonCash)} of non-cash assets it is small enough for the notary to take the values from its books, so no KJPP appraisal is needed (simplified: the game requires one above ${rp(kjppLimit(h))}).`}</p>
      <div class="biz-pick" role="group" aria-label="How"><button type="button" data-mode="new" aria-pressed="${st.mode==='new'}"><b>Convert into a new PT</b><span>Same business and history, new legal form. Keeps its name if you like.</span></button><button type="button" data-mode="into" aria-pressed="${st.mode==='into'}" ${targets.length?'':'disabled'}><b>Put it into an existing PT</b><span>${targets.length?'Inbreng of the whole business; you get new shares in that PT and the ${c.form} closes.':'You have no PT yet.'}</span></button></div>
      ${st.mode==='new'?`
        <div class="fields"><label class="f">Name<input type="text" id="cv-name" maxlength="40" value="${esc(st.name)}"></label>
        ${h>=H_PTP&&c.form==='UD'?`<label class="f">Legal form<select id="cv-form"><option value="PT" ${st.form==='PT'?'selected':''}>PT</option><option value="PTP" ${st.form==='PTP'?'selected':''}>PT Perorangan</option></select></label>`:''}</div>
        ${st.form==='PT'&&c.form==='UD'?`<div class="fields"><label class="f">Second shareholder<select id="cv-partner">${partners.map(p=>`<option value="${p}" ${p===st.partner?'selected':''}>${esc(p==='F'?'Your family':p==='P'?'You personally':coName(acct(p)))}</option>`).join('')}</select></label><label class="f">Their share (%)<input type="number" id="cv-pct" min="1" max="49" value="${st.pct}"></label></div>`:c.form==='CV'?`<p class="note">Your family partner keeps their ${pc(I.pct,0)} as shares in the PT.</p>`:''}
        ${st.form==='PT'?`<label class="f">Komisaris<select id="cv-kom"><option value="">Choose…</option><option value="P" ${st.kom==='P'?'selected':''}>Me, ${esc(S.name)}</option><option value="MOM" ${st.kom==='MOM'?'selected':''}>${esc(momName(c.id))}, your mother · skill 40 · unpaid</option>${kc.map(x=>candOpt(x,st.kom)).join('')}</select></label><p class="note">The current ${c.board.filter(b=>b.role==='dir').map(b=>b.who==='P'?'director (you)':b.name).join(', ')} becomes the Direktur Utama.</p>`:''}
        <div class="rows">
          <div class="row"><span class="k">Net assets moving in</span><span class="v">${rp(I.eq)}</span></div>
          <div class="row"><span class="k">Paid-up capital</span><span class="v">${rp(I.total)}${st.form==='PT'?` · minimum ${rp(I.law.minPaid,true)}`:''}</span></div>
          ${I.pcap?`<div class="row"><span class="k">Cash from the second shareholder</span><span class="v">${rp(I.pcap)} for ${pc(I.pct,0)}</span></div>`:''}`
      :`<label class="f">Receiving PT<select id="cv-target">${targets.map(t=>`<option value="${t.id}" ${t.id===st.target?'selected':''}>${esc(coName(t))} · you hold ${pc(ownPct(t,'P'),0)}</option>`).join('')}</select></label>
        <div class="rows">
          <div class="row"><span class="k">Business valued at</span><span class="v">${rp(I.eq)}</span></div>
          ${I.t?`<div class="row"><span class="k">New shares for you</span><span class="v">about ${NF.format(Math.round(I.eq*(c.form==='CV'?ownPct(c,'P'):1)/Math.max(100,equity(I.t)/I.t.shares)))} at ${rp(Math.max(100,equity(I.t)/I.t.shares))} each</span></div>`:''}`}
          <div class="row"><span class="k">Notary and ministry${I.appr?' + KJPP appraisal':''}</span><span class="v">${rp(I.fee)}</span></div>
          <div class="row"><span class="k">${esc(coName(c))} account</span><span class="v ${c.cash<I.fee?'down':''}">${rp(c.cash)}</span></div>
        </div>
      <p class="note ${chk?'down':''}">${chk?esc(chk):'Ready.'}</p>
      <div class="btns"><button class="btn pri" id="cv-go">${st.mode==='new'?'Convert to '+(st.form==='PTP'?'PT Perorangan':'PT'):'Put the business in'}</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ const g=q=>body.querySelector(q); if(g('#cv-name')) st.name=g('#cv-name').value; if(g('#cv-form')) st.form=g('#cv-form').value; if(g('#cv-partner')) st.partner=g('#cv-partner').value; if(g('#cv-pct')) st.pct=+g('#cv-pct').value||1; if(g('#cv-kom')) st.kom=g('#cv-kom').value; if(g('#cv-target')) st.target=g('#cv-target').value; };
    body.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ keep(); st.mode=b.dataset.mode; draw(el); });
    body.querySelectorAll('select,input[type=number]').forEach(x=>x.addEventListener('change',()=>{ keep(); draw(el); }));
    body.querySelector('#cv-go').onclick=()=>{ keep(); if(err(convertCo(c,st))) return; closeModal(); render(); };
  };
  openModal(`Turn ${coName(c)} into a PT`,'<div id="cv-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}

/* ---------- Moving your personal shares into one of your PTs */
const stakeFee=h=>Math.round(2e6*cpi(h)/1000)*1000;
function stakeBuyers(c){ return S.C.filter(y=>y!==c&&y.form==='PT'&&!isAncestor(c,y)); }
function stakeInfo(c,o){
  const y=acct(o.buyer), held=c.own.P||0, sh=Math.max(0,Math.min(held,Math.round(held*clamp(+o.pct||0,0,100)/100))), bv=c.tbk?c.tbk.px:Math.max(0,equity(c))/c.shares, val=sh*bv, fee=stakeFee(S.h);
  const nominal=sh*(c.paidIn/c.shares), gain=Math.max(0,val-nominal), tax=o.how==='cash'?Math.round(pit(yearOf(S.h),gain)):0;
  const bvY=y?shareVal(y):0, ns=y&&o.how==='swap'?Math.max(1,Math.round(val/bvY)):0;
  return {y,held,sh,bv,val,fee,nominal,gain,tax,bvY,ns};
}
function stakeCheck(c,o){
  if(c.form!=='PT') return `${coName(c)} is a ${c.form==='PTP'?'PT Perorangan, which can only be owned by one individual':c.form+', which has no shares to transfer'}.`;
  const I=stakeInfo(c,o);
  if(!I.held) return `You hold no shares in ${coName(c)}.`;
  if(!I.y) return 'Choose the PT that takes the shares.';
  if(I.y===c) return 'A company cannot hold its own shares here. Pick another PT.';
  if(I.y.form!=='PT') return `${coName(I.y)} is not a regular PT, so it cannot hold shares in another company.`;
  if(isAncestor(c,I.y)) return `${coName(c)} already owns ${coName(I.y)}, directly or through a subsidiary. Selling it your shares in ${coName(c)} would make the two companies own each other.`;
  if(!I.sh) return 'Choose how much of your stake to move.';
  if(I.val<=0) return `${coName(c)} has no positive equity, so its shares carry no value to sell. Use a swap only once it is worth something.`;
  if(o.how==='cash'&&I.y.cash<I.val+I.fee) return `${coName(I.y)} needs ${rp(I.val+I.fee)} (price ${rp(I.val)} plus notary ${rp(I.fee)}) and holds ${rp(I.y.cash)}. Move fewer shares, inject cash first, or swap for new shares instead.`;
  if(o.how==='swap'&&I.y.ipo) return `${coName(I.y)} is in registration for its IPO and cannot issue new shares until it lists.`;
  if(o.how==='swap'&&I.y.cash<I.fee) return `${coName(I.y)} needs ${rp(I.fee)} for the notary deed.`;
  if(o.how==='cash'&&S.P.cash<I.tax-I.val) return 'Not enough to pay the income tax on the gain.';
  return null;
}
function sellStake(c,o){
  const pre=stakeCheck(c,o); if(pre) return pre;
  const I=stakeInfo(c,o), y=I.y;
  y.cash-=I.fee; book(y,'opex',I.fee);
  c.own.P-=I.sh; if(c.own.P<=0) delete c.own.P; c.own[y.id]=(c.own[y.id]||0)+I.sh;
  if(o.how==='cash'){ y.cash-=I.val; S.P.cash+=I.val-I.tax; if(I.tax) expAdd('tax',I.tax); }
  else { y.shares+=I.ns; y.own.P=(y.own.P||0)+I.ns; y.paidIn+=I.val; }
  const top=Object.entries(c.own).filter(([k,v])=>v>0&&k!=='F'&&k!=='PUB').sort((a,b)=>b[1]-a[1])[0]; if(top) c.parent=top[0];
  updateLevel(y,true);
  logm(`You ${o.how==='cash'?'sold':'transferred'} ${NF.format(I.sh)} shares (${pc(I.sh/c.shares,1)}) of ${coName(c)} to ${coName(y)} at book value ${rp(I.val)}${o.how==='cash'?`, paid in cash${I.tax?`; income tax on the ${rp(I.gain)} gain ${rp(I.tax)}`:''}`:` in exchange for ${NF.format(I.ns)} new shares of ${coName(y)} (inbreng saham)`}. ${coName(y)} now holds ${pc(ownPct(c,y.id),1)} of ${coName(c)}. Notary fee ${rp(I.fee)}.`,'good');
  S.dirty=true; return null;
}
function stakeModal(cid){
  const c=acct(cid); if(!c) return;
  const buyers=stakeBuyers(c);
  if(err(c.form!=='PT'?stakeCheck(c,{}):!(c.own.P>0)?`You hold no shares in ${coName(c)}.`:!buyers.length?`You have no other regular PT that could take the shares. Found a PT first (it cannot be one that ${coName(c)} owns).`:null)) return;
  const st={buyer:buyers[0].id,pct:100,how:'swap'};
  const draw=el=>{
    const body=el.querySelector('#sk-body'), I=stakeInfo(c,st), chk=stakeCheck(c,st);
    body.innerHTML=`<p class="note">Move your personal shares in ${esc(coName(c))} into another PT you control, for example to put a holding company on top of your businesses. Shares change hands at book value (equity ÷ shares) by notarial deed. ${esc(coName(c))}'s units, staff and accounts stay where they are; only the owner changes.</p>
      <label class="f">Company that takes the shares<select id="sk-buyer">${buyers.map(y=>`<option value="${y.id}" ${y.id===st.buyer?'selected':''}>${esc(coName(y))} · account ${rp(y.cash)}${y.own.P>0?' · you hold '+pc(ownPct(y,'P'),0):''}</option>`).join('')}</select></label>
      <div class="fields"><label class="f">Share of your stake to move (%)<input type="number" id="sk-pct" min="1" max="100" value="${st.pct}"></label>
      <label class="f">Payment<select id="sk-how"><option value="swap" ${st.how==='swap'?'selected':''}>Swap for new shares in the buyer (inbreng saham)</option><option value="cash" ${st.how==='cash'?'selected':''}>Sale for cash from the buyer's account</option></select></label></div>
      <div class="rows">
        <div class="row"><span class="k">Shares moved</span><span class="v">${NF.format(I.sh)} of your ${NF.format(I.held)} · ${pc(I.sh/c.shares,1)} of ${esc(coName(c))}</span></div>
        <div class="row"><span class="k">Book value per share</span><span class="v">${rp(I.bv)}</span></div>
        <div class="row"><span class="k">Price</span><span class="v">${rp(I.val)}</span></div>
        ${st.how==='cash'?`<div class="row"><span class="k">Gain over the nominal value you paid in</span><span class="v">${rp(I.gain)}</span></div><div class="row"><span class="k">Your income tax on the gain (PPh 21 rates)</span><span class="v">${rp(I.tax)}</span></div><div class="row"><span class="k">Cash to your personal account</span><span class="v up">${rp(I.val-I.tax)}</span></div>`
          :`<div class="row"><span class="k">New shares for you in ${esc(I.y?coName(I.y):'')}</span><span class="v">${NF.format(I.ns)} at ${rp(I.bvY)} each</span></div><div class="row"><span class="k">Your stake in ${esc(I.y?coName(I.y):'')}</span><span class="v">${I.y?pc(ownPct(I.y,'P'),1)+' → '+pc(((I.y.own.P||0)+I.ns)/(I.y.shares+I.ns),1):''}</span></div>`}
        <div class="row"><span class="k">Notary deed, paid by the buyer</span><span class="v">${rp(I.fee)}</span></div>
        <div class="row"><span class="k">${esc(I.y?coName(I.y):'')} after the deal</span><span class="v">holds ${I.y?pc(((c.own[I.y.id]||0)+I.sh)/c.shares,1):''} of ${esc(coName(c))}</span></div>
      </div>
      <p class="note ${chk?'down':''}">${chk?esc(chk):'Ready.'}</p>
      <div class="btns"><button class="btn pri" id="sk-go">${st.how==='cash'?'Sell the shares':'Swap the shares'}</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ st.buyer=body.querySelector('#sk-buyer').value; st.pct=clamp(+body.querySelector('#sk-pct').value||0,0,100); st.how=body.querySelector('#sk-how').value; };
    body.querySelectorAll('select,input').forEach(x=>x.addEventListener('change',()=>{ keep(); draw(el); }));
    body.querySelector('#sk-go').onclick=()=>{ keep(); if(err(sellStake(c,st))) return; closeModal(); render(); };
  };
  openModal(`Transfer your shares · ${coName(c)}`,'<div id="sk-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}

function isAncestor(a,b){ const seen=new Set(); const walk=x=>{ for(const k in x.own){ if(!(x.own[k]>0)||k==='P'||k==='F') continue; if(k===a.id) return true; if(seen.has(k)) continue; seen.add(k); const p=acct(k); if(p&&walk(p)) return true; } return false; }; return walk(b); }
function mergeInfo(A,B){
  const eqB=equity(B), bv=shareVal(A), iss=[];
  for(const [k,v] of Object.entries(B.own)){ if(!(v>0)||k===A.id) continue; const pct=v/B.shares; iss.push({k,pct,ns:Math.max(0,Math.round(pct*eqB/bv))}); }
  let sev=0; for(const b of B.board) if(b.who!=='P'&&b.src==='pro') sev+=2*b.sal;
  return {eqB,bv,iss,sev,fee:mergeFee(S.h)};
}
function mergeCheck(A,B){
  if(!B||A===B) return 'Choose another company to merge in.';
  for(const x of [A,B]) if(x.form!=='PT') return `${coName(x)} is a ${x.form==='PTP'?'PT Perorangan':x.form}. Only regular PTs can merge (penggabungan, ${S.h<H_UU40?'UU 1/1995 Art. 102':'UU 40/2007 Art. 122'}).${x.form==='PTP'?' Convert it into a regular PT first.':' Use Convert to PT on its company page to bring the whole business into a PT.'}`;
  for(const x of [A,B]) if(x.ipo) return `${coName(x)} is in registration for its IPO; its structure is frozen until it lists.`;
  if(B.tbk) return `${coName(B)} is listed, with public shareholders. A listed company can absorb a private one, but not the other way round here.`;
  if(isAncestor(B,A)) return `${coName(B)} owns ${coName(A)}. A company cannot be merged into its own subsidiary here: open ${coName(B)} and absorb ${coName(A)} instead.`;
  return null;
}
function mergeCos(A,B,opt){
  const pre=opt?null:mergeCheck(A,B); if(pre) return pre;
  const I=mergeInfo(A,B); if(opt) I.fee=opt.fee||0;
  if(A.cash<I.fee+I.sev) return `Not enough in ${coName(A)}'s account. The merger needs ${rp(I.fee+I.sev)} (notary, newspaper announcement and ministry fees ${rp(I.fee)}${I.sev?`, plus ${rp(I.sev)} severance for ${coName(B)}'s professional board`:''}), but it holds ${rp(A.cash)}.`;
  A.cash-=I.fee+I.sev; book(A,'opex',I.fee); if(I.sev) book(A,'wage',I.sev);
  for(const x of I.iss){ A.own[x.k]=(A.own[x.k]||0)+x.ns; A.shares+=x.ns; }
  if(A.own[B.id]){ A.shares-=A.own[B.id]; delete A.own[B.id]; }
  A.cash+=B.cash; A.deps.push(...B.deps); (A.bonds||(A.bonds=[])).push(...(B.bonds||[])); A.loans.push(...B.loans); A.units.push(...B.units);
  for(const s in B.hold){ const a=A.hold[s]||(A.hold[s]={sh:0,cost:0}); a.sh+=B.hold[s].sh; a.cost+=B.hold[s].cost; }
  A.taxDue=(A.taxDue||0)+(B.taxDue||0); A.paidIn+=B.paidIn; A.retained+=B.retained; A.reserve=(A.reserve||0)+(B.reserve||0); A.pph23=(A.pph23||0)+(B.pph23||0);
  A.depts=A.depts||[]; for(const d of B.depts||[]){ d.jobs=d.jobs.filter(j=>!deptOf(A,j)); if(A.depts.some(x=>x.name===d.name)) d.name+=' ('+B.name+')'; A.depts.push(d); } A.divs=A.divs||[]; for(const v of B.divs||[]) if(v.reg!==A.reg&&!A.divs.some(x=>x.reg===v.reg)) A.divs.push(v); A.mfees={...(A.mfees||{}),...(B.mfees||{})}; delete A.mfees[A.id];
  if(A.prevTurnover!=null||B.prevTurnover!=null) A.prevTurnover=(A.prevTurnover||0)+(B.prevTurnover||0);
  for(const s of S.C){ if(s===B) continue; if(s.own[B.id]){ s.own[A.id]=(s.own[A.id]||0)+s.own[B.id]; delete s.own[B.id]; } if(s.parent===B.id) s.parent=A.id; }
  for(const o of S.orders) if(o.a===B.id) o.a=A.id;
  S.C.splice(S.C.indexOf(B),1); updateLevel(A,true);
  if(S.sel.co===B.id) S.sel.co=A.id; if(S.sel.acct===B.id) S.sel.acct=A.id;
  if(!opt) logm(`${coName(B)} merged into ${coName(A)} (penggabungan). All assets, ${B.units.length} business unit${B.units.length===1?'':'s'} and ${rp(debt(B))} of loans move across; ${coName(B)} ceases to exist.${I.iss.length?' New shares: '+I.iss.map(x=>`${acctName(x.k)} ${NF.format(x.ns)}`).join(', ')+'.':''} Fees ${rp(I.fee)}${I.sev?`, severance ${rp(I.sev)}`:''}.`,'good');
  return null;
}
function spinModal(cid,uid){
  const c=acct(cid), u=c.units.find(x=>x.id===uid); if(!u) return;
  if(err(spinCheck(c,u))) return;
  const b=BIZ[u.t], t=unitT12(u), fee=spinFee(S.h), law=lawPT(S.h);
  const town=REG[u.reg].n.replace(/^(Kab\.|Kota) /,'').split(' ')[0];
  const st={name:town+' '+b.n.split(' ').pop(),cash:Math.round(u.cap*0.1/1e6)*1e6,partner:'F',pct:1,dir:'',kom:''};
  const partners=['F','P',...S.C.filter(x=>x.form==='PT'&&x!==c).map(x=>x.id)];
  const draw=el=>{
    const body=el.querySelector('#sp-body'), pct=clamp(st.pct/100,0.01,0.49), total=(u.book+st.cash)/(1-pct), pcap=total*pct;
    const tmp={id:'C'+S.nid,reg:c.reg,hired:[],level:sizeOf(total,0,S.h)}, dc=candidates(tmp,'dir'), kc=candidates(tmp,'kom');
    const candOpt=(x,sel)=>`<option value="${x.key}" ${sel===x.key?'selected':''}>${x.src==='pro'?'Professional':'Family'} · ${esc(x.name)}, ${esc(x.bg.toLowerCase())} · skill ${x.skill} · ${refBand(x.integ)[0].toLowerCase()} · ${rp(x.sal)}/mo${x.fee?' + fee '+rp(x.fee):''}</option>`;
    const pName=p=>p==='F'?'Your family':p==='P'?'You personally':coName(acct(p));
    body.innerHTML=`<p class="note">${b.n} in ${esc(REG[u.reg].n)} made ${rp(t.net)} over the last ${t.n} months. Spinning it off creates a new PT controlled by ${esc(coName(c))}. The unit moves at book value with its staff and stock. A PT needs a second shareholder, who pays cash in for their stake.</p>
      <label class="f">Name of the new PT<input type="text" id="sp-name" maxlength="40" value="${esc(st.name)}"></label>
      <label class="f">Working capital from ${esc(coName(c))}<input type="number" id="sp-cash" min="0" step="1000000" value="${st.cash}"></label>
      <div class="eyebrow">Shareholders</div>
      <div class="fields">
        <label class="f">Second shareholder<select id="sp-partner">${partners.map(p=>`<option value="${p}" ${p===st.partner?'selected':''}>${esc(pName(p))}${p==='F'?'':' · account '+rp(acct(p).cash)}</option>`).join('')}</select></label>
        <label class="f">Their share (%)<input type="number" id="sp-pct" min="1" max="49" value="${st.pct}"></label>
      </div>
      <div class="eyebrow">Direksi & dewan komisaris</div>
      <label class="f">Direktur Utama<select id="sp-dir"><option value="">Choose…</option><option value="P" ${st.dir==='P'?'selected':''}>Me, ${esc(S.name)}</option>${dc.map(x=>candOpt(x,st.dir)).join('')}</select></label>
      <label class="f">Komisaris<select id="sp-kom"><option value="">Choose…</option><option value="P" ${st.kom==='P'?'selected':''}>Me, ${esc(S.name)}</option><option value="MOM" ${st.kom==='MOM'?'selected':''}>${esc(momName(tmp.id))}, your mother · skill 40 · unpaid</option>${kc.map(x=>candOpt(x,st.kom)).join('')}</select></label>
      <p class="note">One person cannot hold both seats. Professionals charge a headhunter fee of two months' pay, paid from the new PT's cash. With ${rp(total)} of capital it starts as a Usaha ${LEVELS[tmp.level].n}, which draws professionals up to about skill ${LEVELS[tmp.level].tal.cap}.</p>
      <div class="rows">
        <div class="row"><span class="k">Unit at book value</span><span class="v">${rp(u.book)}</span></div>
        <div class="row"><span class="k">Paid-up capital</span><span class="v">${rp(total)}</span></div>
        <div class="row"><span class="k">${esc(coName(c))} / ${esc(pName(st.partner))}</span><span class="v">${pc(1-pct,0)} / ${pc(pct,0)} · they pay ${rp(pcap)}</span></div>
        <div class="row"><span class="k">Notary, ministry and announcement fees</span><span class="v">${rp(fee)}</span></div>
        <div class="row"><span class="k">Minimum paid-up capital</span><span class="v">${law.minPaid?rp(law.minPaid,true):'Set by founders'}</span></div>
        <div class="row"><span class="k">${esc(coName(c))} account</span><span class="v">${rp(c.cash)}</span></div>
      </div>
      <div class="btns"><button class="btn pri" id="sp-go">Spin off</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ st.name=body.querySelector('#sp-name').value; st.cash=+body.querySelector('#sp-cash').value||0; st.partner=body.querySelector('#sp-partner').value; st.pct=+body.querySelector('#sp-pct').value||1; st.dir=body.querySelector('#sp-dir').value; st.kom=body.querySelector('#sp-kom').value; };
    ['#sp-cash','#sp-partner','#sp-pct'].forEach(q=>body.querySelector(q).addEventListener('change',()=>{ keep(); draw(el); }));
    body.querySelector('#sp-go').onclick=()=>{ keep(); const r=spinOff(c,u,st); if(err(r)) return; closeModal(); S.tab='biz'; render(); };
  };
  openModal(`Spin off · ${b.n}`,'<div id="sp-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function inbrengModal(cid,uid){
  const c=acct(cid), u=c.units.find(x=>x.id===uid); if(!u) return;
  const ts=inbrengTargets(c), b=BIZ[u.t], fee=kjppNeed(u.book)?kjppFee(S.h):0;
  if(!ts.length) return err(c.form==='PT'?`${coName(c)} has no subsidiary PT to receive the unit. Found one first with "Found a subsidiary", then transfer the unit into it.`:`You hold shares in no PT that could receive the unit. Found a PT first, then transfer the unit into it.`);
  const draw=el=>{
    const body=el.querySelector('#ib-body'), tid=body.dataset.t||ts[0].id, t=acct(tid), holder=c.form==='PT'?c.id:'P', bv=shareVal(t), ns=Math.max(1,Math.round(u.book/bv)), after=((t.own[holder]||0)+ns)/(t.shares+ns);
    body.innerHTML=`<p class="note">Inbreng moves the unit into another company as a capital contribution. ${fee?'An independent appraiser (KJPP) values it':'It is small enough for the notary to value from the books, so no KJPP appraisal is needed'}, and the receiving PT issues new shares to ${holder==='P'?'you':esc(coName(c))} in return. Staff, stock and any crop in progress move with it.</p>
      <label class="f">Receiving company<select id="ib-t">${ts.map(x=>`<option value="${x.id}" ${x.id===tid?'selected':''}>${esc(coName(x))}</option>`).join('')}</select></label>
      <div class="rows">
        <div class="row"><span class="k">Appraised value (book)</span><span class="v">${rp(u.book)}</span></div>
        <div class="row"><span class="k">New shares at ${rp(bv)} each</span><span class="v">${NF.format(ns)}</span></div>
        <div class="row"><span class="k">${esc(acctName(holder))} stake in ${esc(coName(t))}</span><span class="v">${pc(ownPct(t,holder),1)} → ${pc(after,1)}</span></div>
        <div class="row"><span class="k">KJPP appraisal fee</span><span class="v">${fee?rp(fee):'Not needed'}</span></div>${c.form!=='PT'?`<p class="note">To move the whole ${c.form} at once, use <b>Convert to PT</b> on the company page.</p>`:''}
      </div>
      <div class="btns"><button class="btn pri" id="ib-go">Transfer by inbreng</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#ib-t').onchange=e=>{ body.dataset.t=e.target.value; draw(el); };
    body.querySelector('#ib-go').onclick=()=>{ if(err(inbreng(c,u,tid))) return; closeModal(); render(); };
  };
  openModal(`Inbreng · ${b.n} in ${REG[u.reg].n}`,'<div id="ib-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function mergeModal(cid){
  const A=acct(cid), others=S.C.filter(x=>x!==A);
  if(!others.length) return err('You have only one company. Found or spin off another before you can merge.');
  if(A.form!=='PT') return err(mergeCheck(A,others[0])||'Only regular PTs can merge.');
  const draw=el=>{
    const body=el.querySelector('#mg-body'), bid=body.dataset.b||(others.find(x=>x.form==='PT'&&!isAncestor(x,A))||others[0]).id, B=acct(bid), chk=mergeCheck(A,B), I=chk?null:mergeInfo(A,B);
    body.innerHTML=`<p class="note">${esc(coName(A))} absorbs the other company. Everything it owns and owes moves across, its board steps down, and its other shareholders receive new ${esc(coName(A))} shares in proportion to its book equity.</p>
      <label class="f">Company to absorb<select id="mg-b">${others.map(x=>`<option value="${x.id}" ${x.id===bid?'selected':''}>${esc(coName(x))}</option>`).join('')}</select></label>
      ${chk?`<div class="alert" role="alert"><b>Not possible</b>${esc(chk)}</div>`:`<div class="rows">
        <div class="row"><span class="k">Book equity of ${esc(coName(B))}</span><span class="v">${rp(I.eqB)}</span></div>
        <div class="row"><span class="k">Business units moving</span><span class="v">${B.units.length}</span></div>
        <div class="row"><span class="k">Loans moving</span><span class="v">${rp(debt(B))}</span></div>
        <div class="row"><span class="k">New shares issued</span><span class="v wrap">${I.iss.length?I.iss.map(x=>`${esc(acctName(x.k))} ${NF.format(x.ns)}`).join(', '):'None: you already own all of it through '+esc(coName(A))}</span></div>
        <div class="row"><span class="k">Fees${I.sev?' and board severance':''}</span><span class="v">${rp(I.fee+I.sev)}</span></div>
        <div class="row"><span class="k">${esc(coName(A))} account</span><span class="v ${A.cash<I.fee+I.sev?'down':''}">${rp(A.cash)}</span></div>
      </div>`}
      <div class="btns"><button class="btn pri" id="mg-go">Merge into ${esc(coName(A))}</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#mg-b').onchange=e=>{ body.dataset.b=e.target.value; draw(el); };
    body.querySelector('#mg-go').onclick=()=>{ if(err(mergeCos(A,B))) return; closeModal(); render(); };
  };
  openModal(`Merge into ${coName(A)}`,'<div id="mg-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function alertBox(msg){
  const m=document.querySelector('#scrim .modal > .panel-b');
  if(m){ m.querySelector(':scope > .alert')?.remove(); m.insertAdjacentHTML('afterbegin',`<div class="alert" role="alert"><b>Can't do that</b>${esc(msg)}</div>`); document.getElementById('scrim').scrollTop=0; return; }
  openModal('Can’t do that',`<div class="alert" role="alert">${esc(msg)}</div><div class="btns"><button class="btn pri" data-act="close">OK</button></div>`);
}


/* ============================================================
   RUPS · annual meeting proposes and pays dividends
   ============================================================ */
const meetName=c=>c.form==='PT'||c.form==='PTP'?'RUPS Tahunan':c.form==='CV'?'Rapat sekutu':'Annual closing';
const RUPS_DEF=()=>({month:5,pay:0.5,res:3,auto:true});
function nextRups(c){ const y=yearOf(S.h); let t=hOf(y,c.rups.month,20); if(S.h>=t) t=hOf(y+1,c.rups.month,20); return t; }
function rupsProposal(c){
  const P=c.ytdPrev, net=P?netOf(P):0, costs=P?Math.max(0,P.rev-net)/12:0, keep=c.rups.res*costs;
  const want=Math.max(0,net)*c.rups.pay, room=Math.max(0,c.cash-keep), alloc=(c.form==='PT'||c.form==='PTP')&&net>0?Math.max(0,Math.min(0.1*net,0.2*c.paidIn-(c.reserve||0),c.retained-(c.reserve||0))):0, dist=Math.max(0,distributable(c)-alloc);
  const amt=Math.max(0,Math.floor(Math.min(want,room,dist)/1e5)*1e5);
  let lim=null; if(want>0&&amt<want-1e5) lim=dist<=room?(c.form==='UD'?'the account balance':c.form==='CV'?'retained profit':'retained earnings after the 20% statutory reserve'):`the cash reserve of ${rp(keep)} you asked to keep`;
  return {fy:P?.y, net, want, amt, keep, lim};
}
function rupsRun(c){
  const p=rupsProposal(c);
  if(!p.fy){ logm(`${meetName(c)} of ${coName(c)}: no full financial year yet, nothing to decide.`); return; }
  if(c.rups.auto){ rupsApprove(c,p.amt,true); return; }
  c.rupsPend=p; S.paused=true; syncSpeed(); S.dirty=true;
  logm(`${meetName(c)} of ${coName(c)} is convened and waits for your vote: proposed ${c.form==='UD'?'withdrawal':'dividend'} ${rp(p.amt)}.`,'news');
  toast(meetName(c),`${coName(c)} needs your vote on FY ${p.fy}.`);
  setTimeout(()=>{ if(c.rupsPend&&!document.getElementById('scrim')) rupsModal(c.id); },60);
}
function rupsApprove(c,amt,auto){
  const fy=c.ytdPrev?.y, net=c.ytdPrev?netOf(c.ytdPrev):0;
  amt=Math.max(0,+amt||0);
  let alloc=0;
  if((c.form==='PT'||c.form==='PTP')&&net>0){ alloc=Math.max(0,Math.min(0.1*net,0.2*c.paidIn-(c.reserve||0),c.retained-(c.reserve||0))); }
  if(amt>0&&amt>distributable(c)-alloc+1) return `At most ${rp(Math.max(0,distributable(c)-alloc))} can be paid out after this year's ${rp(alloc)} transfer to the statutory reserve.`;
  if(alloc>0) c.reserve=(c.reserve||0)+alloc;
  if(amt>0){ const e=payDividend(c,amt); if(e) return e; }
  c.rupsPend=null; c.rupsLast={fy,amt,net,h:S.h}; if(c.tbk) tbkAfterRups(c,amt,net);
  logm(`${meetName(c)} of ${coName(c)}${auto?' (standing policy)':''}: FY ${fy} accounts approved, net profit ${rp(net)}${alloc>0?`, ${rp(alloc)} to the statutory reserve`:''}. ${amt>0?`${c.form==='UD'?'Withdrawal':'Dividend'} of ${rp(amt)} (${net>0?pc(amt/net,0):'—'} of profit); the rest is retained.`:'No payout; all profit is retained.'}`,amt>0?'good':'');
  S.dirty=true; return null;
}
function rupsModal(cid){
  const c=acct(cid), p=c.rupsPend||rupsProposal(c);
  if(!c.rupsPend) return err(`${coName(c)} has no meeting waiting for a decision. The next ${meetName(c)} is on ${fdate(nextRups(c))}.`);
  openModal(`${meetName(c)} · ${coName(c)} · FY ${p.fy}`,`
    <div class="rows">
      <div class="row"><span class="k">Net profit FY ${p.fy}</span><span class="v ${cls(p.net)}">${rp(p.net)}</span></div>
      <div class="row"><span class="k">Policy: pay out ${pc(c.rups.pay,0)}, keep ${c.rups.res} months of costs</span><span class="v">${rp(p.want)}</span></div>
      <div class="row"><span class="k">Distributable now</span><span class="v">${rp(distributable(c))}</span></div>
      <div class="row"><span class="k">Company account</span><span class="v">${rp(c.cash)}</span></div>
    </div>
    ${p.lim?`<p class="note warn">The proposal is capped by ${esc(p.lim)}.</p>`:''}
    <label class="f">${c.form==='UD'?'Withdrawal':'Dividend'} to approve<input type="number" id="rp-amt" min="0" step="100000" value="${p.amt}"></label>
    <p class="note">Shareholders: ${companyOwners(c).map(o=>`${esc(acctName(o.k))} ${pc(o.pct,1)}`).join(', ')}.</p>
    <div class="btns"><button class="btn pri" id="rp-go">Approve</button><button class="btn" id="rp-none">Retain everything</button></div>`,el=>{
    el.querySelector('#rp-go').onclick=()=>{ if(err(rupsApprove(c,+el.querySelector('#rp-amt').value))) return; closeModal(); render(); };
    el.querySelector('#rp-none').onclick=()=>{ rupsApprove(c,0); closeModal(); render(); };
  });
}
function rupsBlock(c){
  const mn=meetName(c);
  return `<div class="eyebrow">${mn}${c.form==='PT'||c.form==='PTP'?' · within six months of year end (UU 40/2007 Art. 78)':''}</div>
    <div class="fields">
      <label class="f">Held on 20<select id="rp-m-${c.id}" data-chg="rups" data-id="${c.id}" data-k="month">${BULAN.slice(0,6).map((b,i)=>`<option value="${i}" ${c.rups.month===i?'selected':''}>${b}</option>`).join('')}</select></label>
      <label class="f">Payout of last year's profit (%)<input type="number" id="rp-p-${c.id}" data-chg="rups" data-id="${c.id}" data-k="pay" min="0" max="100" step="5" value="${Math.round(c.rups.pay*100)}"></label>
      <label class="f">Cash reserve (months of costs)<input type="number" id="rp-r-${c.id}" data-chg="rups" data-id="${c.id}" data-k="res" min="0" max="24" step="1" value="${c.rups.res}"></label>
    </div>
    <label class="check"><input type="checkbox" id="rp-a-${c.id}" data-chg="rups" data-id="${c.id}" data-k="auto" ${c.rups.auto?'checked':''}> Approve the proposal automatically (standing policy)</label>
    ${LH(()=>{ if(c.rupsPend) return `<div class="callout" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">${mn} for FY ${c.rupsPend.fy} is waiting for your vote. <button class="btn pri sm" data-act="rups" data-id="${c.id}">Vote now</button></div>`;
      const p=rupsProposal(c); return `<p class="note">Next ${mn}: <b>${fdate(nextRups(c))}</b>. ${p.fy?`On FY ${p.fy} (net ${rp(p.net)}) today's proposal would be <b>${rp(p.amt)}</b>${p.lim?`, capped by ${esc(p.lim)}`:''}.`:'The first full financial year is still running.'}${c.rupsLast?` Last meeting: ${rp(c.rupsLast.amt)} for FY ${c.rupsLast.fy}.`:''}</p>`; })}`;
}

/* ---------- Board pay */
function effInteg(b){ const r=b.mkt>0?b.sal/b.mkt:1; return clamp(b.integ+clamp((r-1)*40,-30,10),0,100); }

/* ---------- Moving the home base */
const moveFee=h=>Math.round(25e6*cpi(h)/1000)*1000;
function domFee(c,h){ return c.form==='PTP'?50000:Math.round({UD:0.5e6,CV:3e6,PT:6e6}[c.form]*cpi(h)/1000)*1000; }
function withHome(reg,fn){ const o=S.home; S.home=reg; try{ return fn(); } finally{ S.home=o; } }
const attnF=c=>c&&c.reg?1-Math.min(0.4,km(S.home,c.reg)/5000):1;
function avgAttn(){ const cs=S.C.filter(c=>onBoard(c,'P','dir')); return cs.length?cs.reduce((s,c)=>s+attnF(c),0)/cs.length:1; }
function moveHome(reg){
  if(!REG[reg]) return 'Choose a regency.';
  if(reg===S.home) return `${REG[reg].n} is already your home base.`;
  if(S.lastMove&&S.h-S.lastMove<8766) return `You moved house on ${fdate(S.lastMove)}. The game allows one move a year; next possible on ${fdate(S.lastMove+8766)}.`;
  const fee=moveFee(S.h);
  if(S.P.cash<fee) return `Not enough money to move. Relocating your household costs ${rp(fee)}, and your personal account holds ${rp(S.P.cash)}.`;
  const from=S.home, d=km(from,reg);
  S.P.cash-=fee; S.home=reg; S.lastMove=S.h;
  logm(`You moved your home from ${REG[from].n} to ${REG[reg].n}, ${provOf(reg)} (${NF.format(d)} km), for ${rp(fee)}. Your companies keep their registered offices.`,'good');
  S.dirty=true; return null;
}
function relocateCo(c,reg){
  if(!REG[reg]) return 'Choose a regency.';
  if(reg===c.reg) return `${coName(c)} is already registered in ${REG[reg].n}.`;
  if(c.lastMove&&S.h-c.lastMove<8766) return `${coName(c)} moved its office on ${fdate(c.lastMove)}. Changing a domicile needs a new deed${c.form==='PT'?' and ministry approval':''}, so the game allows one move a year; next possible on ${fdate(c.lastMove+8766)}.`;
  const fee=domFee(c,S.h)+Math.round(15e6*cpi(S.h)/1000)*1000;
  if(c.cash<fee) return `Not enough in ${coName(c)}'s account to relocate its office: ${rp(fee)} needed for the deed and the move, ${rp(c.cash)} available.`;
  const from=c.reg; c.cash-=fee; book(c,'opex',fee); c.reg=reg; c.lastMove=S.h;
  logm(`${coName(c)} moved its registered office from ${REG[from].n} to ${REG[reg].n}${c.form==='PT'?', approved by the Ministry of Law and Human Rights':''}. Cost ${rp(fee)}.`,'good');
  S.dirty=true; return null;
}
function placeModal(title,start,info,go,label){
  const st={reg:start,p:REG[start].prov};
  const draw=el=>{
    const body=el.querySelector('#mv-body'), r=REG[st.reg];
    body.innerHTML=`<div class="fields">
        <label class="f">Province<select id="mv-prov">${PROVS.map(p=>`<option ${p===st.p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="f">Regency<select id="mv-reg">${regsIn(st.p).map(k=>`<option value="${k}" ${k===st.reg?'selected':''}>${esc(REG[k].n)}${k===start?' (current)':''}</option>`).join('')}</select></label>
      </div>
      <p class="note">${esc(TYPE_N[r.type])} · ${NF.format(km(start,st.reg))} km from ${esc(REG[start].n)} · UMR ${rp(umr(st.reg,S.h),true)} · specialties: ${specChips(r)}</p>
      ${info(st.reg)}
      <div class="btns"><button class="btn pri" id="mv-go">${label} ${esc(r.n)}</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#mv-prov').onchange=e=>{ st.p=e.target.value; st.reg=regsIn(st.p)[0]; draw(el); };
    body.querySelector('#mv-reg').onchange=e=>{ st.reg=e.target.value; draw(el); };
    body.querySelector('#mv-go').onclick=()=>{ if(err(go(st.reg))) return; closeModal(); render(); };
  };
  openModal(title,'<div id="mv-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function moveModal(){
  placeModal('Move your home',S.home,reg=>{ const lcN=livingCost(S.h), lcT=withHome(reg,()=>livingCost(S.h)), aN=avgAttn(), aT=withHome(reg,avgAttn);
    return `<p class="note">Your home sets your living costs and how well you can direct companies whose offices are far away. Companies keep their own registered offices.</p><div class="rows">
      <div class="row"><span class="k">Living costs</span><span class="v ${lcT<lcN?'up':lcT>lcN?'down':''}">${rp(lcN)} → ${rp(lcT)} / month</span></div>
      <div class="row"><span class="k">Your effectiveness as director (average)</span><span class="v ${aT>aN?'up':aT<aN?'down':''}">${pc(aN,0)} → ${pc(aT,0)}</span></div>
      <div class="row"><span class="k">Moving your household</span><span class="v">${rp(moveFee(S.h))}</span></div></div>`; }, moveHome,'Move to');
}
const renameFee=(c,h)=>c.form==='PTP'?50000:Math.round({UD:0.3e6,CV:2e6,PT:4e6}[c.form]*cpi(h)/1000)*1000;
function renameCo(c,name){
  name=(name||'').trim();
  if(!name) return 'Enter the new name.';
  if(name.length<3) return 'A company name needs at least three letters.';
  if(name.toLowerCase()===c.name.toLowerCase()) return `${coName(c)} already has that name.`;
  if(S.C.some(x=>x!==c&&x.name.toLowerCase()===name.toLowerCase())) return `You already have a company called ${name}. Pick another name.`;
  const fee=renameFee(c,S.h);
  if(c.cash<fee) return `Not enough in ${coName(c)}'s account to change its name: ${rp(fee)} needed for the ${c.form==='UD'?'new trade registration':'notarial deed amending the articles'}, ${rp(c.cash)} available.`;
  const old=coName(c); c.cash-=fee; book(c,'opex',fee); c.name=name;
  logm(`${old} is now ${coName(c)}. ${c.form==='PT'?'Name reserved online and the amended articles approved by the Ministry of Law and Human Rights':c.form==='PTP'?'Statement of amendment registered online':c.form==='CV'?'Deed amended before a notary':'Trade registration updated'}; cost ${rp(fee)}.`,'good');
  S.dirty=true; return null;
}
function renameModal(cid){
  const c=acct(cid), fee=renameFee(c,S.h);
  openModal(`Rename ${coName(c)}`,`<label class="f">New name<input type="text" id="rn-name" maxlength="40" value="${esc(c.name)}"></label>
    <p class="note">The ${FORMS[c.form].short} prefix stays. ${c.form==='PT'?`A PT name must be reserved with the ministry and written into amended articles.`:c.form==='CV'?'A CV changes its name by notarial deed.':c.form==='PTP'?'A PT Perorangan files a statement of amendment online.':'A UD only updates its trade registration.'} Cost: <b>${rp(fee)}</b> from the company account (${rp(c.cash)}).</p>
    <div class="btns"><button class="btn pri" id="rn-go">Rename</button><button class="btn" data-act="close">Cancel</button></div>`,el=>{
    const inp=el.querySelector('#rn-name'); inp.focus(); inp.select();
    const go=()=>{ if(err(renameCo(c,inp.value))) return; closeModal(); render(); };
    el.querySelector('#rn-go').onclick=go; inp.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
  });
}
function relocateModal(cid){
  const c=acct(cid);
  placeModal(`Move the office · ${coName(c)}`,c.reg,reg=>{ const o=c.reg; const now=c.units.reduce((s,u)=>s+monCost(c,u),0); c.reg=reg; const then=c.units.reduce((s,u)=>s+monCost(c,u),0), a=attnF(c); c.reg=o;
    return `<p class="note">The registered office is where the company is managed from. Its business units are monitored from here.</p><div class="rows">
      <div class="row"><span class="k">Monitoring, ${c.units.length} unit${c.units.length===1?'':'s'}</span><span class="v ${then<now?'up':then>now?'down':''}">${rp(now)} → ${rp(then)} / month</span></div>
      <div class="row"><span class="k">Your effectiveness as its director</span><span class="v">${pc(attnF(c),0)} → ${pc(a,0)}</span></div>
      <div class="row"><span class="k">Deed and move</span><span class="v">${rp(domFee(c,S.h)+Math.round(15e6*cpi(S.h)/1000)*1000)}</span></div>
      <div class="row"><span class="k">Company account</span><span class="v">${rp(c.cash)}</span></div></div>`; }, reg=>relocateCo(c,reg),'Move office to');
}


