'use strict';
/* ============================================================
   UI: live bindings, render, events
   ============================================================ */
const app=document.getElementById('app');
let LV=new Map(), LVel=new Map(), lvScope='a', lvN=0;
function L(fn,tag='span',cls=''){ const id=lvScope+(lvN++); LV.set(id,{fn,h:false}); return `<${tag} class="${cls}" data-l="${id}"></${tag}>`; }
function LH(fn,tag='div',cls=''){ const id=lvScope+(lvN++); LV.set(id,{fn,h:true}); return `<${tag} class="${cls}" data-l="${id}"></${tag}>`; }
function clearLive(scope){ for(const k of [...LV.keys()]) if(k[0]===scope){ LV.delete(k); LVel.delete(k); } }
function liveTick(){
  for(const [id,o] of LV){
    let el=LVel.get(id); if(!el||!el.isConnected){ el=document.querySelector(`[data-l="${id}"]`); if(!el){ continue; } LVel.set(id,el); }
    let v; try{ v=o.fn(); }catch(e){ v='—'; }
    if(o.h){ if(el._v!==v){ el.innerHTML=v; el._v=v; } continue; }
    let t=v, c=null; if(Array.isArray(v)){ t=v[0]; c=v[1]; }
    if(el._v!==t){ el.textContent=t; el._v=t; }
    if(c!==null && el._c!==c){ el.classList.remove('up','down','warn','muted'); if(c) el.classList.add(c); el._c=c; }
  }
}
const cls = v => v>0?'up':v<0?'down':'';

function shell(){
  clearLive('s'); lvScope='s';
  app.innerHTML=`
  <header class="bar" id="bar"><div class="bar-in">
    <div class="brand">Juragan<small>${esc(S.name)}</small></div>
    <div class="clock">${L(()=>{const d=dOf(S.h);return HARI[d.getUTCDay()]+', '+d.getUTCDate()+' '+BULAN[d.getUTCMonth()]+' '+d.getUTCFullYear();},'b')}${L(()=>{const d=dOf(S.h);return String(d.getUTCHours()).padStart(2,'0')+':00 WIB · '+(isOpen(S.h)?'market open':'market closed');})}</div>
    <div class="speed" role="group" aria-label="Game speed">
      <button data-act="speed" data-v="0" aria-label="Pause">❚❚</button>
      ${SPEEDS.map(([v,l,t])=>`<button data-act="speed" data-v="${v}" title="${t}">${l}</button>`).join('')}
    </div>
    <div class="bar-stats">
      <div><span>Personal account</span>${L(()=>[rp(S.P.cash),S.P.cash<0?'down':''],'b')}</div>
      <div class="bar-ihsg"><span>IHSG</span>${L(()=>{const q=quote('IHSG',S.h),p=prevClose('IHSG',S.h);return [q.toLocaleString('id-ID',{maximumFractionDigits:0})+' '+sgn(q/p-1,x=>pc(x,1)),cls(q-p)];},'b')}</div>
      <div><span>Net worth</span>${L(()=>rp(nwP()),'b')}</div>
      <button class="icon-btn" data-act="theme" title="Light or dark theme" aria-label="Switch between light and dark theme">◐</button>
      <button class="icon-btn" data-act="menu">Save &amp; game</button>
    </div>
  </div></header>
  <nav class="tabs" aria-label="Sections"><div class="tabs-in" role="tablist">
    ${[['home','Overview'],['biz','Companies'],['rep','Reports'],['map','Regions'],['bank','Bank'],['market','Stock market'],['law','Law & rates'],['log','Ledger']].map(([k,l])=>`<button role="tab" data-act="tab" data-v="${k}">${l}</button>`).join('')}
  </div></nav>
  <main id="main"></main>`;
  lvScope='a'; syncSpeed();
  const bar=document.getElementById('bar'); const setH=()=>document.documentElement.style.setProperty('--barh',bar.offsetHeight+'px'); setH(); new ResizeObserver(setH).observe(bar);
}
const SPEEDS=[[1,'1×','1 second = 1 hour'],[6,'6×','1 second = 6 hours'],[24,'24×','1 second = 1 day'],[168,'168×','1 second = 1 week']];
function syncSpeed(){ document.querySelectorAll('[data-act="speed"]').forEach(b=>b.setAttribute('aria-pressed', String(S.paused? b.dataset.v==='0' : +b.dataset.v===S.speed))); document.querySelectorAll('[data-act="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v===S.tab))); }

function render(){
  if(!S){ renderSetup(); return; }
  if(!document.getElementById('main')) shell();
  clearLive('a'); lvScope='a';
  const main=document.getElementById('main');
  main.innerHTML=({home:vHome,biz:vBiz,rep:vRep,map:vRegions,bank:vBank,market:vMarket,law:vLaw,log:vLog}[S.tab]||vHome)();
  if(S.over){ const f=S.final||finalEval(); main.insertAdjacentHTML('afterbegin',`<section class="panel"><div class="panel-h"><h2>Final tally</h2><button class="btn sm pri" data-act="newgame">Start a new game</button></div><div class="panel-b"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div><div class="eyebrow">Your standing</div><div class="big" style="font-size:2rem">${esc(f.rank)}</div><div class="note">${esc(f.rankTxt)}</div></div><p class="note" style="margin:0">${esc(S.overWhy||'')} After ${f.yrs.toLocaleString('id-ID',{maximumFractionDigits:1})} years your net worth is <b>${rp(f.nw)}</b> on ${rp(f.contrib)} of your parents' money. In deposito it would be ${rp(f.b.dep)}, in the IHSG ${rp(f.b.ihsg)}, and just keeping up with inflation means ${rp(f.b.inf)}. You finished at ${f.r.toLocaleString('id-ID',{maximumFractionDigits:2})}× the deposito benchmark.</p></div></div></section>`); }
  syncSpeed(); liveTick(); drawCharts(); S.dirty=false;
}

/* ---------- Overview */
function vHome(){
  const has=S.C.length>0, H=REG[S.home];
  return `
  ${LH(()=>{const p=S.C.filter(c=>c.rupsPend);return p.length?`<div class="callout" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><b>Meetings waiting for your vote:</b>${p.map(c=>`<button class="btn sm pri" data-act="rups" data-id="${c.id}">${esc(meetName(c))} · ${esc(coName(c))}</button>`).join('')}</div>`:'';})}
  <section class="hero">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="eyebrow">Net worth, ${esc(S.name)} · ${esc(H.n)}</div>
      ${L(()=>rp(nwP(),true),'div','big')}
      <div class="note">${L(()=>{const v=nwP()-S.bench.contrib;return [sgn(v,x=>rp(x))+' on your parents\' capital',cls(v)];})} · ${rp(S.capital0,true)} from your parents on ${fdate(S.start)}</div>
      <div class="note">${L(()=>{ const c=cpi(S.h)/cpi(S.start); return `In ${yearOf(S.start)} rupiah: ${rp(nwP()/c)} (prices up ${pc(c-1,0)} since you started)`; })}</div>
    </div>
    <div class="panel"><div class="panel-b"><canvas class="chart" data-chart="nw" aria-label="Net worth over time"></canvas></div></div>
  </section>
  <div class="grid3">
    <section class="panel"><div class="panel-h"><h3>Where your money sits</h3><span class="eyebrow">Personal</span></div>
      <div class="panel-b"><div class="rows">
        <div class="row"><span class="k">Bank account</span>${L(()=>[rp(S.P.cash),S.P.cash<0?'down':''],'span','v')}</div>
        <div class="row"><span class="k">Deposito</span>${L(()=>rp(depSum(S.P)),'span','v')}</div>
        <div class="row"><span class="k">Shares (market value)</span>${L(()=>rp(holdMV(S.P)),'span','v')}</div>
        <div class="row"><span class="k">Government bonds</span>${L(()=>rp(bondMV(S.P)),'span','v')}</div>
        <div class="row"><span class="k">Stakes in your companies</span>${L(()=>rp(stakesP()),'span','v')}</div>
        <div class="row"><span class="k">Personal loans</span>${L(()=>[debt(S.P)?'−'+rp(debt(S.P)).replace('−',''):rp(0),debt(S.P)?'down':''],'span','v')}</div>
        <div class="row total"><span class="k">Net worth</span>${L(()=>rp(nwP()),'span','v')}</div>
      </div>
      ${S.living?`<p class="note">Living costs in ${esc(H.n)}: ${L(()=>rp(livingCost(S.h)))} a month, debited on the 1st.</p>`:''}
      </div></section>
    <section class="panel"><div class="panel-h"><h3>Your group</h3><button class="btn ghost sm" data-act="movehome">Move home</button></div>
      <div class="panel-b"><div class="rows">
        <div class="row"><span class="k">Companies · business units</span>${L(()=>S.C.length+' · '+S.C.reduce((n,c)=>n+c.units.length,0),'span','v')}</div>
        <div class="row"><span class="k">Provinces</span>${L(()=>String(new Set(S.C.flatMap(c=>c.units.map(u=>provOf(u.reg)))).size),'span','v')}</div>
        <div class="row"><span class="k">Workers on payroll</span>${L(()=>NF.format(S.C.reduce((n,c)=>n+c.units.reduce((m,u)=>m+u.w,0),0)),'span','v')}</div>
        <div class="row"><span class="k">Units ready to spin off</span>${L(()=>{const n=S.C.filter(c=>c.form==='PT').reduce((n,c)=>n+c.units.filter(u=>!spinReady(u)).length,0);return [String(n),n?'up':''];},'span','v')}</div>
        <div class="row"><span class="k">Listed companies · market value</span>${L(()=>{const t=S.C.filter(c=>c.tbk);return t.length?t.length+' · '+rp(t.reduce((s,c)=>s+mcap(c),0)):'none yet';},'span','v')}</div>
        <div class="row"><span class="k">Same money in deposito</span>${L(()=>rp(bench().dep),'span','v')}</div>
        <div class="row"><span class="k">Fraud incidents this year</span>${L(()=>[String(S.bench.fraudY),S.bench.fraudY?'down':''],'span','v')}</div>
      </div></div></section>
    <section class="panel"><div class="panel-h"><h3>The economy today</h3><span class="eyebrow">${L(()=>fdate(S.h))}</span></div>
      <div class="panel-b"><div class="rows">
        <div class="row"><span class="k">${L(()=>biName(S.h))}</span>${L(()=>pc(biRate(S.h)),'span','v')}</div>
        <div class="row"><span class="k">Inflation, last 12 months</span>${L(()=>pc(cpi(S.h)/cpi(Math.max(S.h-8760,0))-1,1),'span','v')}</div>
        <div class="row"><span class="k">USD / IDR</span>${L(()=>NF.format(Math.round(usd(S.h)/5)*5),'span','v')}</div>
        <div class="row"><span class="k">IHSG</span>${L(()=>{const q=quote('IHSG',S.h),p=prevClose('IHSG',S.h);return [q.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'  '+sgn(q/p-1,x=>pc(x)),cls(q-p)];},'span','v')}</div>
        <div class="row"><span class="k">UMR ${esc(H.n)}</span>${L(()=>rp(umr(S.home,S.h),true),'span','v')}</div>
        <div class="row"><span class="k">Deposito 12 months</span>${L(()=>pc(depRate(S.h,12)),'span','v')}</div>
      </div></div></section>
  </div>
  <section class="panel"><div class="panel-h"><h3>Your companies</h3><button class="btn pri sm" data-act="found">Found a company</button></div>
    <div class="panel-b">${has?LH(()=>coTable()):`<p class="note">You have no companies yet. Found a <b>UD</b>, <b>CV</b> or <b>PT</b> with its office in any regency, then open businesses anywhere in Indonesia. ${esc(H.n)} ${H.spec.length?'specialises in '+H.spec.map(k=>BIZ[k].n).join(', '):'has no resource specialty, but shops and services work anywhere'}. Every unit adds a monthly monitoring cost that grows with its distance from the company's office.</p>`}</div></section>
  <section class="panel"><div class="panel-h"><h3>Latest entries</h3><button class="btn ghost sm" data-act="tab" data-v="log">Full ledger</button></div>
    <div class="panel-b">${LH(()=>ledger(8),'div','ledger')}</div></section>
  <section class="panel"><div class="panel-h"><h3>How to play</h3></div><div class="panel-b"><p class="note">
    Time runs at <b>1 second = 1 game hour</b>. Speed it up in the top bar, or press <b>Space</b> to pause. Prices, interest rates, inflation, minimum wages and tax law follow Indonesian history from your start date. All money sits in bank accounts: sales are credited straight to the company account, which earns the tabungan rate.
    Each business unit costs a monthly monitoring fee that rises with its distance from its company's office, and far-away units leak output unless a strong director runs the company. Hire family or professionals to the board; PTs need a director and a commissioner by law.
    Each company holds its annual meeting (RUPS) on the 20th of a month you choose, paying dividends by your standing policy. Payroll runs on the 25th, THR a week before Idul Fitri, and income tax is due on 30 April. When a unit has earned well for six months or more, a PT can spin it off into its own subsidiary; units can also move between your companies by inbreng, and PTs can merge. A profitable PT with Rp 5 M of equity can go public: the <b>Stock market</b> tab has the IPO desk, the public offerings of the day and your listed companies.
  </p></div></section>`;
}
function coTable(){
  if(!S.C.length) return '<p class="note">No companies.</p>';
  const rows=orderedCos().map(({c,depth})=>{ const e=equity(c), last=c.hist[c.hist.length-1];
    return `<tr class="click" data-act="openco" data-id="${c.id}"><td style="padding-left:${8+depth*18}px">${depth?'↳ ':''}<b>${esc(coName(c))}</b><div class="muted" style="font-size:.78rem">${esc(REG[c.reg].n)} · ${c.units.map(u=>BIZ[u.t].n).join(', ')||'no business units'}</div></td>
      <td class="n">${pc(ownPct(c,'P')+(c.parent!=='P'?0:0),1)}</td><td class="n">${rp(c.cash)}</td><td class="n">${rp(e)}</td><td class="n ${last?cls(last.net):''}">${last?rp(last.net):'—'}</td></tr>`; }).join('');
  return `<div class="tbl-wrap"><table><thead><tr><th>Company</th><th class="n">Your direct stake</th><th class="n">Cash</th><th class="n">Equity</th><th class="n">Last month net</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function orderedCos(){ const out=[]; const walk=(pid,depth)=>{ for(const c of S.C) if(c.parent===pid){ out.push({c,depth}); walk(c.id,depth+1); } }; walk('P',0); for(const c of S.C) if(!out.find(o=>o.c===c)) out.push({c,depth:0}); return out; }
function ledger(n){
  const items=S.log.slice(0,n||S.log.length);
  if(!items.length) return '<p class="note">Nothing yet.</p>';
  return items.map(e=>`<div class="le ${e.k}"><span class="d">${fdate(e.h)}</span><span class="m">${esc(e.m)}</span></div>`).join('');
}

/* ---------- Companies */
function vBiz(){
  if(!S.C.length) return `<section class="panel"><div class="panel-h"><h2>Companies</h2></div><div class="panel-b">
    <p class="note">Pick a legal form when you found a company. The rules depend on the date: before August 2007 a PT follows UU 1/1995, then UU 40/2007, and from November 2020 the Cipta Kerja amendments.</p>
    <div class="rows">
      <div class="row"><span class="k"><b>UD</b> · sole proprietorship. Cheapest, no separate legal entity, you are personally liable, take profit as prive.</span></div>
      <div class="row"><span class="k"><b>CV</b> · limited partnership. You are the active partner with unlimited liability; a family partner puts in part of the capital.</span></div>
      <div class="row"><span class="k"><b>PT</b> · limited liability company. Notary deed and ministry approval, minimum capital, two founders, can own subsidiaries.</span></div>
    </div>
    <div><button class="btn pri" data-act="found">Found a company</button></div></div></section>`;
  if(!S.sel.co||!acct(S.sel.co)) S.sel.co=orderedCos()[0].c.id;
  const c=acct(S.sel.co);
  return `<div class="split">
    <aside class="panel"><div class="panel-h"><h3>Your group</h3><button class="btn pri sm" data-act="found">Found</button></div>
      <div class="panel-b"><div class="co-list">${orderedCos().map(({c:x,depth})=>`<button class="co-item" data-act="openco" data-id="${x.id}" aria-current="${x.id===c.id}" style="padding-left:${10+depth*16}px"><span class="nm">${depth?'↳ ':''}${esc(coName(x))}</span><span class="sub">${L(()=>'equity '+rp(equity(x)))}</span></button>`).join('')}</div></div></aside>
    <div style="display:flex;flex-direction:column;gap:20px;min-width:0">${coDetail(c)}</div>
  </div>`;
}
function coDetail(c){
  const owners=companyOwners(c);
  const isPT=c.form==='PT'||c.form==='PTP';
  return `
  <section class="panel"><div class="panel-h">
      <div><h2>${esc(coName(c))}</h2><div class="note">${FORMS[c.form].n} · office in ${esc(REG[c.reg].n)} · founded ${fdate(c.founded)} · owned by ${owners.map(o=>`${esc(acctName(o.k))} ${pc(o.pct,1)}`).join(', ')}</div></div>
      <div class="btns">${c.tbk?L(()=>c.tbk.sym+' · '+NF.format(quote(c.tbk.sym,S.h)),'span','chip good'):c.ipo?'<span class="chip acc">IPO in registration</span>':''}${L(()=>'Usaha '+SZ(c).n,'span','chip acc')}${L(()=>{const k=kol(c);return [KOL[k],k>1?'down':''];},'span','chip')}</div>
    </div>
    <div class="panel-b"><div class="grid3">
      <div class="rows">
        <div class="row"><span class="k">Bank account</span>${L(()=>[rp(c.cash),c.cash<0?'down':''],'span','v')}</div>
        <div class="row"><span class="k">Deposito</span>${L(()=>rp(depSum(c)),'span','v')}</div>
        <div class="row"><span class="k">Shares held</span>${L(()=>rp(holdMV(c)),'span','v')}</div>
        <div class="row"><span class="k">Business assets (book)</span>${L(()=>rp(unitBook(c)),'span','v')}</div>
        <div class="row"><span class="k">Loans</span>${L(()=>rp(debt(c)),'span','v')}</div>
        <div class="row total"><span class="k">Equity</span>${L(()=>rp(equity(c)),'span','v')}</div>
      </div>
      <div class="rows">
        <div class="row"><span class="k">This month revenue</span>${L(()=>rp(c.mon.rev),'span','v')}</div>
        <div class="row"><span class="k">This month net</span>${L(()=>[rp(netOf(c.mon)),cls(netOf(c.mon))],'span','v')}</div>
        <div class="row"><span class="k">Year to date net</span>${L(()=>[rp(netOf(c.ytd)),cls(netOf(c.ytd))],'span','v')}</div>
        <div class="row"><span class="k">Paid-up capital</span>${L(()=>rp(c.paidIn),'span','v')}</div>
        <div class="row"><span class="k">Retained earnings</span>${L(()=>[rp(c.retained),cls(c.retained)],'span','v')}</div>
        <div class="row"><span class="k">Tax regime</span>${L(()=>{const d=dOf(S.h);return umkmRegime(c,d.getUTCFullYear(),d.getUTCMonth()).label;},'span','v')}</div>
      </div>
      <div><canvas class="chart sm" data-chart="co:${c.id}" aria-label="Monthly revenue and net profit"></canvas><div class="note">Monthly revenue (bars) and net profit (line)</div></div>
    </div></div></section>
  <div class="acct-tabs" role="tablist" aria-label="Company sections">${[['ops','Business units'],['org','Organisation'],['money','Money & payouts']].map(([k,l])=>`<button role="tab" data-act="cotab" data-v="${k}" aria-pressed="${(S.sel.cotab||'ops')===k}">${l}</button>`).join('')}</div>
  ${(S.sel.cotab||'ops')==='ops'?`
  <section class="panel"><div class="panel-h"><h3>Business units</h3><button class="btn pri sm" data-act="addunit" data-id="${c.id}">Open a business</button></div>
    <div class="panel-b">${c.units.length?c.units.map(u=>unitCard(c,u)).join(''):'<p class="note">No business units yet. Open one in any regency; the setup cost comes from the company account. Regional specialties produce 25% more.</p>'}</div></section>`:''}
  ${S.sel.cotab==='org'?orgPanel(c):''}
  ${S.sel.cotab==='money'?`
  <div class="grid2">
  <section class="panel"><div class="panel-h"><h3>Owners & payouts</h3><span class="eyebrow">${isPT?'RUPS decisions':c.form==='CV'?'Partners':'Owner'}</span></div>
    <div class="panel-b">
      <div class="fields">
        <label class="f">${c.form==='UD'?'Prive (withdraw)':c.form==='CV'?'Profit distribution':'Interim dividend'} amount<input type="number" id="div-${c.id}" min="0" step="100000"></label>
        <button class="btn" data-act="dividend" data-id="${c.id}">${c.form==='UD'?'Withdraw now':isPT?'Pay interim (RUPSLB)':'Distribute now'}</button>
      </div>
      <p class="note">Available now: ${L(()=>rp(distributable(c)))}. ${isPT?'Each RUPS sets aside 10% of yearly profit as a statutory reserve until it reaches 20% of paid-up capital (Art. 70); dividends come only from retained earnings above it (Art. 71). Reserve now '+L(()=>rp(c.reserve||0))+'. Individuals pay '+L(()=>pc(divTaxIndiv(S.h),0))+' final tax; '+L(()=>S.h>=H_CIPTA?'domestic company shareholders are exempt (Cipta Kerja).':'company shareholders with 25% or more are exempt.'):c.form==='CV'?'Profit shares from a CV are not taxed again in the partners\' hands.':'A UD is not a separate legal entity, so withdrawals are simply moving your own money.'}</p>
      ${rupsBlock(c)}
      <div class="fields">
        <label class="f">Inject capital from<select id="injfrom-${c.id}">${owners.filter(o=>o.k!=='F'&&o.k!=='PUB').map(o=>`<option value="${o.k}">${esc(acctName(o.k))}</option>`).join('')}</select></label>
        <label class="f">Amount<input type="number" id="inj-${c.id}" min="0" step="1000000"></label>
        <button class="btn" data-act="inject" data-id="${c.id}">Inject</button>
      </div>
      ${c.form==='PT'&&c.own.P>0?`<div class="btns"><button class="btn sm" data-act="sellstake" data-id="${c.id}">Transfer my shares to one of my PTs</button><span class="note" style="align-self:center">You hold ${pc(ownPct(c,'P'),1)} personally.</span></div>`:''}
      <label class="check"><input type="checkbox" id="umr-${c.id}" data-chg="autoumr" data-id="${c.id}" ${c.autoUMR?'checked':''}> Raise wages to the new UMR every January</label>
    </div></section>
  <section class="panel"><div class="panel-h"><h3>Profit & loss</h3><span class="eyebrow">Rupiah</span></div>
    <div class="panel-b">${LH(()=>plTable(c))}
      <div class="btns">
        <button class="btn sm" data-act="bankfor" data-id="${c.id}">Bank as ${esc(coName(c))}</button>
        <button class="btn sm" data-act="report" data-id="${c.id}">Financial report</button>
        <button class="btn sm" data-act="tradefor" data-id="${c.id}">Trade shares as ${esc(coName(c))}</button>
        ${isPT?`<button class="btn sm" data-act="found" data-parent="${c.id}">Found a subsidiary</button>`:''}
        ${c.form==='UD'||c.form==='CV'?`<button class="btn sm pri" data-act="convert" data-id="${c.id}">Convert to PT</button>`:''}
        <button class="btn sm" data-act="rename" data-id="${c.id}">Rename</button>
        <button class="btn sm" data-act="relocate" data-id="${c.id}">Move office</button>
        <button class="btn sm" data-act="merge" data-id="${c.id}">Merge another company in</button>
        <button class="btn sm bad" data-act="dissolve" data-id="${c.id}">Dissolve</button>
      </div></div></section>
  </div>
  ${listingPanel(c)}
  ${deskPanel(c)}
  ${feePanel(c)}`:''}`;
}
function plTable(c){
  const cols=[['This month',c.mon],['Year to date',c.ytd]]; if(c.ytdPrev) cols.push([String(c.ytdPrev.y),c.ytdPrev]);
  const lines=[['Revenue','rev',1],['Cost of goods / inputs','cogs',-1],['Wages, BPJS, THR','wage',-1],['Rent & operating','opex',-1],['Monitoring & travel','mon',-1],['Depreciation','dep',-1],['Interest & fees','intx',-1],['Other income (interest, dividends, gains)','other',1],['Management fees received','mfi',1],['Management fees paid','mfee',-1],['Outsourcing fees','outs',-1],['Income tax','tax',-1],['Fines','fine',-1],['Fraud & credit losses','loss',-1]];
  return `<div class="tbl-wrap"><table><thead><tr><th></th>${cols.map(x=>`<th class="n">${x[0]}</th>`).join('')}</tr></thead><tbody>
  ${lines.filter(([, f])=>cols.some(x=>Math.abs(x[1][f]||0)>0.5)||f==='rev').map(([l,f,s])=>`<tr><td>${l}</td>${cols.map(x=>`<td class="n">${x[1][f]?(s<0?'−':'')+rp(x[1][f]).replace('−',''):'—'}</td>`).join('')}</tr>`).join('')}
  <tr><td><b>Net profit</b></td>${cols.map(x=>{const n=netOf(x[1]);return `<td class="n ${cls(n)}"><b>${rp(n)}</b></td>`;}).join('')}</tr>
  </tbody></table></div>${c.taxDue>0?`<p class="note warn">Income tax due 30 April: ${rp(c.taxDue)}.</p>`:''}`;
}
function unitCard(c,u){
  const b=BIZ[u.t], Lv=b.lv[u.lv], up=upgradeCost(u);
  const status = b.kind==='retail'
    ? L(()=>{ const hr=dOf(S.h).getUTCHours(); if(u.w<=0) return ['Closed: no staff','down']; return [(hr>=b.open[0]&&hr<b.open[1]?'Open now':'Closed for the night')+' · sales this month '+rp(u.mrev||0),'']; })
    : L(()=> u.ph==='grow' ? [`Growing · day ${u.d} of ${b.cycle} · inputs ${rp(u.inCost||0)}`,''] : [u.wait?'Idle: waiting for money in the company account to restock':'Idle', u.wait?'down':'muted']);
  return `<div class="unit">
    <div><h4>${b.n} · ${Lv.l} ${boostChip(u.t,u.reg)} ${LH(()=>{ const f=bizF(c,u); return f<0.85?`<span class="chip bad">No ${SECTORS[SEC_OF[u.t]].n} team</span>`:f<0.95&&!jobQ(c,'bz_'+SEC_OF[u.t])?`<span class="chip warn">Main line run by the board · 90%</span>`:''; },'span')}</h4><div class="meta">${REG[u.reg].n}, ${esc(provOf(u.reg))} · needs ${Lv.staff} worker${Lv.staff>1?'s':''} · UMR here ${L(()=>rp(umr(u.reg,S.h),true))}</div>
      <div class="meta">${L(()=>{const o=officeFor(c,u.reg);return `Monitoring ${rp(monCost(c,u))}/month from ${officeName(c,o)}${o.d?', '+NF.format(o.d)+' km':''} · leakage ${pc(leak(c,u),1)}`;})}</div>
      <div class="meta">${status}</div>
      <div class="meta">${L(()=>{const t=unitT12(u); if(!t.n) return 'No full month of results yet'; const nr=spinReady(u); return [`Last ${t.n} month${t.n>1?'s':''}: net ${rp(t.net)}${c.form==='PT'?(nr?' · not ready to spin off':' · successful: ready to spin off'):''}`, t.net<0?'down':!nr&&c.form==='PT'?'up':''];})}</div>
      ${b.kind==='cycle'?LH(()=>`<i style="width:${Math.round(100*(u.ph==='grow'?u.d:0)/b.cycle)}%"></i>`,'div','prog'):''}
      ${b.kind==='cycle'?`<div class="meta">${L(()=>u.last?`Last harvest ${fdate(u.last.h)}: ${NF.format(u.last.kg)} ${unitOf(b)} at ${rp(u.last.price,true)} = ${rp(u.last.rev)} (inputs ${rp(u.last.cost)})`:'No harvest yet.')}</div>`:''}
    </div>
    <div class="num" style="text-align:right">${L(()=>'Book '+rp(u.book))}<div class="meta">${L(()=>'Productivity '+pc(staffF(u)*moraleF(u,S.h)*unitBoost(u)*bizF(c,u)*mgmtF(c)*(1-leak(c,u)),0))}</div></div>
    <div class="ctl">
      <label class="f">Workers<span class="stepper"><button data-act="w" data-id="${c.id}" data-u="${u.id}" data-v="-${wStep(u)}" aria-label="Fewer workers">−</button><span>${u.w}</span><button data-act="w" data-id="${c.id}" data-u="${u.id}" data-v="${wStep(u)}" aria-label="More workers">+</button></span></label>
      <label class="f">Wage / worker / month<input type="number" id="sal-${u.id}" data-chg="sal" data-id="${c.id}" data-u="${u.id}" min="0" step="50000" value="${Math.round(u.sal)}" style="width:150px"></label>
      ${b.kind==='cycle'?`<label class="check"><input type="checkbox" data-chg="auto" data-id="${c.id}" data-u="${u.id}" ${u.auto?'checked':''}> Auto-restock</label>`:''}
      ${b.kind==='cycle'&&u.ph!=='grow'?`<button class="btn sm" data-act="startcyc" data-id="${c.id}" data-u="${u.id}">Start cycle (${rp(Lv.input*cpi(S.h)*(b.land?landAdj(u.reg):1))})</button>`:''}
      ${up!=null?`<button class="btn sm" data-act="upgrade" data-id="${c.id}" data-u="${u.id}">Expand to ${b.lv[u.lv+1].l} (${rp(up)})</button>`:''}
      <button class="btn sm ${c.form==='PT'&&!spinReady(u)?'pri':''}" data-act="spin" data-id="${c.id}" data-u="${u.id}">Spin off as subsidiary</button>
      <button class="btn sm" data-act="inb" data-id="${c.id}" data-u="${u.id}">Inbreng to…</button>
      <button class="btn sm bad" data-act="sellunit" data-id="${c.id}" data-u="${u.id}">Sell</button>
    </div>
    ${L(()=>u.sal<umr(u.reg,S.h)?'⚠ Wage is below the regional minimum (UMR). Productivity suffers and Disnaker may fine you.':'','div','meta warn')}
  </div>`;
}

/* ---------- Bank */
function acctPicker(act){ return `<div class="acct-tabs" role="group" aria-label="Account">${[{id:'P'},...orderedCos().map(o=>o.c)].map(a=>`<button data-act="${act}" data-v="${a.id}" aria-pressed="${S.sel.acct===a.id}">${esc(acctName(a.id))}</button>`).join('')}</div>`; }
function vBank(){
  if(!acct(S.sel.acct)) S.sel.acct='P';
  const a=acct(S.sel.acct), isP=a.id==='P';
  const prods=isP?['KTA']:['KMK','KUR'];
  return `
  <section class="panel"><div class="panel-h"><div><h2>Bank Sentosa</h2><div class="note">A fictional national bank. Rates follow the central bank policy rate. Deposits are covered by LPS: ${L(()=>lpsCap(S.h))}.</div></div>${acctPicker('bankacct')}</div>
    <div class="panel-b"><div class="grid3">
      <div class="rows">
        <div class="row"><span class="k">${isP?'Rekening (personal account)':'Rekening (company account)'}</span>${L(()=>[rp(a.cash),a.cash<0?'down':''],'span','v')}</div>
        <div class="row"><span class="k">Deposito</span>${L(()=>rp(depSum(a)),'span','v')}</div>
        <div class="row"><span class="k">Loans outstanding</span>${L(()=>rp(debt(a)),'span','v')}</div>
        <div class="row"><span class="k">Credit status (SID/SLIK)</span>${L(()=>{const k=kol(a);return [k+' · '+KOL[k],k>1?'down':'up'];},'span','v')}</div>
      </div>
      <div class="rows">
        <div class="row"><span class="k">${L(()=>biName(S.h))}</span>${L(()=>pc(biRate(S.h)),'span','v')}</div>
        <div class="row"><span class="k">Rekening interest</span>${L(()=>pc(savRate(S.h)),'span','v')}</div>
        <div class="row"><span class="k">Deposito 1 / 3 / 6 / 12 mo</span>${L(()=>[1,3,6,12].map(m=>pc(depRate(S.h,m),2)).join(' · '),'span','v')}</div>
        <div class="row"><span class="k">${isP?'KTA personal loan':'Kredit Modal Kerja'}</span>${L(()=>pc(isP?ktaRate(S.h):kmkRate(S.h)),'span','v')}</div>
        ${isP?'':`<div class="row"><span class="k">KUR (Mikro / Kecil)</span>${L(()=>{const t=kurTerms(S.h);return t?pc(t.mikroRate,0)+' / '+pc(t.kecilRate,0):'from Nov 2007';},'span','v')}</div>`}
      </div>
      <p class="note">There is no cash box: every sale, salary and dividend lands in the rekening, which earns interest monthly with a <b>20% final tax</b> on balances above Rp 7,5 juta. A negative balance is an overdraft at 2% a month. A missed instalment worsens your kolektibilitas; at 3 or worse banks refuse new credit, and at 5 (Macet) they seize assets.</p>
    </div></div></section>
  <div class="grid2">
    <section class="panel"><div class="panel-h"><h3>Deposito</h3></div><div class="panel-b">
      <div class="fields"><label class="f">Amount<input type="number" id="dep-amt" min="0" step="1000000"></label>
        <label class="f">Term<select id="dep-m"><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12" selected>12 months</option></select></label></div>
      <label class="check"><input type="checkbox" id="dep-aro" checked> Automatic roll-over (ARO)</label>
      <div class="btns"><button class="btn pri" data-act="opendep">Open deposito</button></div>
      ${LH(()=>a.deps.length?`<div class="tbl-wrap"><table><thead><tr><th class="n">Principal</th><th class="n">Rate</th><th>Matures</th><th></th></tr></thead><tbody>${a.deps.map(d=>`<tr><td class="n">${rp(d.amt)}</td><td class="n">${pc(d.r)}</td><td>${fdate(d.mat)}${d.aro?' · ARO':''}</td><td><button class="btn sm" data-act="breakdep" data-v="${d.id}">Break</button></td></tr>`).join('')}</tbody></table></div><p class="note">Breaking early forfeits interest and costs a 0,5% penalty.</p>`:'<p class="note">No deposito yet. Money moves from the rekening and back at maturity.</p>')}
    </div></section>
    <section class="panel"><div class="panel-h"><h3>Loans</h3></div><div class="panel-b">
      <div class="fields">
        <label class="f">Product<select id="ln-p">${prods.map(p=>`<option value="${p}">${p}</option>`).join('')}</select></label>
        <label class="f">Amount<input type="number" id="ln-amt" min="0" step="1000000"></label>
        <label class="f">Tenor<select id="ln-n"><option value="12">12 months</option><option value="24" selected>24 months</option><option value="36">36 months</option></select></label>
      </div>
      <p class="note">${L(()=>{ const p=document.getElementById('ln-p')?.value||prods[0]; const amt=+document.getElementById('ln-amt')?.value||0, n=+document.getElementById('ln-n')?.value||24; const lim=loanLimit(a,p); const r=amt>0?loanRate(p,amt,a):loanRate(p,1,a); const chk=amt>0?loanCheck(a,p,amt):null; return `Limit ${rp(lim)} at ${pc(r)}.`+(amt>0?` Instalment ${rp(annuity(amt,r,n))}/month.`:'')+(chk?' '+chk:''); })}</p>
      <div class="btns"><button class="btn pri" data-act="loan">Apply</button></div>
      ${LH(()=>a.loans.length?`<div class="tbl-wrap"><table><thead><tr><th>Loan</th><th class="n">Balance</th><th class="n">Instalment</th><th>Next due</th><th></th></tr></thead><tbody>${a.loans.map(l=>`<tr><td>${esc(l.name)}<div class="muted" style="font-size:.75rem">${pc(l.r)} · ${l.left} left${l.miss?` · <span class="down">${l.miss} missed</span>`:''}</div></td><td class="n">${rp(l.bal)}</td><td class="n">${rp(l.pay)}</td><td>${fdate(l.due)}</td><td><button class="btn sm" data-act="payoff" data-v="${l.id}">Pay off</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="note">No loans.</p>')}
    </div></section>
  </div>
  ${bondPanel(a)}`;
}

/* ---------- Law & rates */
function vLaw(){
  return `<section class="panel"><div class="panel-h"><div><h2>Law & rates in force</h2><div class="note">Everything here changes with the game date. ${L(()=>'Today: '+fdate(S.h))}</div></div></div>
  <div class="panel-b">${LH(()=>lawTables())}</div></section>`;
}
function lawTables(){
  const h=S.h, y=yearOf(h), pt=lawPT(h), kur=kurTerms(h), d=dOf(h);
  const r=(k,v)=>`<div class="row"><span class="k">${k}</span><span class="v" style="white-space:normal">${v}</span></div>`;
  const reg0={prevTurnover:0,founded:h,form:'PT'};
  return `<div class="grid2">
  <div><h3>Companies</h3><div class="rows">
    ${r('PT law',pt.law)}${r('Minimum paid-up capital',pt.minPaid?rp(pt.minPaid,true):'Set by founders')}
    ${r('Founders',h>=H_PTP?'2+ for PT · 1 for PT Perorangan':'At least 2')}
    ${r('Company size',(()=>{const R=sizeRules(h);return `${R.law}: Mikro up to ${rp(R.T[0])} turnover or ${rp(R.A[0])} net assets, Kecil up to ${rp(R.T[1])} / ${rp(R.A[1])}, Menengah up to ${rp(R.T[2])} / ${rp(R.A[2])}, Besar above`;})())}
    ${r('Management fees','PPh 23 of 2% withheld by the payer; the tax office accepts about 5% of revenue as arm\'s length')}
    ${r('RUPS',(h<H_UU40?'UU 1/1995':'UU 40/2007 Art. 78')+': annual meeting within six months of year end; it approves accounts, dividends and board pay')}
    ${r('Company organs',h<H_UU40?'Direksi and komisaris required for a PT (UU 1/1995)':'At least 1 director (Art. 92) and 1 commissioner (Art. 108); PT Perorangan needs a director only')}
    ${r('Setup cost UD / CV / PT',[ 'UD','CV','PT'].map(f=>rp(formFee(f,h))).join(' / ')+(h>=H_PTP?' / PT Perorangan Rp 50.000':''))}
  </div><p class="note">${esc(pt.note)}</p></div>
  <div><h3>Tax</h3><div class="rows">
    ${r('Corporate income tax',y<=2008?'10% / 15% / 30% brackets (UU 17/2000)':pc(citRate(y),0)+' · 50% off for turnover ≤ Rp 4,8 M (Art. 31E)')}
    ${r('UMKM final tax (new PT)',umkmRegime(reg0,y,d.getUTCMonth()).label)}
    ${r('Personal income tax',pitBrackets(y).map(([c,rt])=>pc(rt,0)+(isFinite(c)?' ≤ '+rp(c):'')).join(' · '))}
    ${r('PTKP (single, per year)',rp(ptkp(y),true))}
    ${r('Dividend tax, individuals',pc(divTaxIndiv(h),0)+' final')}
    ${r('Dividend tax, companies',h>=H_CIPTA?'Exempt (Cipta Kerja)':'Exempt with ≥ 25% stake, otherwise 15%')}
    ${r('Interest on deposits','20% final')}
    ${r('Share sales','0,1% final on sale value')}
  </div></div>
  <div><h3>Labour</h3><div class="rows">
    ${[...new Set([S.home,...S.C.map(c=>c.reg),...S.C.flatMap(c=>c.units.map(u=>u.reg))])].map(k=>r('UMR '+REG[k].n,rp(umr(k,h),true))).join('')}
    ${r('Employer social security',pc(bpjsRate(h),2)+' · '+bpjsLabel(h))}
    ${r('THR','One month\'s wage, due 7 days before Idul Fitri')}
  </div></div>
  <div><h3>Banking & markets</h3><div class="rows">
    ${r(biName(h),pc(biRate(h)))}
    ${r('LPS deposit guarantee',lpsCap(h))}
    ${r('KUR',kur?`Mikro up to ${rp(kur.mikroMax)} at ${pc(kur.mikroRate,0)} · Kecil up to ${rp(kur.kecilMax)} at ${pc(kur.kecilRate,0)}`:'Not yet launched (from 5 Nov 2007)')}
    ${r('Exchange',exName(h))}
    ${r('Trading lot',NF.format(lotSize(h))+' shares')}
  </div></div></div>
  <p class="note">Simplified for play. Regional minimum wages are approximated from the Jakarta UMP; the labour list shows your home base and the regencies where you operate (see Regions for all). Check primary sources (peraturan.bpk.go.id, pajak.go.id, bi.go.id) before relying on any figure.</p>`;
}

/* ---------- Log */
function vLog(){ return `<section class="panel"><div class="panel-h"><h2>Ledger</h2><span class="eyebrow">Newest first · last 400 entries</span></div><div class="panel-b">${LH(()=>ledger(),'div','ledger')}</div></section>`; }

/* ---------- Charts */
function tok(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function setupCanvas(cv){ const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1; if(r.width<10) return null; cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return {g,w:r.width,h:r.height}; }
function lineChart(cv,pts,fmtY,fmtX){
  const s=setupCanvas(cv); if(!s||pts.length<2) return; const {g,w,h}=s;
  const ink=tok('--ink'), mut=tok('--muted'), rule=tok('--rule'), acc=tok('--accent');
  let lo=Infinity,hi=-Infinity; for(const p of pts){ lo=Math.min(lo,p[1]); hi=Math.max(hi,p[1]); }
  if(hi===lo){ hi+=1; lo-=1; } const pad=(hi-lo)*0.08; lo-=pad; hi+=pad;
  const L0=58,R=10,T=10,B=22, x=i=>L0+(w-L0-R)*(pts[i][0]-pts[0][0])/((pts[pts.length-1][0]-pts[0][0])||1), y=v=>T+(h-T-B)*(1-(v-lo)/(hi-lo));
  g.font='11px '+tok('--f-mono'); g.fillStyle=mut; g.strokeStyle=rule; g.lineWidth=1;
  for(let i=0;i<=3;i++){ const v=lo+(hi-lo)*i/3, yy=Math.round(y(v))+.5; g.beginPath(); g.moveTo(L0,yy); g.lineTo(w-R,yy); g.stroke(); g.textAlign='right'; g.fillText(fmtY(v),L0-6,yy+4); }
  g.textAlign='left'; g.fillText(fmtX(pts[0][0]),L0,h-6); g.textAlign='right'; g.fillText(fmtX(pts[pts.length-1][0]),w-R,h-6);
  g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(x(i),y(p[1])):g.moveTo(x(i),y(p[1]))); g.lineTo(x(pts.length-1),h-B); g.lineTo(x(0),h-B); g.closePath();
  g.globalAlpha=.12; g.fillStyle=acc; g.fill(); g.globalAlpha=1;
  g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(x(i),y(p[1])):g.moveTo(x(i),y(p[1]))); g.strokeStyle=ink; g.lineWidth=1.6; g.stroke();
  const lx=x(pts.length-1), ly=y(pts[pts.length-1][1]); g.beginPath(); g.arc(lx,ly,3.5,0,7); g.fillStyle=acc; g.fill();
}
function barChart(cv,hist){
  const s=setupCanvas(cv); if(!s) return; const {g,w,h}=s;
  const mut=tok('--muted'), rule=tok('--rule'), acc=tok('--accent'), ink=tok('--ink');
  const data=hist.slice(-18); if(!data.length){ g.fillStyle=mut; g.font='12px '+tok('--f-body'); g.fillText('First month still running.',8,20); return; }
  let hi=0,lo=0; for(const d of data){ hi=Math.max(hi,d.rev,d.net); lo=Math.min(lo,d.net); } if(hi===lo) hi=lo+1;
  const L0=50,B=18,T=6, y=v=>T+(h-T-B)*(1-(v-lo)/(hi-lo)), bw=(w-L0-6)/data.length;
  g.font='10px '+tok('--f-mono'); g.fillStyle=mut; g.textAlign='right'; g.strokeStyle=rule;
  [lo,0,hi].forEach(v=>{ const yy=Math.round(y(v))+.5; g.beginPath(); g.moveTo(L0,yy); g.lineTo(w,yy); g.stroke(); g.fillText(rp(v).replace('Rp ',''),L0-4,yy+3); });
  data.forEach((d,i)=>{ g.fillStyle=acc; g.globalAlpha=.55; g.fillRect(L0+i*bw+2,y(d.rev),bw-4,y(0)-y(d.rev)); });
  g.globalAlpha=1; g.beginPath(); data.forEach((d,i)=>{ const xx=L0+i*bw+bw/2; i?g.lineTo(xx,y(d.net)):g.moveTo(xx,y(d.net)); }); g.strokeStyle=ink; g.lineWidth=1.5; g.stroke();
  g.textAlign='left'; g.fillStyle=mut; const f=data[0].k, l=data[data.length-1].k; g.fillText(BLN[f%100-1]+' '+Math.floor(f/100),L0,h-4); g.textAlign='right'; g.fillText(BLN[l%100-1]+' '+Math.floor(l/100),w,h-4);
}
function drawCharts(){
  document.querySelectorAll('canvas[data-chart]').forEach(cv=>{
    const k=cv.dataset.chart;
    if(k==='nw'){ let pts=S.nwh; if(pts.length>600){ const st=Math.ceil(pts.length/600); pts=pts.filter((_,i)=>i%st===0||i===S.nwh.length-1); } pts=pts.concat([[S.h,nwP()]]); lineChart(cv,pts,v=>rp(v).replace('Rp ',''),h=>fdate(h)); }
    else if(k==='y10'){ const last=lastFullIdx(S.h), pts=[]; const step=Math.max(1,Math.floor(last/500)); for(let i=0;i<=last;i+=step) pts.push([hK(TD[i]),MK.Y10[i]]); pts.push([S.h,y10At(S.h)]); lineChart(cv,pts,v=>v.toFixed(1).replace('.',',')+'%',h=>fdate(h)); }
    else if(k==='sym'){ const s=S.sel.sym, last=lastFullIdx(S.h), n={'1M':22,'6M':126,'1Y':250,'5Y':1250,'ALL':99999}[S.sel.range]; const a=Math.max(0,last-n,STK[s]?.ipo?tdLE(STK[s].ipo):0), pts=[]; const step=Math.max(1,Math.floor((last-a)/500)); for(let i=a;i<=last;i+=step) pts.push([hK(TD[i]),MK[s][i]]); pts.push([S.h,quote(s,S.h)]); lineChart(cv,pts,v=>NF.format(Math.round(v)),h=>fdate(h)); }
    else if(k==='map') drawMap(cv);
    else if(k==='pie') drawPie(cv);
    else if(k.startsWith('co:')){ const c=acct(k.slice(3)); if(c) barChart(cv,c.hist.concat(c.mon.rev?[{k:yearOf(S.h)*100+dOf(S.h).getUTCMonth()+1,rev:c.mon.rev,net:netOf(c.mon)}]:[])); }
  });
}

/* ---------- Modals */
function openModal(title,body,onMount){
  closeModal(); clearLive('b'); lvScope='b';
  const el=document.createElement('div'); el.className='scrim'; el.id='scrim';
  el.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="panel-h"><h2>${esc(title)}</h2><button class="btn ghost sm" data-act="close" aria-label="Close">Close</button></div><div class="panel-b">${body}</div></div>`;
  document.body.appendChild(el); lvScope='a'; liveTick(); onMount&&onMount(el);
  el.addEventListener('mousedown',e=>{ if(e.target===el) closeModal(); });
}
function closeModal(){ document.getElementById('scrim')?.remove(); clearLive('b'); }
function askConfirm(text,ok,fn){ openModal('Please confirm',`<p>${text}</p><div class="btns"><button class="btn bad" id="cf-ok">${esc(ok)}</button><button class="btn" data-act="close">Cancel</button></div>`,el=>{ el.querySelector('#cf-ok').onclick=()=>{ closeModal(); fn(); }; }); }
function err(msg){ if(typeof msg==='string'&&msg){ alertBox(msg); return true; } return false; }

function foundModal(parent){
  const h=S.h, law=lawPT(h);
  const owners=[{id:'P'},...S.C.filter(c=>c.form==='PT')];
  const home=parent?acct(parent).reg:S.home;
  const st={form: parent?'PT':'UD', owner: parent||'P', reg:home, p:REG[home].prov, name:'', cap:null, pct:null, partner:'F', dir:'', kom:''};
  const draw=(el)=>{
    const f=st.form, own=st.owner, isPT=f==='PT'||f==='PTP', r=REG[st.reg];
    const body=el.querySelector('#fm-body');
    const forms=['UD','CV','PT'].concat(h>=H_PTP?['PTP']:[]);
    const partnerOpts=['F',...(own!=='P'?['P']:[]),...S.C.filter(c=>c.form==='PT'&&c.id!==own).map(c=>c.id)];
    const candOpt=(x,sel)=>`<option value="${x.key}" ${sel===x.key?'selected':''}>${x.src==='pro'?'Professional':'Family'} · ${esc(x.name)}, ${esc(x.bg.toLowerCase())} · skill ${x.skill} · ${refBand(x.integ)[0].toLowerCase()} · ${rp(x.sal)}/mo${x.fee?' + fee '+rp(x.fee):''}</option>`;
    const dirLabel=isPT?'Direktur Utama':f==='CV'?'Who runs the CV':'Who runs the UD';
    if(st.cap==null) st.cap=f==='PT'?Math.max(law.minPaid,25e6):20e6;
    if(st.pct==null) st.pct=f==='CV'?10:1;
    const capT=(f==='PT'||f==='CV')?st.cap/(1-clamp(st.pct/100,0,0.49)):st.cap, tmp={id:'C'+S.nid,reg:st.reg,hired:[],level:sizeOf(capT,0,h)}, dc=candidates(tmp,'dir'), kc=candidates(tmp,'kom');
    body.innerHTML=`
      <label class="f">Owner<select id="fm-owner">${owners.map(o=>`<option value="${o.id}" ${o.id===own?'selected':''}>${esc(acctName(o.id))} · account ${rp(acct(o.id).cash)}</option>`).join('')}</select></label>
      <div class="biz-pick" role="group" aria-label="Legal form">${forms.map(k=>`<button type="button" data-form="${k}" aria-pressed="${k===f}"><b>${k==='PTP'?'PT Perorangan':FORMS[k].short}</b><span>${{UD:'Sole proprietor. Personal liability.',CV:'Partnership with a family partner.',PT:'Limited liability. Can own subsidiaries.',PTP:'Single founder, micro/small only.'}[k]}</span></button>`).join('')}</div>
      <label class="f">Name<input type="text" id="fm-name" maxlength="40" value="${esc(st.name)}" placeholder="${f==='UD'?'Sumber Rejeki':'Maju Bersama'}"></label>
      <div class="eyebrow">Domicile (registered office)</div>
      <div class="fields">
        <label class="f">Province<select id="fm-prov">${PROVS.map(p=>`<option ${p===st.p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="f">Regency<select id="fm-reg">${regsIn(st.p).map(k=>`<option value="${k}" ${k===st.reg?'selected':''}>${esc(REG[k].n)}${k===S.home?' (your home)':''}</option>`).join('')}</select></label>
      </div>
      <p class="note">${esc(TYPE_N[r.type])} · ${st.reg===S.home?'your home base':NF.format(km(S.home,st.reg))+' km from your home base: you are less effective as its director'} · UMR ${rp(umr(st.reg,h),true)} · specialties: ${specChips(r)}. Business units are monitored from here.</p>
      <div class="fields">
        <label class="f">Capital you put in<input type="number" id="fm-cap" min="0" step="1000000" value="${st.cap}"></label>
        ${f==='CV'?`<label class="f">Family partner's share (%)<input type="number" id="fm-pct" min="1" max="49" value="${st.pct}"></label>`:''}
        ${f==='PT'?`<label class="f">Second founder<select id="fm-partner">${partnerOpts.map(p=>`<option value="${p}" ${p===st.partner?'selected':''}>${esc(acctName(p))}</option>`).join('')}</select></label><label class="f">Their share (%)<input type="number" id="fm-pct" min="1" max="49" value="${st.pct}"></label>`:''}
      </div>
      <div class="eyebrow">${isPT?'Direksi & dewan komisaris':'Management'}</div>
      <label class="f">${dirLabel}<select id="fm-dir"><option value="">Choose…</option><option value="P" ${st.dir==='P'?'selected':''}>Me, ${esc(S.name)}${f==='UD'?', as owner':''}</option>${dc.map(x=>candOpt(x,st.dir)).join('')}</select></label>
      ${f==='PT'?`<label class="f">Komisaris<select id="fm-kom"><option value="">Choose…</option><option value="P" ${st.kom==='P'?'selected':''}>Me, ${esc(S.name)}</option><option value="MOM" ${st.kom==='MOM'?'selected':''}>${esc(momName(tmp.id))}, your mother · skill 40 · unpaid</option>${kc.map(x=>candOpt(x,st.kom)).join('')}</select></label>`:''}
      <p class="note">${f==='PT'?'A PT needs a director and a commissioner, and one person cannot hold both seats.':f==='PTP'?'A PT Perorangan needs only a director.':'A UD or CV has no formal board; you can run it yourself or hire a manager.'} Professionals charge a headhunter fee of two months' pay, paid from the new company's capital. With ${rp(capT)} of capital it starts as a Usaha ${LEVELS[tmp.level].n}, which draws professionals up to about skill ${LEVELS[tmp.level].tal.cap}; change the capital and the candidates change. You can add more people later.</p>
      <div class="callout">${f==='PT'?esc(law.law)+'. '+esc(law.note):f==='PTP'?'PP 8/2021: one Indonesian founder, UMK criteria, statement of establishment registered online.':f==='CV'?'Established by notarial deed (KUHD Art. 19). You are the active partner with unlimited liability; the family partner is a silent partner who contributes capital in proportion to their share.':'Registered with the local trade office (SIUP/TDP). No separate legal entity: business debts are your debts.'}
        Setup fees: <b>${rp(formFee(f,h),true)}</b>.</div>
      <p class="note" id="fm-chk" aria-live="polite"></p>
      <div class="btns"><button class="btn pri" id="fm-go">Found ${f==='PTP'?'PT Perorangan':FORMS[f].short}</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ st.name=body.querySelector('#fm-name').value; st.cap=+body.querySelector('#fm-cap').value||0; const p=body.querySelector('#fm-pct'); if(p) st.pct=+p.value||0; const pa=body.querySelector('#fm-partner'); if(pa) st.partner=pa.value; st.dir=body.querySelector('#fm-dir').value; const k=body.querySelector('#fm-kom'); if(k) st.kom=k.value; };
    const chk=()=>{
      keep();
      const pct=clamp(st.pct/100,0,0.49), fee=formFee(f,h), src=acct(own), need=st.cap+fee, total=f==='PT'||f==='CV'?st.cap/(1-pct):st.cap;
      const hf=[st.dir&&dc.find(x=>x.key===st.dir),f==='PT'&&st.kom&&kc.find(x=>x.key===st.kom)].reduce((s,x)=>s+(x?x.fee:0),0);
      const probs=[];
      if(own!=='P'&&f!=='PT') probs.push(`A ${f==='PTP'?'PT Perorangan':f} can only be owned by an individual. Subsidiaries must be regular PTs.`);
      if(src.cash<need) probs.push(`Not enough capital: you need ${rp(need)} (capital ${rp(st.cap)} + fees ${rp(fee)}), ${own==='P'?'your personal account':coName(src)} holds ${rp(src.cash)}.`);
      if(f==='PT'&&total<law.minPaid) probs.push(`Paid-up capital ${rp(total)} is below the ${rp(law.minPaid,true)} legal minimum.`);
      if(!st.dir) probs.push(`Choose ${isPT?'a Direktur Utama':'who runs it'}.`);
      if(f==='PT'&&!st.kom) probs.push('Choose a commissioner.');
      if(f==='PT'&&st.dir==='P'&&st.kom==='P') probs.push('You cannot hold both seats.');
      if(hf&&hf>=total) probs.push(`Headhunter fees ${rp(hf)} exceed the starting capital.`);
      const box=body.querySelector('#fm-chk');
      box.className=probs.length?'note down':'note';
      box.textContent=probs.length?probs.join(' '):`Ready: ${rp(need)} leaves ${own==='P'?'your personal account':coName(src)} with ${rp(src.cash-need)}.${hf?` The company starts with ${rp(total-hf)} after ${rp(hf)} in headhunter fees.`:''}`;
    };
    chk(); body.addEventListener('input',chk); body.addEventListener('change',chk);
    body.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>{ keep(); if(st.form!==b.dataset.form){ st.form=b.dataset.form; st.cap=null; st.pct=null; } draw(el); });
    body.querySelector('#fm-owner').onchange=e=>{ keep(); st.owner=e.target.value; draw(el); };
    body.querySelector('#fm-prov').onchange=e=>{ keep(); st.p=e.target.value; st.reg=regsIn(st.p)[0]; draw(el); };
    body.querySelector('#fm-reg').onchange=e=>{ keep(); st.reg=e.target.value; draw(el); };
    body.querySelector('#fm-cap').addEventListener('change',()=>{ keep(); draw(el); });
    body.querySelector('#fm-pct')?.addEventListener('change',()=>{ keep(); draw(el); });
    body.querySelector('#fm-go').onclick=()=>{
      keep();
      const o={form:st.form,owner:st.owner,name:st.name,capital:st.cap,pct:st.pct,partner:st.partner,reg:st.reg,dir:st.dir,kom:st.kom};
      if(err(foundCompany(o))) return; closeModal(); S.tab='biz'; render();
    };
  };
  openModal(parent?'Found a subsidiary':'Found a company','<div id="fm-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function unitModal(cid){
  const c=acct(cid); const st={reg:c.reg,p:REG[c.reg].prov,t:null};
  const draw=el=>{
    const r=REG[st.reg], keys=Object.keys(BIZ), ok=keys.filter(t=>allowed(t,st.reg)), free=ok.filter(t=>!bizGate(c,t));
    if(!st.t||!ok.includes(st.t)) st.t=free.find(t=>isSpec(t,st.reg))||free[0]||ok[0];
    const b=BIZ[st.t], Lv=b.lv[0], sp=b.kind==='retail'?retailMult(st.t,st.reg):isSpec(st.t,st.reg)?SPEC_BONUS:1, cost=Lv.setup*cpi(S.h)*landAdj(st.reg), wage=Math.round(umr(st.reg,S.h)*(b.wage||1)/1000)*1000, d=km(c.reg,st.reg), gate=bizGate(c,st.t);
    const GRP=[['Shops & services',t=>!BIZ[t].tier&&BIZ[t].kind==='retail'],['Farming, fishing & plantations',t=>!BIZ[t].tier&&BIZ[t].kind==='cycle'],['Medium businesses · Usaha Kecil and up',t=>BIZ[t].tier===1],['Large businesses · Usaha Menengah and up',t=>BIZ[t].tier===2]];
    const card=k=>{const x=BIZ[k], g=bizGate(c,k), m=x.kind==='retail'?retailMult(k,st.reg):1; return `<button type="button" data-t="${k}" aria-pressed="${k===st.t}" ${g?'style="opacity:.55"':''}><b>${x.n}${isSpec(k,st.reg)||m>1.05?' ★':''}${g?' · locked':''}</b><span>${x.blurb}</span></button>`;};
    const body=el.querySelector('#um-body');
    let econ;
    if(b.kind==='retail'){ const rev=Lv.rev*cpi(S.h)*r.dem*sp*30; econ=`Expected sales about <b>${rp(rev)}</b> a month at ${pc(b.margin,0)} gross margin, rent and utilities ${rp(Lv.opex*cpi(S.h)*r.land)} a month.`; }
    else { const p=commodityPrice(st.t,S.h+b.cycle*24), inp=Lv.input*cpi(S.h)*(b.land?landAdj(st.reg):1), kg=Lv.yield*sp; econ=`Each ${b.cycle}-day cycle costs about <b>${rp(inp)}</b> in inputs and yields around ${NF.format(Math.round(kg))} ${unitOf(b)} of ${b.prod}. At today's price outlook (${rp(p,true)}/${unitOf(b)}${b.usd?`, from about US$ ${NF.format(Math.round(tblAt(USDP[b.usd],S.h)))} on world markets`:''}) that is <b>${rp(kg*p)}</b> before wages. Failure risk ${pc(b.fail,0)} per cycle.`; }
    body.innerHTML=`
      <div class="fields">
        <label class="f">Province<select id="um-prov">${PROVS.map(p=>`<option ${p===st.p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="f">Regency<select id="um-reg">${regsIn(st.p).map(k=>`<option value="${k}" ${k===st.reg?'selected':''}>${esc(REG[k].n)}${k===c.reg?' (office)':''}</option>`).join('')}</select></label>
      </div>
      <p class="note">${esc(TYPE_N[r.type])} · ${d?NF.format(d)+' km from the office in '+esc(REG[c.reg].n):'where the office is'} · UMR ${rp(wage,true)} · specialties: ${specChips(r)}</p>
      ${GRP.map(([lab,f])=>{const ks=ok.filter(f); return ks.length?`<div class="eyebrow">${lab}</div><div class="biz-pick" role="group" aria-label="${lab}">${ks.map(card).join('')}</div>`:'';}).join('')}
      <p class="note">★ marks this regency's specialties and strong local markets. Shops and services open anywhere; how well they sell depends on the regency. ${keys.length-ok.length} resource businesses need farmland or the resource itself; the Regions tab shows where.</p>
      ${gate?`<p class="note warn">${esc(gate)}</p>`:''}
      <div class="rows">
        <div class="row"><span class="k">Setup (${Lv.l})</span><span class="v">${rp(cost)}</span></div>
        <div class="row"><span class="k">Workers needed</span><span class="v">${NF.format(Lv.staff)} × ${rp(wage,true)}${b.wage?` (${String(b.wage).replace('.',',')}× UMR)`:''}</span></div>
        <div class="row"><span class="k">${SECTORS[SEC_OF[st.t]].n} business team</span>${(()=>{ const k=SEC_OF[st.t], q=jobQ(c,'bz_'+k); const main=!c.units.length||mainSec(c)===k; return q>0?`<span class="v up">In place, quality ${Math.round(q*100)}</span>`:main?`<span class="v ${(c.level||0)<=1?'':'warn'}">${(c.level||0)<=1?'Not needed yet: the board runs the main line':'None: the main line runs at 90% without one'}</span>`:`<span class="v down">None: a new line runs at 80% until you set one up</span>`; })()}</div>
        <div class="row"><span class="k">${b.kind==='retail'?'Local demand':'Regional specialty'}</span><span class="v ${sp>1.01?'up':sp<0.99?'down':''}">${b.kind==='retail'?'×'+sp.toFixed(2).replace('.',','):sp>1?'Yes, +25% output':'No'}</span></div>
        <div class="row"><span class="k">Monitoring from ${esc(officeName(c,officeFor(c,st.reg)))}</span><span class="v">${rp(monCostR(c,st.reg))} / month</span></div>
        <div class="row"><span class="k">Expected leakage with this board</span><span class="v ${leakR(c,st.reg)>0.08?'down':''}">${pc(leakR(c,st.reg),1)}</span></div>
        <div class="row"><span class="k">Company account</span><span class="v ${c.cash<cost?'down':''}">${rp(c.cash)}</span></div>
      </div>
      <p class="note">${econ}</p>
      <div class="btns"><button class="btn pri" id="um-go">Open for ${rp(cost)}</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{ st.t=x.dataset.t; draw(el); });
    body.querySelector('#um-prov').onchange=e=>{ st.p=e.target.value; st.reg=regsIn(st.p)[0]; draw(el); };
    body.querySelector('#um-reg').onchange=e=>{ st.reg=e.target.value; draw(el); };
    body.querySelector('#um-go').onclick=()=>{ if(err(addUnit(cid,st.t,st.reg))) return; closeModal(); render(); };
  };
  openModal(`Open a business · ${coName(c)}`,'<div id="um-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function menuModal(){
  openModal('Save & game',`
    <p class="note">The game autosaves in this browser every few seconds. To move a save between browsers, copy the save code and paste it on the other side.</p>
    <div class="btns"><button class="btn" id="mm-copy">Copy save code</button><button class="btn" id="mm-load">Load from code below</button><button class="btn" data-act="retire">Retire and see the final tally</button><button class="btn bad" id="mm-new">New game</button></div>
    <textarea id="mm-txt" aria-label="Save code" placeholder="Paste a save code here to load it"></textarea>`,el=>{
    const ta=el.querySelector('#mm-txt');
    el.querySelector('#mm-copy').onclick=()=>{ const s=JSON.stringify(S); ta.value=s; navigator.clipboard?.writeText(s).then(()=>toast('Copied','Save code is on your clipboard.'),()=>{ ta.select(); toast('Select and copy','Clipboard is blocked here; the code is selected in the box.'); }); };
    el.querySelector('#mm-load').onclick=()=>{ try{ const o=JSON.parse(ta.value); if(!o||!o.P||!o.seed) throw 0; S=o; buildMarket(S.seed); migrate(); closeModal(); app.innerHTML=''; render(); toast('Loaded','Save code loaded.'); }catch(e){ toast('Not loaded','That save code could not be read.'); } };
    el.querySelector('#mm-new').onclick=()=>askConfirm('Start a new game? The current game in this browser will be replaced.','Start over',()=>{ S=null; try{localStorage.removeItem(SAVE_KEY);}catch(e){} app.innerHTML=''; render(); });
  });
}

/* ---------- Setup screen */
function renderSetup(){
  const st={year:2005,cap:500e6,living:true,home:'3171',name:'Juragan'};
  const years=[[2005,'Post-crisis recovery, fuel hike looming'],[2008,'Right before the global crash'],[2010,'Commodity boom'],[2013,'Taper tantrum year'],[2016,'Tax amnesty, low rates'],[2020,'COVID-19 shock']];
  const caps=[[100e6,'Warung money'],[500e6,'Family savings'],[2e9,'Sold the family land'],[10e9,'Old money']];
  const draw=()=>{
    const r=REG[st.home], h0=hOf(st.year,0,3);
    app.innerHTML=`<div class="setup">
      <span class="stamp">Indonesia · Rupiah</span>
      <h1>Juragan</h1>
      <p class="lede">Your parents hand you the capital to start a business somewhere in Indonesia's recent past. Pick a home base anywhere from Aceh to Papua, found a UD, CV or PT under the law of the day, open businesses in the regencies that specialise in them, and staff your board with family or professionals. History moves at one game hour per second.</p>
      <div style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Your name</div><input type="text" id="su-name" maxlength="24" value="${esc(st.name)}" style="max-width:320px"></div>
      <div style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Start date</div><div class="opt-row" role="group" aria-label="Start year">${years.map(([y,t])=>`<button type="button" data-y="${y}" aria-pressed="${st.year===y}"><b>3 Jan ${y}</b><span>${t}</span></button>`).join('')}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Home base</div>
        <select id="su-home" style="max-width:420px">${PROVS.map(p=>`<optgroup label="${esc(p)}">${regsIn(p).map(k=>`<option value="${k}" ${k===st.home?'selected':''}>${esc(REG[k].n)}</option>`).join('')}</optgroup>`).join('')}</select>
        <p class="note">${esc(r.n)}, ${esc(provOf(st.home,h0))} · ${TYPE_N[r.type]} · UMR ${rp(umr(st.home,h0),true)} in ${st.year} · specialties: ${specChips(r)}. This is where you live: it sets your living costs, and you direct companies less well the farther their offices are from home. Each company picks its own office when you found it.</p></div>
      <div style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Capital from your parents, in rupiah of ${st.year}</div><div class="opt-row" role="group" aria-label="Seed capital">${caps.map(([v,t])=>`<button type="button" data-c="${v}" aria-pressed="${st.cap===v}"><b>${rp(v)}</b><span>${t} · ≈ ${rp(v/(cpi(h0)))} in 2005 money</span></button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" id="su-liv" ${st.living?'checked':''}> Pay my own living costs (about ${rp(1.5e6*cpi(h0)*(0.55+0.45*umr(st.home,h0)/umr('3171',h0)))} a month in ${esc(r.n)}, rising with inflation)</label>
      <div class="callout">The capital is family money, so there is no one to repay. Grow it into a group of companies, spin off the units that do well, move assets between companies by inbreng and merge what belongs together. When you retire, or history runs out on 31 December 2024, the game tallies your net worth against what the money would have earned in a deposito.</div>
      <div class="btns"><button class="btn pri" id="su-go" style="padding:11px 22px;font-size:1rem">Begin on 3 January ${st.year}</button></div>
      <p class="note">Market data is an approximate reconstruction of IHSG and 45 well-known IDX stocks (2005–2024). Later listings open on their IPO dates and can be subscribed to beforehand, and your own companies can join them on the board. Macro series, minimum wages, commodity prices and company law follow the official history but are simplified for play.</p>
    </div>`;
    const keep=()=>{ st.name=app.querySelector('#su-name').value; };
    app.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{ keep(); st.year=+b.dataset.y; draw(); });
    app.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ keep(); st.cap=+b.dataset.c; draw(); });
    app.querySelector('#su-home').onchange=e=>{ keep(); st.home=e.target.value; draw(); };
    app.querySelector('#su-liv').addEventListener('change',e=>st.living=e.target.checked);
    app.querySelector('#su-go').onclick=()=>{
      const name=app.querySelector('#su-name').value.trim()||'Juragan', seed=(Math.random()*2**31)|0;
      newGame({name,year:st.year,capital:st.cap,living:st.living,home:st.home,seed}); app.innerHTML=''; render(); save();
    };
  };
  draw();
}

/* ---------- Events */
const ACT={
  tab:d=>{ closeModal(); S.tab=d.v; render(); window.scrollTo({top:0}); },
  speed:d=>{ const v=+d.v; if(v===0) S.paused=true; else { S.paused=false; S.speed=v; } if(S.over) S.paused=true; syncSpeed(); },
  menu:()=>menuModal(),
  close:()=>closeModal(),
  newgame:()=>{ S=null; try{localStorage.removeItem(SAVE_KEY);}catch(e){} app.innerHTML=''; render(); },
  found:d=>foundModal(d.parent),
  openco:d=>{ S.sel.co=d.id; S.tab='biz'; render(); },
  addunit:d=>unitModal(d.id),
  w:d=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u), mx=Math.max(60,2*BIZ[u.t].lv[u.lv].staff); if(u.w<=0&&+d.v<0) return err('There are no workers left to let go.'); const n=Math.max(0,u.w+(+d.v)); if(n>mx) return err(`${mx} workers is the most this unit can use. Expand the unit or open another.`); u.w=n; render(); },
  startcyc:d=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u); if(!tryStart(c,u)){ render(); return err(`${coName(c)} needs ${rp(BIZ[u.t].lv[u.lv].input*cpi(S.h)*(BIZ[u.t].land?landAdj(u.reg):1))} in its account to buy inputs for a new cycle; it holds ${rp(c.cash)}.`); } render(); },
  upgrade:d=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u), cost=upgradeCost(u); if(c.cash<cost) return err(`Not enough capital to expand. ${coName(c)} needs ${rp(cost)} and holds ${rp(c.cash)}. Inject capital or take a working-capital loan first.`); c.cash-=cost; u.book+=cost; u.cap+=cost; u.lv++; const Lv=BIZ[u.t].lv[u.lv]; logm(`${coName(c)} expanded ${BIZ[u.t].n} in ${REG[u.reg].n} to ${Lv.l} for ${rp(cost)}. It now needs ${Lv.staff} workers.`,'good'); render(); },
  sellunit:d=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u); askConfirm(`Sell ${BIZ[u.t].n} (${BIZ[u.t].lv[u.lv].l}) in ${esc(REG[u.reg].n)}? You recover about ${rp(u.book*0.5)}, half its book value. Any crop or stock in progress is lost.`,'Sell',()=>{ c.cash+=u.book*0.5; book(c,'opex',u.book*0.5); c.units.splice(c.units.indexOf(u),1); logm(`${coName(c)} sold ${BIZ[u.t].n} in ${REG[u.reg].n} for ${rp(u.book*0.5)}.`); render(); }); },
  setdir:d=>{ const c=acct(d.id); c.dir=Math.max(0,+document.getElementById('dir-'+c.id).value||0); logm(`${coName(c)} set your pay to ${rp(c.dir,true)} a month.`); render(); },
  dividend:d=>{ const c=acct(d.id); if(err(payDividend(c,+document.getElementById('div-'+c.id).value))) return; render(); },
  inject:d=>{ const c=acct(d.id); if(err(injectCapital(c,document.getElementById('injfrom-'+c.id).value,+document.getElementById('inj-'+c.id).value))) return; render(); },
  dissolve:d=>{ const c=acct(d.id); askConfirm(`Dissolve ${esc(coName(c))}? Business units sell at half book value, loans and taxes are settled, and what is left goes to the shareholders.`,'Dissolve',()=>{ if(err(dissolve(c))) return; render(); }); },
  hire:d=>hireModal(d.id,d.v,d.div),
  cotab:d=>{ S.sel.cotab=d.v; render(); },
  opendiv:d=>divModal(d.id),
  newdept:d=>deptModal(d.id),
  outsrc:d=>outModal(d.id,d.v),
  endout:d=>{ const c=acct(d.id), o=(c.outs||{})[d.v]; if(!o) return; askConfirm(`End the contract with ${esc(o.name)} for ${esc(JOBS[d.v].n.toLowerCase())}? The job is unhandled until a team or another vendor takes it.`,'End contract',()=>{ endOut(c,d.v); render(); }); },
  editdept:d=>deptModal(d.id,d.v),
  closedept:d=>{ const c=acct(d.id), t=(c.depts||[]).find(x=>x.id===d.v); if(!t) return; askConfirm(`Close ${esc(t.name)}? Its ${t.staff+(t.head?1:0)} people are let go with severance and its jobs become unhandled.`,'Close team',()=>{ closeDept(c,t); render(); }); },
  convert:d=>convertModal(d.id),
  desk:d=>deskModal(d.id),
  sellstake:d=>stakeModal(d.id),
  renamediv:d=>renameDivModal(d.id,d.v),
  closediv:d=>{ const c=acct(d.id), v=(c.divs||[]).find(x=>x.id===d.v); if(!v) return; const sev=v.head&&v.head.src==='pro'?2*v.head.sal:0;
    askConfirm(`Close ${esc(v.name)}? Its units go back to being monitored from head office or the nearest other division.${sev?` The division head's severance is ${rp(sev)}.`:''}`,'Close division',()=>{ if(sev){ c.cash-=sev; book(c,'wage',sev); } c.divs.splice(c.divs.indexOf(v),1); logm(`${coName(c)} closed ${v.name}.`); render(); }); },
  mfee:d=>{ const p=acct(d.id), s=acct(d.s); if(err(setFee(p,s,+document.getElementById('mf-p-'+d.s).value,+document.getElementById('mf-f-'+d.s).value))) return; render(); },
  join:d=>{ const c=acct(d.id); if(onBoard(c,'P')) return err('You already sit on this board. Under UU 40/2007 one person cannot be director and commissioner of the same PT.'); c.board.unshift({id:nid('B'),who:'P',role:d.v,src:'self',skill:0,integ:100,sal:0,since:S.h}); logm(`You join the board of ${coName(c)} as ${titleOf(c,c.board[0])}.`); render(); },
  fire:d=>{ const c=acct(d.id), f=findPerson(c,d.b); if(!f) return; const b=f.p;
    if(b.who==='P'){ c.board.splice(c.board.indexOf(b),1); c.dir=0; logm(`You step down from the board of ${coName(c)}. Your pay from it stops.`); render(); return; }
    const sev=b.src==='pro'?2*b.sal:0, t=personTitle(c,f);
    askConfirm(`Dismiss ${esc(b.name)} (${esc(t)})? ${sev?`Severance is ${rp(sev)}.`:'There is no severance, but the family will talk about it at Lebaran.'}`,'Dismiss',()=>{
      if(sev){ c.cash-=sev; book(c,'wage',sev); }
      removePerson(c,f);
      logm(`${coName(c)} dismissed ${b.name} as ${t}${sev?` with ${rp(sev)} severance`:''}.`); render(); }); },
  retire:()=>askConfirm('Retire now? The game ends today and you see the final tally of your net worth.','Retire',()=>{ endGame(`You retired on ${fdate(S.h)}.`); render(); }),
  spin:d=>spinModal(d.id,d.u),
  inb:d=>inbrengModal(d.id,d.u),
  merge:d=>mergeModal(d.id),
  rups:d=>rupsModal(d.id),
  movehome:()=>moveModal(),
  relocate:d=>relocateModal(d.id),
  rename:d=>renameModal(d.id),
  report:d=>{ const R=S.sel.rep||(S.sel.rep={e:'P',per:'Q',i:0}); R.e=d.id||'P'; R.i=0; S.tab='rep'; render(); window.scrollTo({top:0}); },
  bsal:d=>{ const c=acct(d.id), f=findPerson(c,d.b); if(!f) return; const b=f.p; const v=Math.round(+document.getElementById('bs-'+b.id).value);
    if(!(v>=0)) return err('Enter a monthly amount of zero or more.');
    if(b.src==='pro'&&v<umr(c.reg,S.h)) return err(`${b.name} is a professional and will not work below the regional minimum wage of ${rp(umr(c.reg,S.h))}.`);
    const old=b.sal; b.sal=v; logm(`${c.form==='PT'||c.form==='PTP'?(f.where==='board'?'RUPS resolution':'Direksi decision'):'Owner decision'}: ${personTitle(c,f)} ${b.name}'s pay at ${coName(c)} changes from ${rp(old)} to ${rp(v)} a month.${b.src==='pro'&&b.mkt>0&&v<0.8*b.mkt?' That is well under market; expect a resignation.':''}`); render(); },
  bankfor:d=>{ S.sel.acct=d.id; S.tab='bank'; render(); },
  tradefor:d=>{ S.sel.acct=d.id; S.tab='market'; render(); },
  bankacct:d=>{ S.sel.acct=d.v; render(); },
  tradeacct:d=>{ S.sel.acct=d.v; render(); },
  bondbuy:()=>{ const a=acct(S.sel.acct); if(err(buyBond(a,document.getElementById('bd-key').value,+document.getElementById('bd-amt').value))) return; render(); },
  bondsell:d=>{ const a=acct(S.sel.acct), b=(a.bonds||[]).find(x=>x.id===d.v); if(!b) return; askConfirm(`Sell ${rp(b.face)} of ${esc(b.name)} for about ${rp(b.face*bondPx(b)*0.998)} at today's market price?`,'Sell',()=>{ if(err(sellBond(a,d.v))) return; render(); }); },
  opendep:()=>{ const a=acct(S.sel.acct), amt=+document.getElementById('dep-amt').value||0, m=+document.getElementById('dep-m').value, aro=document.getElementById('dep-aro').checked;
    if(amt<1e6) return err('Deposito starts at Rp 1 juta.'); if(a.cash<amt) return err('Not enough in the rekening.');
    const r=depRate(S.h,m); a.cash-=amt; a.deps.push({id:nid('D'),amt,r,m,mat:addMonths(S.h,m),aro}); logm(`${acctName(a.id)} opened a ${m}-month deposito of ${rp(amt)} at ${pc(r)}.`); render(); },
  breakdep:d=>{ const a=acct(S.sel.acct), dp=a.deps.find(x=>x.id===d.v); if(!dp) return; const pen=dp.amt*0.005; a.cash+=dp.amt-pen; book(a,'intx',pen); a.deps.splice(a.deps.indexOf(dp),1); logm(`${acctName(a.id)} broke a deposito early: ${rp(dp.amt-pen)} returned after penalty.`,'bad'); render(); },
  loan:()=>{ const a=acct(S.sel.acct); if(err(takeLoan(a.id,document.getElementById('ln-p').value,+document.getElementById('ln-amt').value,+document.getElementById('ln-n').value))) return; render(); },
  payoff:d=>{ const a=acct(S.sel.acct), l=a.loans.find(x=>x.id===d.v); if(!l) return; const amt=l.bal*1.01; if(a.cash<amt) return err(`Pay-off needs ${rp(amt)} in the rekening (balance + 1% early repayment fee).`); a.cash-=amt; book(a,'intx',l.bal*0.01); a.loans.splice(a.loans.indexOf(l),1); logm(`${acctName(a.id)} paid off ${l.name} early (${rp(amt)}).`,'good'); render(); },
  sym:d=>{ S.sel.sym=d.v; render(); },
  range:d=>{ S.sel.range=d.v; render(); },
  buy:()=>orderFromForm('buy'),
  sell:()=>orderFromForm('sell'),
  cancelorder:d=>{ S.orders=S.orders.filter(o=>o.id!==d.v); render(); },
};
const CHG={
  sal:(d,el)=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u); u.sal=Math.max(0,+el.value||0); logm(`${coName(c)} set ${BIZ[u.t].n} wages in ${REG[u.reg].n} to ${rp(u.sal,true)} a month.`); render(); },
  auto:(d,el)=>{ const c=acct(d.id), u=c.units.find(x=>x.id===d.u); u.auto=el.checked; render(); },
  autoumr:(d,el)=>{ acct(d.id).autoUMR=el.checked; },
  dfn:(d,el)=>{ const c=acct(d.id), b=c.board.find(x=>x.id===d.b); if(!b) return; const v=el.value;
    if(v&&v!=='ceo'&&!SZ(c).fn){ render(); return err(`Functional directors need a company of at least Usaha Kecil. ${nextLevelText(c)}`); }
    const prev=c.board.find(x=>x!==b&&x.role==='dir'&&v&&x.fn===v); if(prev){ prev.fn=''; }
    b.fn=v; logm(`${coName(c)}: ${b.who==='P'?'you are':b.name+' is'} now ${titleOf(c,b)}${prev?`; ${prev.who==='P'?'you move':prev.name+' moves'} to ${titleOf(c,prev)}`:''}.`); render(); },
  payp:(d,el)=>{ const c=acct(d.id); c.pay.mode=el.value; logm(`${coName(c)} pay policy: ${PAY_MODES[el.value].toLowerCase()}.`); },
  payplus:(d,el)=>{ const c=acct(d.id); c.pay.plus=clamp(+el.value||0,0,20); },
  paystaff:(d,el)=>{ acct(d.id).pay.staff=el.checked; },
  rups:(d,el)=>{ const c=acct(d.id), R=c.rups; if(d.k==='auto') R.auto=el.checked; else if(d.k==='month') R.month=+el.value; else if(d.k==='pay') R.pay=clamp((+el.value||0)/100,0,1); else if(d.k==='res') R.res=clamp(Math.round(+el.value||0),0,24); liveTick(); },
  repe:(d,el)=>{ S.sel.rep.e=el.value; S.sel.rep.i=0; render(); },
  repper:(d,el)=>{ S.sel.rep.per=el.value; S.sel.rep.i=0; render(); },
  repi:(d,el)=>{ S.sel.rep.i=+el.value||0; render(); },
  regp:(d,el)=>{ S.sel.regf.p=el.value; liveTick(); },
  regb:(d,el)=>{ S.sel.regf.b=el.value; liveTick(); },
};
document.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(!b||!S&&b.dataset.act!=='close') return; if(b.disabled) return; const f=ACT[b.dataset.act]; if(f){ e.preventDefault(); f(b.dataset,b); } });
document.addEventListener('change',e=>{ const el=e.target.closest('[data-chg]'); if(!el||!S) return; CHG[el.dataset.chg]?.(el.dataset,el); });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') closeModal();
  if(e.code==='Space' && S && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||'') && !document.getElementById('scrim')){ e.preventDefault(); S.paused=!S.paused; syncSpeed(); }
});
addEventListener('resize',()=>S&&drawCharts());

/* ---------- Loop & persistence */
function save(){ if(!S) return; try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){} }
let last=performance.now(), acc=0, lastLive=0, lastChart=0, lastSave=0;
function frame(t){
  const dt=Math.min(1000,t-last); last=t;
  if(S && !S.paused && !S.over){
    acc+=dt/1000*S.speed; let n=Math.floor(acc); acc-=n; n=Math.min(n,400);
    for(let i=0;i<n && !S.over;i++) step();
    if(S.over) render();
  }
  if(S && document.getElementById('main')){
    const focus=document.activeElement, typing=focus&&/INPUT|SELECT|TEXTAREA/.test(focus.tagName)&&focus.type!=='range'&&document.getElementById('main').contains(focus);
    if(S.dirty && !typing && !document.getElementById('scrim')) render();
    if(t-lastLive>200){ liveTick(); lastLive=t; }
    if(t-lastChart>1000){ if(!S.paused) drawCharts(); lastChart=t; }
    if(t-lastSave>5000){ save(); lastSave=t; }
  }
  requestAnimationFrame(frame);
}


