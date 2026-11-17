'use strict';
/* ============================================================
   FINANCIAL REPORTS · quarterly and yearly, with profit sources
   ============================================================ */
function srcAdd(a,key,amt){ if(!a||!amt) return; const m=a.srcM||(a.srcM={}); m[key]=(m[key]||0)+amt; }
function expAdd(key,amt){ if(!amt) return; const m=S.P.expM||(S.P.expM={}); m[key]=(m[key]||0)+amt; }
function balanceOf(c){ const liq=liquid(c), ub=unitBook(c), d=debt(c), eq=equity(c); return {cash:c.cash,dep:depSum(c),sh:holdMV(c),bd:bondMV(c),ub,stk:eq-(liq+ub-d-(c.taxDue||0)),debt:d,tax:c.taxDue||0,eq}; }
function balanceP(){ return {cash:S.P.cash,dep:depSum(S.P),sh:holdMV(S.P),bd:bondMV(S.P),stk:stakesP(),debt:debt(S.P),eq:nwP()}; }
function closePersonalMonth(k){
  const P=S.P, src=P.srcM||{}, names={};
  for(const key in src){ const id=key.split(':')[1]; if(id){ const c=acct(id); names[id]=c?coName(c):(S.cname?.[id]||'(closed company)'); } }
  (P.hist||(P.hist=[])).push({k,src,exp:P.expM||{},names,bs:balanceP()}); if(P.hist.length>240) P.hist.shift();
  P.srcM={}; P.expM={};
}
const REP_LINES=[['Revenue','rev',1],['Cost of goods / inputs','cogs',-1],['Wages, board, BPJS, THR','wage',-1],['Rent & operating','opex',-1],['Monitoring & travel','mon',-1],['Depreciation','dep',-1],['Interest & fees','intx',-1],['Other income','other',1],['Management fees received','mfi',1],['Management fees paid','mfee',-1],['Outsourcing fees','outs',-1],['Income tax','tax',-1],['Fines','fine',-1],['Fraud & credit losses','loss',-1]];
const QN=['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'];
function periods(hist,per){
  const g=new Map();
  for(const e of hist||[]){ const y=Math.floor(e.k/100), m=e.k%100, key=per==='Q'?y*10+Math.ceil(m/3):y; if(!g.has(key)) g.set(key,[]); g.get(key).push(e); }
  const cur=dOf(S.h), cy=cur.getUTCFullYear(), cq=Math.floor(cur.getUTCMonth()/3)+1, curKey=per==='Q'?cy*10+cq:cy, need=per==='Q'?3:12;
  return [...g.entries()].sort((a,b)=>b[0]-a[0]).map(([key,ms])=>{ const y=per==='Q'?Math.floor(key/10):key, q=key%10;
    const label=per==='Q'?`Q${q} ${y}`:`FY ${y}`, sub=per==='Q'?QN[q-1]+' '+y:'Jan–Dec '+y;
    return {key,label,sub,ms,state:key===curKey?'to date':ms.length<need?'partial':''}; });
}
function sumPL(ms){ const s=blankPL(); s.net=0; const src={}, units={}, exp={}, names={};
  for(const e of ms){ for(const f in s) if(f!=='net') s[f]+=e[f]||0; s.net+=e.net||0;
    for(const k in e.src||{}) src[k]=(src[k]||0)+e.src[k];
    for(const k in e.exp||{}) exp[k]=(exp[k]||0)+e.exp[k];
    Object.assign(names,e.names||{});
    for(const k in e.units||{}){ const [l,v]=e.units[k]; units[k]=[l,(units[k]?.[1]||0)+v]; } }
  return {pl:s,src,units,exp,names,bs:ms[ms.length-1]?.bs||null}; }
function srcLabel(k,names,company){ const [t,id]=k.split(':'); const nm=id?(names[id]||(acct(id)?coName(acct(id)):'(closed company)')):'';
  return {mfee:`Management fee from ${nm}`,div:company?`Dividends from ${nm}`:`Dividends · ${nm}`,sal:`Pay · ${nm}`,int:'Bank interest',stkdiv:'IDX dividends',gain:'Share trading gains',bond:'Government bond coupons',bondgain:'Bond gains and losses'}[t]||k; }
function profitSlices(S1,company){
  const out=[];
  if(company) for(const k in S1.units) out.push({l:S1.units[k][0],v:S1.units[k][1],kind:'unit'});
  for(const k in S1.src) out.push({l:srcLabel(k,S1.names,company),v:S1.src[k],kind:k.split(':')[0]});
  return out.sort((a,b)=>b.v-a.v);
}
let PIE=null;
const pctChg=(a,b)=>b?((a-b)/Math.abs(b)):null;
function vRep(){
  const R=S.sel.rep||(S.sel.rep={e:'P',per:'Q',i:0});
  if(R.e!=='P'&&!acct(R.e)) R.e='P';
  const isP=R.e==='P', c=isP?null:acct(R.e), hist=isP?S.P.hist:c.hist, ps=periods(hist,R.per);
  if(R.i>=ps.length) R.i=0;
  const head=`<section class="panel"><div class="panel-h"><div><h2>Financial report</h2><div class="note">${isP?'Your personal income and wealth.':esc(FORMS[c.form].n)+' · office in '+esc(REG[c.reg].n)+'.'} Built from closed months only.</div></div>
    <div class="fields" style="flex:1;max-width:640px">
      <label class="f">Report for<select id="rp-e" data-chg="repe"><option value="P" ${isP?'selected':''}>Personal (you)</option>${orderedCos().map(({c:x,depth})=>`<option value="${x.id}" ${x.id===R.e?'selected':''}>${'· '.repeat(depth)}${esc(coName(x))}</option>`).join('')}</select></label>
      <label class="f">Period<select id="rp-per" data-chg="repper"><option value="Q" ${R.per==='Q'?'selected':''}>Quarterly</option><option value="Y" ${R.per==='Y'?'selected':''}>Yearly</option></select></label>
      <label class="f">${R.per==='Q'?'Quarter':'Year'}<select id="rp-i" data-chg="repi">${ps.map((p,i)=>`<option value="${i}" ${i===R.i?'selected':''}>${p.label}${p.state?' ('+p.state+')':''}</option>`).join('')||'<option>None yet</option>'}</select></label>
    </div></div>`;
  if(!ps.length){ PIE=null; return head+`<div class="panel-b"><p class="note">${isP?'Your first report appears when the first month closes on the 1st.':`${esc(coName(c))} has no closed month yet. Its first report appears on the 1st.`}</p></div></section>`; }
  const P0=ps[R.i], P1=ps[R.i+1], A=sumPL(P0.ms), B=P1?sumPL(P1.ms):null;
  const cmp=(a,b,inv)=>{ const ch=b==null?null:pctChg(a,b); return `<td class="n">${rp(a)}</td><td class="n">${b==null?'—':rp(b)}</td><td class="n ${ch==null?'':cls(inv?-ch:ch)}">${ch==null||!isFinite(ch)?'—':sgn(ch,x=>pc(x,0))}</td>`; };
  const th=`<thead><tr><th></th><th class="n">${P0.label}</th><th class="n">${P1?P1.label:'Previous'}</th><th class="n">Change</th></tr></thead>`;
  const slices=profitSlices(A,!isP), pos=slices.filter(x=>x.v>0), neg=slices.filter(x=>x.v<0), gross=pos.reduce((s,x)=>s+x.v,0);
  let pie=pos.slice(0,7); if(pos.length>8){ pie.push({l:`Other (${pos.length-7} sources)`,v:pos.slice(7).reduce((s,x)=>s+x.v,0),kind:'other'}); } else pie=pos;
  PIE={s:pie,total:gross};
  const net=isP?(pos.reduce((s,x)=>s+x.v,0)+neg.reduce((s,x)=>s+x.v,0)-Object.values(A.exp).reduce((s,x)=>s+x,0)):A.pl.net;
  const overhead=isP?0:gross+neg.reduce((s,x)=>s+x.v,0)-net;
  let body='';
  if(!isP){
    const lines=REP_LINES.filter(([,f])=>Math.abs(A.pl[f]||0)>0.5||(B&&Math.abs(B.pl[f]||0)>0.5)||f==='rev');
    body+=`<div class="grid2"><section class="panel"><div class="panel-h"><h3>Income statement</h3><span class="eyebrow">${esc(P0.sub)}${P0.state?' · '+P0.state:''}</span></div><div class="panel-b"><div class="tbl-wrap"><table>${th}<tbody>
      ${lines.map(([l,f,sg])=>`<tr><td>${l}</td>${cmp(sg*(A.pl[f]||0),B?sg*(B.pl[f]||0):null,sg<0)}</tr>`).join('')}
      <tr class="tot"><td><b>Net profit</b></td>${cmp(A.pl.net,B?B.pl.net:null)}</tr></tbody></table></div>
      <div class="rows"><div class="row"><span class="k">Net margin</span><span class="v">${A.pl.rev?pc(A.pl.net/A.pl.rev,1):'—'}</span></div>
      <div class="row"><span class="k">Return on equity, annualised</span><span class="v">${A.bs&&A.bs.eq>0?pc(A.pl.net*12/P0.ms.length/A.bs.eq,1):'—'}</span></div></div></div></section>
    ${pieSection(P0,gross,neg,overhead,net,false)}</div>`;
    const bl=[['Bank account','cash'],['Deposito','dep'],['Listed shares','sh'],['Government bonds','bd'],['Business assets (book)','ub'],['Stakes in subsidiaries','stk'],['Loans','debt',-1],['Tax payable','tax',-1]];
    body+=`<section class="panel"><div class="panel-h"><h3>Balance sheet</h3><span class="eyebrow">at end of ${P0.label}${P0.state==='to date'?' (last closed month)':''}</span></div><div class="panel-b">${A.bs?`<div class="tbl-wrap"><table>${th}<tbody>
      ${bl.map(([l,f,sg])=>`<tr><td>${l}</td>${cmp((sg||1)*(A.bs[f]||0),B?.bs?(sg||1)*(B.bs[f]||0):null,sg<0)}</tr>`).join('')}
      <tr><td><b>Equity</b></td>${cmp(A.bs.eq,B?.bs?B.bs.eq:null)}</tr></tbody></table></div><p class="note">Paid-up capital today ${rp(c.paidIn)}, statutory reserve ${rp(c.reserve||0)}.</p>`:'<p class="note">Balance sheets are recorded from now on; this period closed before the feature existed.</p>'}</div></section>`;
  } else {
    const keys=[...new Set([...Object.keys(A.src),...(B?Object.keys(B.src):[])])].sort();
    const ex=[['living','Living costs'],['interest','Loan and overdraft interest'],['tax','Income tax on share sales']];
    const totI=x=>Object.values(x.src).reduce((s,v)=>s+v,0), totE=x=>Object.values(x.exp).reduce((s,v)=>s+v,0);
    body+=`<div class="grid2"><section class="panel"><div class="panel-h"><h3>Personal income statement</h3><span class="eyebrow">${esc(P0.sub)}${P0.state?' · '+P0.state:''}</span></div><div class="panel-b"><div class="tbl-wrap"><table>${th}<tbody>
      ${keys.map(k=>`<tr><td>${esc(srcLabel(k,{...(B?.names||{}),...A.names},false))}</td>${cmp(A.src[k]||0,B?(B.src[k]||0):null)}</tr>`).join('')||'<tr><td colspan="4" class="muted">No income this period.</td></tr>'}
      <tr><td><b>Total income</b></td>${cmp(totI(A),B?totI(B):null)}</tr>
      ${ex.filter(([k])=>A.exp[k]||B?.exp[k]).map(([k,l])=>`<tr><td>${l}</td>${cmp(-(A.exp[k]||0),B?-(B.exp[k]||0):null,true)}</tr>`).join('')}
      <tr><td><b>Saved</b></td>${cmp(totI(A)-totE(A),B?totI(B)-totE(B):null)}</tr></tbody></table></div>
      <p class="note">Income is after tax: dividends net of withholding, pay net of PPh 21, interest net of the 20% final tax.</p></div></section>
    ${pieSection(P0,gross,neg,0,net,true)}</div>`;
    const bl=[['Bank account','cash'],['Deposito','dep'],['Listed shares','sh'],['Government bonds','bd'],['Stakes in your companies','stk'],['Personal loans','debt',-1]];
    body+=`<section class="panel"><div class="panel-h"><h3>Personal balance sheet</h3><span class="eyebrow">at end of ${P0.label}</span></div><div class="panel-b"><div class="tbl-wrap"><table>${th}<tbody>
      ${bl.map(([l,f,sg])=>`<tr><td>${l}</td>${cmp((sg||1)*(A.bs[f]||0),B?(sg||1)*(B.bs[f]||0):null,sg<0)}</tr>`).join('')}
      <tr><td><b>Net worth</b></td>${cmp(A.bs.eq,B?B.bs.eq:null)}</tr></tbody></table></div></div></section>`;
  }
  return head+'</section>'+body;
}
function pieSection(P0,gross,neg,overhead,net,isP){
  const sl=PIE.s;
  return `<section class="panel"><div class="panel-h"><h3>${isP?'Where your income comes from':'Where the profit comes from'}</h3><span class="eyebrow">${P0.label}</span></div><div class="panel-b">
    ${sl.length?`<div class="pie-wrap"><canvas class="pie" data-chart="pie" aria-label="Pie chart of ${isP?'income':'profit'} sources"></canvas><div class="pie-tip" id="pie-tip" hidden></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Source</th><th class="n">Amount</th><th class="n">Share</th></tr></thead><tbody>
      ${sl.map((x,i)=>`<tr><td><span class="sw" style="background:var(--s${i+1})"></span>${esc(x.l)}</td><td class="n">${rp(x.v)}</td><td class="n">${pc(x.v/gross,1)}</td></tr>`).join('')}
      ${neg.map(x=>`<tr class="muted"><td><span class="sw neg"></span>${esc(x.l)}</td><td class="n down">${rp(x.v)}</td><td class="n">loss</td></tr>`).join('')}
      ${!isP?`<tr class="muted"><td><span class="sw neg"></span>Company overhead: board pay, fees, interest, tax</td><td class="n down">${rp(-overhead)}</td><td class="n"></td></tr><tr><td><b>Net profit</b></td><td class="n"><b>${rp(net)}</b></td><td></td></tr>`:''}
    </tbody></table></div>
    <p class="note">Shares are of all positive sources${isP?'':' before company overhead'}. ${isP?'Dividends are split by the company that paid them.':'Business units are measured after their own inputs, wages, rent, monitoring and depreciation; dividends are split by the subsidiary that paid them.'}</p>`
    :`<p class="note">No positive ${isP?'income':'profit'} sources in this period.${neg.length?' Every source lost money.':''}</p>`}
  </div></section>`;
}
function drawPie(cv){
  const s=setupCanvas(cv); if(!s||!PIE||!PIE.s.length) return; const {g,w,h}=s;
  const cx=w/2, cy=h/2, R=Math.min(w,h)/2-6, r0=R*0.58, surf=tok('--surface'), ink=tok('--ink'), mut=tok('--muted');
  let a=-Math.PI/2; const arcs=[];
  PIE.s.forEach((x,i)=>{ const da=2*Math.PI*x.v/PIE.total; g.beginPath(); g.moveTo(cx+r0*Math.cos(a),cy+r0*Math.sin(a)); g.arc(cx,cy,R,a,a+da); g.arc(cx,cy,r0,a+da,a,true); g.closePath(); g.fillStyle=tok('--s'+(i+1)); g.fill(); g.strokeStyle=surf; g.lineWidth=2; g.stroke(); arcs.push([a,a+da,x,i]); a+=da; });
  g.fillStyle=ink; g.textAlign='center'; g.font='600 15px '+tok('--f-mono'); g.fillText(rp(PIE.total),cx,cy+2);
  g.fillStyle=mut; g.font='11px '+tok('--f-body'); g.fillText('from '+PIE.s.length+' source'+(PIE.s.length>1?'s':''),cx,cy+18);
  cv._arcs=arcs; cv._geo={cx,cy,R,r0};
  if(!cv._hov){ cv._hov=true;
    cv.addEventListener('mousemove',e=>{ const tip=document.getElementById('pie-tip'); if(!tip||!cv._arcs) return; const b=cv.getBoundingClientRect(), x=e.clientX-b.left, y=e.clientY-b.top, G=cv._geo, d=Math.hypot(x-G.cx,y-G.cy);
      let ang=Math.atan2(y-G.cy,x-G.cx); if(ang<-Math.PI/2) ang+=2*Math.PI;
      const hit=d>=G.r0-4&&d<=G.R+6?cv._arcs.find(([a0,a1])=>ang>=a0&&ang<a1):null;
      if(!hit){ tip.hidden=true; return; } const [, ,sl]=hit; tip.hidden=false; tip.innerHTML=`<b>${esc(sl.l)}</b>${rp(sl.v)} · ${pc(sl.v/PIE.total,1)}`; tip.style.left=Math.min(x+12,b.width-180)+'px'; tip.style.top=(y+12)+'px'; });
    cv.addEventListener('mouseleave',()=>{ const tip=document.getElementById('pie-tip'); if(tip) tip.hidden=true; }); }
}

/* ---------- Regions */
function vRegions(){
  const f=S.sel.regf||(S.sel.regf={p:'',b:''});
  return `<section class="panel"><div class="panel-h"><div><h2>Indonesia</h2><div class="note">${Object.keys(REG).length} regencies in ${PROVS.length} provinces. Home base: <b>${esc(REG[S.home].n)}</b>. Squares are head offices and diamonds regional divisions; lines run from each office to the units it manages, and monitoring costs grow with that distance.</div></div><button class="btn sm" data-act="movehome">Move home</button></div>
    <div class="panel-b"><canvas class="map" data-chart="map" aria-label="Map of regencies, home base and your operations"></canvas>
    <div class="note">Grey dots are regencies, filled dots are business units, squares are head offices, diamonds are regional divisions, the ring is your home.</div></div></section>
  <section class="panel"><div class="panel-h"><h3>Regency directory</h3>
    <div class="fields" style="flex:1;max-width:460px"><label class="f">Province<select id="rf-p" data-chg="regp"><option value="">All provinces</option>${PROVS.map(p=>`<option ${f.p===p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
    <label class="f">Specialty<select id="rf-b" data-chg="regb"><option value="">Any</option>${Object.entries(BIZ).filter(([k])=>Object.values(REG).some(r=>r.spec.includes(k)||r.boost.includes(k))).map(([k,b])=>`<option value="${k}" ${f.b===k?'selected':''}>${b.n}</option>`).join('')}</select></label></div></div>
    <div class="panel-b">${LH(()=>regTable())}</div></section>`;
}
function regTable(){
  const f=S.sel.regf, used={}; for(const c of S.C) for(const u of c.units) used[u.reg]=(used[u.reg]||0)+1;
  const ids=Object.keys(REG).filter(k=>(!f.p||REG[k].prov===f.p)&&(!f.b||REG[k].spec.includes(f.b)||REG[k].boost.includes(f.b)));
  if(!ids.length) return '<p class="note">No regency matches both filters.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Regency</th><th>Specialties (+25%) · strong markets (↑)</th><th class="n">UMR</th><th class="n">From home</th><th class="n">Monitoring from home</th><th class="n">Your units</th></tr></thead><tbody>${ids.map(k=>{const r=REG[k], d=km(S.home,k);
    return `<tr><td><b>${esc(r.n)}</b>${k===S.home?' <span class="chip acc">home</span>':''}<div class="muted" style="font-size:.75rem">${esc(provOf(k))} · ${TYPE_N[r.type]}</div></td><td>${specChips(r)}</td><td class="n">${rp(umr(k,S.h))}</td><td class="n">${NF.format(d)} km</td><td class="n">${rp(120e3*cpi(S.h)*(1+d/150))}</td><td class="n">${used[k]||'—'}</td></tr>`;}).join('')}</tbody></table></div>
    <p class="note">Monitoring is shown before any discount from a strong board of directors. Remote regencies cost more to set up and rent in.</p>`;
}
function drawMap(cv){
  const s=setupCanvas(cv); if(!s) return; const {g,w,h}=s;
  const X=lon=>10+(w-20)*(lon-94.5)/(141.5-94.5), Y=lat=>10+(h-20)*(6.5-lat)/(6.5+11);
  const mut=tok('--muted'), acc=tok('--accent'), ink=tok('--ink');
  const used=new Set(S.C.flatMap(c=>c.units.map(u=>u.reg))), H=REG[S.home];
  g.font='600 10px '+tok('--f-body'); g.fillStyle=mut; g.globalAlpha=.7; g.textAlign='center';
  for(const [n,lo,la] of [['SUMATERA',98.5,-3.2],['JAWA',109.5,-9.4],['KALIMANTAN',113.5,1.9],['SULAWESI',121.2,-6.4],['NUSA TENGGARA',121.5,-11],['MALUKU',129.8,-1.6],['PAPUA',137.5,-7]]) g.fillText(n,X(lo),Y(la));
  g.globalAlpha=1; g.strokeStyle=acc; g.lineWidth=1.2; g.setLineDash([3,3]);
  for(const c of S.C){ for(const v of c.divs||[]){ const O=REG[c.reg], D=REG[v.reg]; g.beginPath(); g.moveTo(X(O.lon),Y(O.lat)); g.lineTo(X(D.lon),Y(D.lat)); g.stroke(); } for(const u of c.units){ const o=officeFor(c,u.reg); if(!o.d) continue; const O=REG[o.reg], r=REG[u.reg]; g.beginPath(); g.moveTo(X(O.lon),Y(O.lat)); g.lineTo(X(r.lon),Y(r.lat)); g.stroke(); } }
  g.setLineDash([]);
  for(const r of Object.values(REG)){ const u=used.has(r.id); g.beginPath(); g.arc(X(r.lon),Y(r.lat),u?5:3,0,7); g.fillStyle=u?acc:mut; g.globalAlpha=u?1:.5; g.fill(); }
  g.globalAlpha=1; g.fillStyle=ink; for(const id of new Set(S.C.map(c=>c.reg))){ const O=REG[id]; g.fillRect(X(O.lon)-4,Y(O.lat)-4,8,8); }
  for(const id of new Set(S.C.flatMap(c=>(c.divs||[]).map(v=>v.reg)))){ const O=REG[id], x=X(O.lon), y=Y(O.lat); g.beginPath(); g.moveTo(x,y-6); g.lineTo(x+6,y); g.lineTo(x,y+6); g.lineTo(x-6,y); g.closePath(); g.fill(); }
  g.beginPath(); g.arc(X(H.lon),Y(H.lat),9,0,7); g.strokeStyle=ink; g.lineWidth=2; g.stroke();
  g.font='12px '+tok('--f-body'); g.fillStyle=ink; const right=X(H.lon)>w*0.75; g.textAlign=right?'right':'left'; g.fillText(H.n, X(H.lon)+(right?-13:13), Y(H.lat)-11);
}

