'use strict';
/* ============================================================
   COMPANY SIZE · UMKM classes decide structure and talent
   ============================================================ */
const LEVELS=[
  {n:'Mikro',dirs:2,koms:1,staff:2,mgr:0,vp:0,divs:0,fn:false,tal:{m:55,sd:7,cap:66}},
  {n:'Kecil',dirs:3,koms:2,staff:6,mgr:3,vp:0,divs:1,fn:true,tal:{m:64,sd:8,cap:76}},
  {n:'Menengah',dirs:5,koms:3,staff:12,mgr:8,vp:3,divs:3,fn:true,tal:{m:73,sd:9,cap:88}},
  {n:'Besar',dirs:7,koms:5,staff:24,mgr:16,vp:8,divs:8,fn:true,tal:{m:82,sd:8,cap:97}},
];
function sizeRules(h){ const k=keyH(h);
  if(k<20080704) return {law:'UU 9/1995 and Inpres 10/1999',A:[50e6,200e6,10e9],T:[100e6,1e9,50e9]};
  if(k<20210202) return {law:'UU 20/2008 on UMKM',A:[50e6,500e6,10e9],T:[300e6,2.5e9,50e9]};
  return {law:'PP 7/2021',A:[1e9,5e9,10e9],T:[2e9,15e9,50e9]};
}
function turnover12(c){ const hs=(c.hist||[]).slice(-12); if(!hs.length) return 0; const s=hs.reduce((t,e)=>t+(e.rev||0)+(e.mfi||0),0); return hs.length>=3?s*12/hs.length:s; }
function sizeOf(assets,turn,h){ const R=sizeRules(h), la=R.A.findIndex(x=>assets<=x), lt=R.T.findIndex(x=>turn<=x); return Math.max(la<0?3:la, lt<0?3:lt); }
const levelOf=c=>sizeOf(Math.max(0,equity(c)),turnover12(c),S.h);
const SZ=c=>LEVELS[c.level||0];
function nextLevelText(c){ const lv=c.level||0; if(lv>=3) return ''; const R=sizeRules(S.h);
  return `Usaha ${LEVELS[lv+1].n} needs turnover above ${rp(R.T[lv])} a year or net assets above ${rp(R.A[lv])} (${R.law}); ${coName(c)} has ${rp(turnover12(c))} and ${rp(Math.max(0,equity(c)))}.`; }
function unlockText(n){ const Z=LEVELS[n], nj=Object.keys(JOBS).filter(j=>JOBS[j].lv===n).length; return `It can now run up to ${DEPT_MAX[n]} teams, each led by a ${HEADT[n].t}, ${Z.dirs} directors${Z.divs?` and ${Z.divs} regional division${Z.divs>1?'s':''}`:''}; ${nj} new job${nj===1?' comes':'s come'} up, and better-qualified people apply.`; }
function updateLevel(c,quiet){ const n=levelOf(c), o=c.level??n; c.level=n;
  if(!quiet&&n!==o){ const Z=LEVELS[n]; logm(`${coName(c)} is now a Usaha ${Z.n} under ${sizeRules(S.h).law}. ${n>o?unlockText(n):'Existing staff stay, but no new positions above its size can be added.'}`, n>o?'good':'bad'); if(n>o) toast('Company grew',`${coName(c)} is now Usaha ${Z.n}.`); S.dirty=true; } }

/* ---------- Functions, tiers and pay */
const FN={ceo:{n:'Utama',en:'Chief executive',t:'Direktur Utama'},fin:{n:'Keuangan',en:'Finance',t:'Direktur Keuangan (CFO)'},ops:{n:'Operasional',en:'Operations',t:'Direktur Operasional (COO)'},mkt:{n:'Pemasaran',en:'Marketing',t:'Direktur Pemasaran (CMO)'},hr:{n:'SDM',en:'Human resources',t:'Direktur SDM (CHRO)'}};
const FNS=['fin','ops','mkt','hr'];
const FN_EFF={fin:'catches fraud and lowers loan rates',ops:'cuts leakage and monitoring costs',mkt:'lifts sales and selling prices',hr:'prevents labour fines and resignations, lifts staff output'};
const TIER={dir:{n:'director',m:6,fee:2,adj:0},kom:{n:'commissioner',m:2.5,fee:2,adj:0},vp:{n:'VP',m:5,fee:2,adj:0},mgr:{n:'manager',m:2.5,fee:2,adj:-4},staff:{n:'head-office staff member',m:1.3,fee:0.5,adj:-10},divhead:{n:'regional division head',m:3,fee:2,adj:-2}};
const TIERCODE={dir:3,kom:7,vp:11,mgr:13,staff:17,divhead:19};
const TW={dir:1,vp:0.9,mgr:0.75,staff:0.5};
const BGS={
  dir:[['Former shop supervisor','Ex-koperasi manager','Local bookkeeper','Former bank teller','Retired civil servant','Ten years in the family trade'],
       ['Regional bank branch officer','Former distributor sales head','Ex-minimarket area supervisor','Former plantation assistant manager','Accounting graduate, state university','Local business consultant'],
       ['Ex-branch manager at a state bank','Former plantation estate manager','Big Four audit manager','Ex-operations head at a retail chain','Former BUMN division head','MBA, ex-management consultant'],
       ['Big Four partner','Ex-CFO of a listed company','Former Astra division director','MBA abroad, ex-strategy consultant','Former BUMN director','Ex-country head at a multinational']],
  kom:[['Retired school principal','Retired civil servant','Respected local trader','Retired village head','Retired police officer','Local mosque or church elder'],
       ['Retired bank branch manager','Local public accountant','Retired regional official','Kadin (chamber of commerce) officer','University lecturer','Retired tax office head'],
       ['Retired bank director','Independent public accountant','Business school professor','Retired Astra executive','Former OJK examiner','Retired provincial secretary'],
       ['Former OJK commissioner','Retired minister','Former BUMN president director','Retired central bank deputy governor','Senior law firm partner','Former ambassador']],
  staff:[['SMA graduate','SMK accounting graduate','Former shop cashier','D3 graduate','Two years as an admin clerk','Former koperasi clerk'],
         ['D3 accounting graduate','S1 graduate, local university','Former bank teller','Ex-minimarket supervisor','Two years at a distributor','Former admin at a plantation'],
         ['S1 graduate, state university','Big Four junior associate','Management trainee at a bank','Former Astra staff','English-speaking S1 graduate','Ex-BUMN staff'],
         ['S1 cum laude, top state university','Ex-Big Four senior associate','Former multinational analyst','Overseas graduate','Ex-bank management trainee','Former consulting analyst']],
};
const bgList=(role,lv)=>(role==='kom'?BGS.kom:role==='staff'?BGS.staff:BGS.dir)[lv];
function marketPay(c,role,skill,lv){ lv=lv??(c.level||0); const base=umr(c.reg||S.home,S.h), f=Math.pow(clamp((skill-40)/56,0,1),1.6); return Math.max(base,Math.round(base*TIER[role].m*(0.5+1.5*f)*(1+0.15*lv)/50000)*50000); }
function famPay(c,role,x){ const base=umr(c.reg||S.home,S.h); return Math.max(role==='kom'?0:base,Math.round(base*TIER[role].m*0.3*(0.8+0.7*x)/50000)*50000); }
function candidates(c,role){
  const d=dOf(S.h), mi=d.getUTCFullYear()*12+d.getUTCMonth(), n=parseInt(c.id.slice(1))||1, lv=c.level||0, T=LEVELS[lv].tal, tr=TIER[role];
  const r=mulberry((hash3(S.seed>>>0,n*31+TIERCODE[role],mi)*4294967296)|0);
  const y=yearOf(S.h), out=[];
  for(let i=0;i<6;i++){
    const fam=i<3, key=`${mi}-${role}-${i}`, first=FIRST[Math.floor(r()*FIRST.length)];
    let o;
    if(fam){ const rel=REL[Math.floor(r()*REL.length)], nm=rel[2][Math.floor(r()*rel[2].length)], skill=Math.round(clamp(45+gauss(r)*15+tr.adj*0.5,15,80)), integ=Math.round(clamp(78+gauss(r)*12,35,99));
      o={key,src:'fam',name:`${rel[0]} ${nm}`,bg:rel[1],skill,integ,sal:famPay(c,role,r()),fee:0}; }
    else { const last=LAST[Math.floor(r()*LAST.length)], skill=Math.round(clamp(T.m+tr.adj+gauss(r)*T.sd,40,T.cap+(role==='staff'?-8:0))), integ=Math.round(clamp(72+gauss(r)*15,30,99));
      let bg=bgList(role,lv)[Math.floor(r()*6)]; if(y<2013) bg=bg.replace('OJK','Bapepam-LK');
      const sal=marketPay(c,role,skill,lv);
      o={key,src:'pro',name:`${first} ${last}`,bg,skill,integ,sal,fee:Math.round(tr.fee*sal/50000)*50000}; }
    if(!(c.hired||[]).includes(key)) out.push(o);
  }
  return out;
}
const PAY_DEF=()=>({mode:'cpi',plus:2,staff:false});
const PAY_MODES={off:'No automatic raises',cpi:'Follow inflation',cpiplus:'Inflation plus merit',market:'Match the market rate'};
function allPeople(c){ const out=[]; for(const b of c.board) if(b.who!=='P') out.push({p:b,where:'board'}); for(const d of c.depts||[]) if(d.head) out.push({p:d.head,where:'dept',dept:d}); for(const v of c.divs||[]) if(v.head) out.push({p:v.head,where:'div',div:v}); return out; }
function findPerson(c,id){ return allPeople(c).find(f=>f.p.id===id)||(c.board.find(b=>b.id===id)?{p:c.board.find(b=>b.id===id),where:'board'}:null); }
function removePerson(c,f){ if(f.where==='board') c.board.splice(c.board.indexOf(f.p),1); else if(f.where==='dept') f.dept.head=null; else f.div.head=null; }
const personTitle=(c,f)=>f.where==='board'?titleOf(c,f.p):f.where==='dept'?headTitle(c,f.dept):`Kepala ${f.div.name}`;
const FRAUDW={kom:0.4,dir:1,vp:0.6,mgr:0.4,staff:0.2,divhead:0.6,dhead:0.5};
function payReview(c,y){
  const P=c.pay||(c.pay=PAY_DEF()), inf=(INF[y-1]??2)/100, g=umr(c.reg,S.h)/Math.max(1,umr(c.reg,hOf(y-1,6,1)));
  let n=0,before=0,after=0;
  for(const {p} of allPeople(c)){ if(p.mkt>0) p.mkt=Math.round(p.mkt*g/50000)*50000; const o=p.sal; let s=o;
    if(P.mode==='cpi') s=o*(1+inf); else if(P.mode==='cpiplus') s=o*(1+inf+P.plus/100); else if(P.mode==='market') s=Math.max(o,p.mkt||o);
    s=Math.round(s/50000)*50000; if(s>o){ p.sal=s; n++; before+=o; after+=s; } }
  for(const d of c.depts||[]){ let s=d.staffSal; if(P.mode==='cpi') s*=1+inf; else if(P.mode==='cpiplus') s*=1+inf+P.plus/100; else if(P.mode==='market') s=Math.max(s,staffPay(c)); d.staffSal=Math.max(umr(c.reg,S.h),Math.round(s/50000)*50000); }
  let sn=0; if(P.staff&&P.mode!=='off') for(const u of c.units){ const f=P.mode==='cpiplus'?1+inf+P.plus/100:1+inf, s=Math.round(Math.max(umr(u.reg,S.h),u.sal*f)/1000)*1000; if(s>u.sal){ u.sal=s; sn++; } }
  if(n||sn) logm(`${coName(c)} annual pay review (${PAY_MODES[P.mode].toLowerCase()}): ${n?`${n} board and management pay line${n>1?'s':''} raised, ${rp(before)} → ${rp(after)} a month`:''}${n&&sn?'; ':''}${sn?`${sn} staff wage line${sn>1?'s':''} raised`:''}.`);
}

/* ---------- Regional divisions */
function officeFor(c,reg){ const hq=c.reg||S.home; let best={reg:hq,d:km(hq,reg),div:null}; for(const v of c.divs||[]){ const d=km(v.reg,reg); if(d<best.d) best={reg:v.reg,d,div:v}; } return best; }
function officeSkill(c,o){ const m=mgmt(c); return !o.div?m:o.div.head?0.6*o.div.head.skill+0.4*m:0.4*m; }
const officeName=(c,o)=>o.div?`${o.div.name} (${REG[o.reg].n})`:`head office (${REG[o.reg].n})`;
const divSetup=reg=>Math.round(40e6*cpi(S.h)*landAdj(reg)/1000)*1000;
const divRent=(reg,h)=>Math.round(4e6*cpi(h)*REG[reg].land/1000)*1000;
function openDivision(c,reg){
  const Z=SZ(c);
  if(!Z.divs) return `${coName(c)} is a Usaha ${Z.n}. Regional divisions open up at Usaha Kecil. ${nextLevelText(c)}`;
  if((c.divs||[]).length>=Z.divs) return `As a Usaha ${Z.n}, ${coName(c)} can run at most ${Z.divs} regional division${Z.divs>1?'s':''}. ${nextLevelText(c)}`;
  if(!REG[reg]) return 'Choose a regency for the division office.';
  if(reg===c.reg) return `${REG[reg].n} is where the head office is. A division office goes somewhere else.`;
  if((c.divs||[]).some(v=>v.reg===reg)) return `${coName(c)} already has a division office in ${REG[reg].n}.`;
  const v={id:nid('V'),reg,name:divDefName(c,reg),head:null,since:S.h}, head=autoHead(c,v,-2); head.tier='divhead';
  const cost=divSetup(reg)+2*head.sal; if(c.cash<cost) return `Not enough in ${coName(c)}'s account to open the office and recruit its head: ${rp(cost)} needed, ${rp(c.cash)} available.`;
  c.cash-=cost; book(c,'opex',cost); v.head=head; (c.divs||(c.divs=[])).push(v);
  const n=c.units.filter(u=>officeFor(c,u.reg).div===v).length;
  logm(`${coName(c)} opened ${v.name} with an office in ${REG[reg].n} for ${rp(cost)}, led by ${head.name} (skill ${head.skill}). ${n} business unit${n===1?' now reports':'s now report'} to it instead of head office.`,'good');
  S.dirty=true; return null;
}
function divDefName(c,reg){ const p='Divisi '+provOf(reg), town=REG[reg].n.replace(/^(Kab\.|Kota) /,''); return (c.divs||[]).some(v=>v.name.toLowerCase()===p.toLowerCase()||provOf(v.reg)===provOf(reg))?'Divisi '+town:p; }
function renameDiv(c,v,name){
  name=(name||'').trim().replace(/\s+/g,' ');
  if(!name) return 'Give the division a name.';
  if(name.length>40) return 'Keep the name to 40 characters or fewer.';
  if((c.divs||[]).some(x=>x!==v&&x.name.toLowerCase()===name.toLowerCase())) return `${coName(c)} already has a division called ${name}. Pick another name.`;
  if(name===v.name) return null;
  const old=v.name; v.name=name; logm(`${coName(c)} renamed ${old} (office in ${REG[v.reg].n}) to ${name}.`); S.dirty=true; return null;
}
function renameDivModal(cid,vid){
  const c=acct(cid), v=(c.divs||[]).find(x=>x.id===vid); if(!v) return;
  const same=c.divs.filter(x=>x!==v&&provOf(x.reg)===provOf(v.reg));
  openModal(`Rename division · ${coName(c)}`,`<div style="display:flex;flex-direction:column;gap:12px">
    <p class="note">${esc(v.name)} has its office in ${esc(REG[v.reg].n)}, ${esc(provOf(v.reg))}.${same.length?` ${coName(c)} also runs ${same.map(x=>esc(x.name)).join(', ')} in the same province, so a name after the town or area (Divisi Jawa Barat Selatan, Divisi Priangan) keeps them apart.`:''} The new name shows on the org chart, in reports and in the head's title.</p>
    <label class="f">Division name<input type="text" id="dv-name" maxlength="40" value="${esc(v.name)}"></label>
    <div class="btns"><button class="btn pri" id="dv-go">Rename</button><button class="btn" data-act="close">Cancel</button></div></div>`,el=>{
      const i=el.querySelector('#dv-name'); i.focus(); i.select();
      const go=()=>{ if(err(renameDiv(c,v,i.value))) return; closeModal(); render(); };
      el.querySelector('#dv-go').onclick=go; i.onkeydown=e=>{ if(e.key==='Enter') go(); };
    });
}
function divModal(cid){
  const c=acct(cid), Z=SZ(c);
  if(err(!Z.divs?`${coName(c)} is a Usaha ${Z.n}. Regional divisions open up at Usaha Kecil. ${nextLevelText(c)}`:(c.divs||[]).length>=Z.divs?`As a Usaha ${Z.n}, ${coName(c)} can run at most ${Z.divs} regional division${Z.divs>1?'s':''}. ${nextLevelText(c)}`:null)) return;
  const start=(c.units.map(u=>u.reg).filter(r=>r!==c.reg&&!(c.divs||[]).some(v=>v.reg===r)).sort((a,b)=>km(c.reg,b)-km(c.reg,a))[0])||c.reg;
  placeModal(`Open a regional division · ${coName(c)}`,start,reg=>{
    const now=c.units.reduce((s,u)=>s+monCost(c,u),0), lkN=c.units.length?c.units.reduce((s,u)=>s+leak(c,u),0)/c.units.length:0;
    const fake={id:'tmp',reg,name:divDefName(c,reg),head:null}; c.divs.push(fake);
    const then=c.units.reduce((s,u)=>s+monCost(c,u),0), lkT=c.units.length?c.units.reduce((s,u)=>s+leak(c,u),0)/c.units.length:0, cov=c.units.filter(u=>officeFor(c,u.reg).div===fake);
    c.divs.pop();
    return `<p class="note">A division office manages the units nearest to it, so they are monitored from close by instead of from head office. It costs rent every month, and the game recruits a division head for you.</p><div class="rows">
      <div class="row"><span class="k">Units that would report here</span><span class="v wrap">${cov.length?cov.map(u=>BIZ[u.t].n+' · '+REG[u.reg].n).join(', '):'none yet'}</span></div>
      <div class="row"><span class="k">Monitoring, all units</span><span class="v ${then<now?'up':''}">${rp(now)} → ${rp(then)} / month</span></div>
      <div class="row"><span class="k">Average leakage, before the head's effect</span><span class="v ${lkT<lkN?'up':''}">${pc(lkN,1)} → ${pc(lkT,1)}</span></div>
      <div class="row"><span class="k">Office set-up and head recruitment</span><span class="v">about ${rp(divSetup(reg)+2*marketPay(c,'mgr',SZ(c).tal.m))}</span></div>
      <div class="row"><span class="k">Office rent</span><span class="v">${rp(divRent(reg,S.h))} / month</span></div>
      <div class="row"><span class="k">Company account</span><span class="v">${rp(c.cash)}</span></div></div>`; }, reg=>openDivision(c,reg),'Open the division in');
}

/* ---------- Management fees */
const directSubs=c=>S.C.filter(s=>s!==c&&(s.own[c.id]||0)>0);
function billFees(){
  for(const p of S.C){ if(!p.mfees) continue;
    for(const sid of Object.keys(p.mfees)){ const s=acct(sid), F=p.mfees[sid]; if(!s||!(s.own[p.id]>0)){ delete p.mfees[sid]; continue; }
      const amt=Math.round((F.pct/100)*Math.max(0,s.mon.rev)+(F.fix||0)); F.last=amt; if(amt<=0) continue;
      const w=Math.round(amt*0.02); s.cash-=amt; book(s,'mfee',amt); p.cash+=amt-w; book(p,'mfi',amt); p.pph23=(p.pph23||0)+w; srcAdd(p,'mfee:'+s.id,amt); } }
}
function setFee(p,s,pct,fix){
  if(!(s&&s.own[p.id]>0)) return `${s?coName(s):'That company'} is not a direct subsidiary of ${coName(p)}.`;
  if(!(pct>=0)||!(fix>=0)) return 'Enter zero or more for both the percentage and the fixed amount.';
  if(pct>10) return 'Keep the fee at 10% of revenue or less. Anything higher is profit shifting the tax office would not accept.';
  if(!onBoardRole(p,'dir')) return `${coName(p)} has no director, so it has no one to provide management services. Appoint a director first.`;
  p.mfees=p.mfees||{};
  if(!pct&&!fix){ delete p.mfees[s.id]; logm(`${coName(p)} stops billing ${coName(s)} a management fee.`); return null; }
  p.mfees[s.id]={pct,fix,last:p.mfees[s.id]?.last||0};
  logm(`${coName(p)} will bill ${coName(s)} a management fee of ${pct?pc(pct/100,1)+' of revenue':''}${pct&&fix?' plus ':''}${fix?rp(fix)+' a month':''}, with 2% PPh 23 withheld.${pct>5?' Above 5% of revenue the tax office treats the excess as a non-deductible cost.':''}`);
  return null;
}
function feePanel(c){
  const subs=directSubs(c), payer=S.C.filter(p=>p.mfees&&p.mfees[c.id]);
  if(!subs.length&&!payer.length) return '';
  return `<section class="panel"><div class="panel-h"><h3>Management fees</h3><span class="eyebrow">Intra-group services</span></div><div class="panel-b">
    ${subs.length?`<p class="note">${esc(coName(c))} can bill its subsidiaries for head-office services. The fee is a cost for the subsidiary and income for ${esc(coName(c))}, billed on the 1st of each month from last month's revenue. The subsidiary withholds 2% PPh 23, which ${esc(coName(c))} credits against its income tax. Above 5% of a subsidiary's revenue the tax office treats the excess as non-deductible (koreksi fiskal).</p>
    <div class="tbl-wrap"><table><thead><tr><th>Subsidiary</th><th class="n">% of revenue</th><th class="n">Fixed / month</th><th></th><th class="n">Last billed</th></tr></thead><tbody>
    ${subs.map(s=>{ const F=(c.mfees||{})[s.id]||{pct:0,fix:0,last:0}; return `<tr><td><b>${esc(coName(s))}</b><div class="muted" style="font-size:.75rem">revenue last month ${rp(s.hist[s.hist.length-1]?.rev||0)}${F.pct>5?' · <span class="warn">above the 5% arm\'s-length line</span>':''}</div></td>
      <td class="n"><input type="number" id="mf-p-${s.id}" min="0" max="10" step="0.5" value="${F.pct}" style="width:80px" aria-label="Fee percentage for ${esc(coName(s))}"></td>
      <td class="n"><input type="number" id="mf-f-${s.id}" min="0" step="500000" value="${F.fix||0}" style="width:140px" aria-label="Fixed monthly fee for ${esc(coName(s))}"></td>
      <td><button class="btn sm" data-act="mfee" data-id="${c.id}" data-s="${s.id}">Set</button></td><td class="n">${F.last?rp(F.last):'—'}</td></tr>`; }).join('')}
    </tbody></table></div>${c.pph23?`<p class="note">PPh 23 credit waiting for this year's tax return: ${rp(c.pph23)}.</p>`:''}`:''}
    ${payer.map(p=>{ const F=p.mfees[c.id]; return `<p class="note">${esc(coName(c))} pays ${esc(coName(p))} a management fee of ${F.pct?pc(F.pct/100,1)+' of revenue':''}${F.pct&&F.fix?' plus ':''}${F.fix?rp(F.fix)+' a month':''}. Last bill ${rp(F.last||0)}.</p>`; }).join('')}
  </div></section>`;
}

/* ============================================================
   DEPARTMENTS · the game lists jobs, you form teams, staffing is automatic
   ============================================================ */
const JOBS={
  acct:{n:'Bookkeeping & accounting',fn:'fin',lv:0,w:0.6,miss:'Fraud goes unnoticed more often'},
  tax:{n:'Tax filing (SPT, PPh, PPN)',fn:'fin',lv:0,w:0.4,miss:'Tax penalties at year end'},
  sales:{n:'Sales & customer orders',fn:'mkt',lv:0,w:0.6,miss:'Lower sales'},
  proc:{n:'Purchasing & suppliers',fn:'ops',lv:0,w:0.4,miss:'Paying more for stock and inputs'},
  payroll:{n:'Payroll & BPJS administration',fn:'hr',lv:1,w:0.4,miss:'BPJS audits and fines'},
  recruit:{n:'Recruitment & training',fn:'hr',lv:1,w:0.4,miss:'Staff work below potential'},
  logi:{n:'Logistics & distribution',fn:'ops',lv:1,w:0.6,miss:'More leakage between farm, shop and buyer'},
  qc:{n:'Quality control & K3 safety',fn:'ops',lv:1,w:0.4,miss:'More failed harvests and K3 safety findings'},
  treasury:{n:'Treasury & bank relations',fn:'fin',lv:1,w:0.3,miss:'No discount on loan rates'},
  legal:{n:'Legal & licensing (perizinan)',fn:'corp',lv:1,w:0.3,miss:'Regulatory fines hit harder'},
  audit:{n:'Internal audit',fn:'fin',lv:2,w:0.4,miss:'Fraud is caught less often'},
  regrep:{n:'Regulatory reporting (LKPM, WLKP, annual statements)',fn:'corp',lv:2,w:0.3,miss:'Fines and BKPM warnings for late reports; three warnings freeze the licence'},
  brand:{n:'Marketing & brand',fn:'mkt',lv:2,w:0.5,miss:'Lower sales and selling prices'},
  it:{n:'IT & systems',fn:'ops',lv:2,w:0.4,miss:'Slower, leakier operations'},
  ir:{n:'Industrial relations',fn:'hr',lv:2,w:0.3,miss:'More labour disputes, settled at the mediator'},
  ga:{n:'General affairs & office',fn:'ops',lv:2,w:0.4,miss:'Higher running costs'},
  cs:{n:'Corporate secretary',fn:'corp',lv:3,w:0.3,miss:'Weaker governance'},
  risk:{n:'Risk management',fn:'fin',lv:3,w:0.3,miss:'Weaker fraud and credit control'},
  csr:{n:'CSR programmes (UU 40/2007 Art. 74)',fn:'corp',lv:3,w:0.3,miss:'Fines if you run plantations, fisheries, mines or oil and gas'},
  strategy:{n:'Corporate planning',fn:'corp',lv:3,w:0.3,miss:'Lower management score'},
};
// Business lines: every line a company runs needs its own technical team.
const SECTORS={
  agri:{n:'Agribusiness',t:['padi','cabai','jagung','bawang','tembakau','sawit','karet','kopi','kakao','cengkeh']},
  farm:{n:'Livestock & fisheries',t:['lele','ayam','sapi','udang','bandeng','rumput','tangkap']},
  trade:{n:'Retail & fuel distribution',t:['warung','agen_lpg','spbu']},
  food:{n:'Food & hospitality',t:['kuliner','wisata']},
  craft:{n:'Manufacturing & crafts',t:['konveksi','batik','mebel']},
  logi:{n:'Logistics & transport',t:['logistik']},
  mine:{n:'Mining, oil & gas',t:['batubara','minyak','gas']},
  bank:{n:'Banking',t:['bpr']},
  tech:{n:'IT services',t:['konsultan_ti']},
  outs:{n:'Outsourcing services',t:['alihdaya']},
};
const SEC_OF={}; for(const k in SECTORS) for(const t of SECTORS[k].t) SEC_OF[t]=k;
for(const k in SECTORS) JOBS['bz_'+k]={n:`${SECTORS[k].n} business team`,fn:'biz',sec:k,lv:0,w:0.6,miss:'Side lines run at 80% and fail more often; the main line at 90% once the company is Menengah'};
const hasSec=(c,k)=>c.units.some(u=>SEC_OF[u.t]===k);
const needJob=(c,j)=>JOBS[j].lv<=(c.level||0)&&(!JOBS[j].sec||hasSec(c,JOBS[j].sec));
function mainSec(c){ const n={}; for(const u of c.units){ const k=SEC_OF[u.t]; n[k]=(n[k]||0)+1; } return Object.keys(n).sort((a,b)=>n[b]-n[a])[0]; }
// Output factor from the business team. Without one: the main line is run by the directors (fine while Mikro or Kecil, 0.9 above);
// any other line runs at 0.8. With a team: 0.85 (weak) to 1.1 (excellent).
function bizF(c,u){ const k=SEC_OF[u.t], q=jobQ(c,'bz_'+k); if(q>0) return 0.85+0.25*q; if(mainSec(c)===k) return (c.level||0)<=1?1:0.9; return 0.8; }
const JOB_FN={fin:'Finance',ops:'Operations',mkt:'Marketing',hr:'People',corp:'Corporate & legal',biz:'Business lines'};
const DEPT_MAX=[1,3,6,12], DEPT_SCALE=[1,1.3,1.8,2.5];
const HEADT=[{k:'staff',t:'Koordinator'},{k:'mgr',t:'Manajer'},{k:'mgr',t:'Manajer'},{k:'vp',t:'VP'}];
const RESOURCE=['sawit','karet','kopi','kakao','tangkap','logistik','udang','rumput','bandeng','cengkeh','tembakau','batubara','minyak','gas'];
const jobsAt=(lv,c)=>Object.keys(JOBS).filter(j=>JOBS[j].lv<=lv&&(!JOBS[j].sec||(c&&hasSec(c,JOBS[j].sec))));
const deptOf=(c,j)=>(c.depts||[]).find(d=>d.jobs.includes(j));
function deptNeed(c,d,jobs){ const lv=c.level||0, js=(jobs||d.jobs).filter(j=>needJob(c,j)); return Math.max(1,Math.round(js.reduce((s,j)=>s+JOBS[j].w,0)*(1+c.units.length/6)*DEPT_SCALE[lv])); }
function deptFocus(c,jobs){ const js=jobs.filter(j=>needJob(c,j)), n=Math.max(1,js.length), nf=new Set(js.map(j=>JOBS[j].sec?'biz:'+JOBS[j].sec:JOBS[j].fn)).size; return 1/(1+0.1*(n-1))*(1-0.08*Math.max(0,nf-1)); }
function deptQ(c,d){ return clamp((d.head?d.head.skill:30)/100*deptFocus(c,d.jobs)*Math.min(1,d.staff/deptNeed(c,d)),0,1); }
function jobQ(c,j){ if(!needJob(c,j)) return 0; if(c.outs&&c.outs[j]) return outQ(c,j); const d=deptOf(c,j); return d?deptQ(c,d):0; }
function fnScore(c,fn){
  const js=jobsAt(c.level||0).filter(j=>JOBS[j].fn===fn), avg=js.length?js.reduce((s,j)=>s+jobQ(c,j),0)/js.length:0;
  let dir=0; if((c.level||0)>=1&&(c.form==='PT'||c.form==='PTP')) for(const b of c.board) if(b.role==='dir'&&b.fn===fn) dir=Math.max(dir,skillOf(b,c));
  return Math.round(avg>0?Math.min(100,avg*100*(0.8+0.4*dir/100)):dir*0.5);
}
function fnLead(c,fn){ const ds=[...new Set(jobsAt(c.level||0).filter(j=>JOBS[j].fn===fn).map(j=>deptOf(c,j)).filter(Boolean))]; const dir=c.board.find(b=>b.role==='dir'&&b.fn===fn&&(c.level||0)>=1);
  const parts=[]; if(dir) parts.push(dir.who==='P'?'you as '+FN[fn].t:dir.name+', '+FN[fn].t); if(ds.length) parts.push(ds.map(d=>d.name).join(', ')); const vs=jobsAt(c.level||0).filter(j=>JOBS[j].fn===fn&&(c.outs||{})[j]).map(j=>c.outs[j].name); if(vs.length) parts.push('outsourced to '+[...new Set(vs)].join(', ')); return parts.join(' with '); }
const headTitle=(c,d)=>`${HEADT[c.level||0].t} ${d.name}`;
const staffPay=c=>marketPay(c,'staff',LEVELS[c.level||0].tal.m-10);
function autoHead(c,d,skillBonus){
  const lv=c.level||0, T=LEVELS[lv].tal, tk=HEADT[lv].k, skill=Math.round(clamp(T.m+TIER[tk].adj+(skillBonus||0)+rg()*T.sd*0.7,40,T.cap));
  const name=FIRST[Math.floor(rnd()*FIRST.length)]+' '+LAST[Math.floor(rnd()*LAST.length)], bg0=bgList(tk==='staff'?'staff':'dir',lv)[Math.floor(rnd()*6)], bg=yearOf(S.h)<2013?bg0.replace('OJK','Bapepam-LK'):bg0;
  const sal=marketPay(c,tk,skill,lv);
  return {id:nid('B'),who:'X',src:'pro',tier:'dhead',hl:lv,name,bg,skill,integ:Math.round(clamp(74+rg()*12,35,99)),sal,mkt:sal,since:S.h};
}
function deptPlan(c,jobs){ const lv=c.level||0, T=LEVELS[lv].tal, tk=HEADT[lv].k, need=deptNeed(c,null,jobs), hs=Math.round(clamp(T.m+TIER[tk].adj,40,T.cap)), hsal=marketPay(c,tk,hs,lv), ss=staffPay(c);
  return {need,hs,hsal,ss,monthly:hsal+need*ss*(1+bpjsRate(S.h)),setup:2*hsal+0.5*ss*need,focus:deptFocus(c,jobs),q:hs/100*deptFocus(c,jobs)}; }
function deptCheck(c,name,jobs,d){
  name=(name||'').trim(); const Z=SZ(c), lv=c.level||0;
  if(!name) return 'Give the team a name.';
  if((c.depts||[]).some(x=>x!==d&&x.name.toLowerCase()===name.toLowerCase())) return `${coName(c)} already has a team called ${name}.`;
  if(!jobs.length) return 'Tick at least one job for the team to handle.';
  const late=jobs.filter(j=>JOBS[j].lv>lv); if(late.length) return `${late.map(j=>JOBS[j].n).join(', ')} only matter${late.length>1?'':'s'} from Usaha ${LEVELS[JOBS[late[0]].lv].n}.`;
  if(!d&&(c.depts||[]).length>=DEPT_MAX[lv]) return `As a Usaha ${Z.n}, ${coName(c)} can run at most ${DEPT_MAX[lv]} team${DEPT_MAX[lv]>1?'s':''}. Give an existing team more jobs, or grow: ${nextLevelText(c)}`;
  return null;
}
function moveJobs(c,jobs,d){ const moved=[]; for(const x of c.depts||[]) if(x!==d){ const before=x.jobs.length; x.jobs=x.jobs.filter(j=>!jobs.includes(j)); if(x.jobs.length<before) moved.push(x.name); } return moved; }
function staffDept(c,d,quiet){
  const need=deptNeed(c,d), lv=c.level||0, out=[];
  if(!d.head){ d.head=autoHead(c,d); const fee=2*d.head.sal; c.cash-=fee; book(c,'opex',fee); out.push(`hired ${d.head.name} as ${headTitle(c,d)} (fee ${rp(fee)})`); }
  else if((d.head.hl??lv)<lv&&HEADT[lv].t!==HEADT[d.head.hl??lv].t){ d.head.hl=lv; d.head.skill=Math.min(99,d.head.skill+4); const m=marketPay(c,HEADT[lv].k,d.head.skill,lv); d.head.sal=Math.max(d.head.sal,m); d.head.mkt=m; out.push(`${d.head.name} promoted to ${headTitle(c,d)} at ${rp(d.head.sal)}`); }
  else d.head.hl=Math.max(d.head.hl??lv,lv);
  if(!d.staffSal) d.staffSal=staffPay(c);
  if(d.staff<need){ const k=need-d.staff, fee=Math.round(0.5*d.staffSal*k); c.cash-=fee; book(c,'opex',fee); d.staff=need; out.push(`${k} staff hired`); }
  else if(d.staff>need){ const k=d.staff-need, sev=Math.round(d.staffSal*k); c.cash-=sev; book(c,'wage',sev); d.staff=need; out.push(`${k} staff let go with ${rp(sev)} severance`); }
  if(out.length&&!quiet) logm(`${coName(c)} · ${d.name}: ${out.join(', ')}. Team of ${d.staff}.`);
  return out;
}
function saveDept(c,name,jobs,d){
  const e=deptCheck(c,name,jobs,d); if(e) return e; name=name.trim();
  const plan=deptPlan(c,jobs);
  if(!d&&c.cash<plan.setup) return `Not enough in ${coName(c)}'s account to staff the team: about ${rp(plan.setup)} in recruitment costs, ${rp(c.cash)} available.`;
  const moved=moveJobs(c,jobs,d);
  for(const j of jobs) if(c.outs&&c.outs[j]){ moved.push(c.outs[j].name); delete c.outs[j]; }
  if(!d){ d={id:nid('T'),name,jobs:[...jobs],head:null,staff:0,staffSal:staffPay(c),since:S.h}; (c.depts||(c.depts=[])).push(d); const r=staffDept(c,d,true);
    logm(`${coName(c)} set up ${name} to handle ${jobs.map(j=>JOBS[j].n.toLowerCase()).join(', ')}. ${r.join(', ')}.${moved.length?` Taken over from ${moved.join(', ')}.`:''}`,'good'); }
  else { const old=d.name; d.name=name; d.jobs=[...jobs]; const r=staffDept(c,d,true); logm(`${coName(c)}: ${old!==name?old+' renamed '+name+'; ':''}now handles ${jobs.map(j=>JOBS[j].n.toLowerCase()).join(', ')}.${r.length?' '+r.join(', ')+'.':''}${moved.length?` Taken over from ${moved.join(', ')}.`:''}`); }
  S.dirty=true; return null;
}
function closeDept(c,d){ const sev=Math.round(2*(d.head?d.head.sal:0)+d.staff*d.staffSal); c.cash-=sev; book(c,'wage',sev); c.depts.splice(c.depts.indexOf(d),1); logm(`${coName(c)} closed ${d.name}; ${d.staff+(d.head?1:0)} people let go with ${rp(sev)} severance. Its jobs are now unhandled.`,'bad'); }
function deptModal(cid,did){
  const c=acct(cid), d=did?(c.depts||[]).find(x=>x.id===did):null, lv=c.level||0;
  if(!d&&(c.depts||[]).length>=DEPT_MAX[lv]) return err(`As a Usaha ${SZ(c).n}, ${coName(c)} can run at most ${DEPT_MAX[lv]} team${DEPT_MAX[lv]>1?'s':''}. Give an existing team more jobs, or grow: ${nextLevelText(c)}`);
  const st={name:d?d.name:'',jobs:d?[...d.jobs]:jobsAt(lv,c).filter(j=>!deptOf(c,j)&&!(c.outs||{})[j]).slice(0,2),touched:!!d};
  const draw=el=>{
    const body=el.querySelector('#dp-body'), plan=deptPlan(c,st.jobs.length?st.jobs:['acct']);
    const groups=Object.keys(JOB_FN).map(fn=>[fn,jobsAt(lv,c).filter(j=>JOBS[j].fn===fn)]).filter(([,js])=>js.length);
    if(!st.touched&&st.jobs.length){ const fns=[...new Set(st.jobs.map(j=>JOBS[j].fn))]; st.name=fns.map(f=>f==='biz'?'Bisnis '+st.jobs.filter(j=>JOBS[j].sec).map(j=>SECTORS[JOBS[j].sec].n.split(/[ ,&]/)[0]).join(' & '):({fin:'Keuangan',ops:'Operasional',mkt:'Pemasaran',hr:'SDM',corp:'Legal & Korporat'}[f])).join(' & '); }
    body.innerHTML=`<p class="note">Tick the jobs this team handles. One team can take several, but each extra job, and above all jobs from different areas, spreads it thinner. The game recruits the team head and staff for you and resizes the team every month as the company grows.</p>
      <label class="f">Team name<input type="text" id="dp-name" maxlength="40" value="${esc(st.name)}" placeholder="Keuangan & Pajak"></label>
      ${groups.map(([fn,js])=>`<div class="eyebrow">${JOB_FN[fn]}</div><div class="rows">${js.map(j=>{ const o=deptOf(c,j); return `<label class="row check" style="justify-content:space-between"><span><input type="checkbox" data-j="${j}" ${st.jobs.includes(j)?'checked':''}> ${esc(JOBS[j].n)}</span><span class="muted" style="font-size:.78rem">${(c.outs||{})[j]?'outsourced to '+esc(c.outs[j].name):o&&o!==d?'now with '+esc(o.name):o===d&&d?'this team':'unhandled'}</span></label>`; }).join('')}</div>`).join('')}
      <div class="rows">
        <div class="row"><span class="k">Team size</span><span class="v">${HEADT[lv].t} + ${plan.need} staff</span></div>
        <div class="row"><span class="k">Head's likely skill</span><span class="v">about ${plan.hs}</span></div>
        <div class="row"><span class="k">Focus</span><span class="v ${plan.focus<0.8?'warn':''}">${pc(plan.focus,0)}</span></div>
        <div class="row"><span class="k">Monthly cost</span><span class="v">about ${rp(plan.monthly)}</span></div>
        ${d?'':`<div class="row"><span class="k">Recruitment costs</span><span class="v">about ${rp(plan.setup)}</span></div>`}
        <div class="row"><span class="k">Company account</span><span class="v">${rp(c.cash)}</span></div>
      </div>
      <div class="btns"><button class="btn pri" id="dp-go">${d?'Save changes':'Set up the team'}</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#dp-name').oninput=e=>{ st.name=e.target.value; st.touched=true; };
    body.querySelectorAll('[data-j]').forEach(x=>x.onchange=()=>{ st.jobs=[...body.querySelectorAll('[data-j]:checked')].map(y=>y.dataset.j); st.name=body.querySelector('#dp-name').value; draw(el); });
    body.querySelector('#dp-go').onclick=()=>{ st.name=body.querySelector('#dp-name').value; if(err(saveDept(c,st.name,st.jobs,d))) return; closeModal(); render(); };
  };
  openModal(d?`Change ${d.name} · ${coName(c)}`:`Set up a team · ${coName(c)}`,'<div id="dp-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function deptSection(c){
  const lv=c.level||0, avail=jobsAt(lv,c), open=avail.filter(j=>!deptOf(c,j)&&!(c.outs||{})[j]), later=Object.keys(JOBS).filter(j=>JOBS[j].lv===lv+1&&!JOBS[j].sec);
  return `<section class="panel"><div class="panel-h"><div><h3>Things to do</h3><div class="note">Jobs a Usaha ${SZ(c).n} has to get done. Handle them by setting up teams or outsourcing to a vendor; ${open.length?`<b class="warn">${open.length} unhandled</b>`:'everything is covered'}.</div></div><button class="btn sm pri" data-act="newdept" data-id="${c.id}">Set up a team (${(c.depts||[]).length}/${DEPT_MAX[lv]})</button></div>
    <div class="panel-b">
      <div class="rows">${FNS.map(fn=>`<div class="row"><span class="k">${FN[fn].en} <span class="muted">· ${FN_EFF[fn]}</span><div class="muted" style="font-size:.75rem">${L(()=>{const l=fnLead(c,fn);return l?'Covered by '+l:'Nobody covers this yet';})}</div></span>${LH(()=>{const v=fnScore(c,fn);return `<span style="display:inline-flex;gap:8px;align-items:center"><span class="prog" style="width:100px"><i style="width:${v}%"></i></span>${v}</span>`;},'span','v')}</div>`).join('')}</div>
      <div class="tbl-wrap"><table><thead><tr><th>Job</th><th>Area</th><th>If nobody does it</th><th>Handled by</th><th class="n">Quality</th><th></th></tr></thead><tbody>
      ${avail.map(j=>{ const o=deptOf(c,j); return `<tr><td>${esc(JOBS[j].n)}</td><td class="muted">${JOB_FN[JOBS[j].fn]}</td><td class="muted" style="font-size:.82rem">${esc(JOBS[j].miss)}</td><td>${(c.outs||{})[j]?`<span class="chip acc">Outsourced</span> ${esc(c.outs[j].name)}<div class="muted" style="font-size:.72rem">${L(()=>rp(c.outs[j]?(c.outs[j].last||outFee(c,j,c.outs[j])):0)+' / month')}</div>`:o?esc(o.name):'<span class="chip bad">Unhandled</span>'}</td><td class="n">${o||(c.outs||{})[j]?LH(()=>{const q=jobQ(c,j);return `<span style="display:inline-flex;gap:6px;align-items:center"><span class="prog" style="width:60px"><i style="width:${Math.round(q*100)}%"></i></span>${Math.round(q*100)}</span>`;},'span'):'—'}</td><td>${OUTSRC[j]?((c.outs||{})[j]?`<button class="btn sm" data-act="endout" data-id="${c.id}" data-v="${j}">End contract</button>`:`<button class="btn sm" data-act="outsrc" data-id="${c.id}" data-v="${j}">Outsource</button>`):''}</td></tr>`; }).join('')}
      ${later.map(j=>`<tr class="muted"><td>${esc(JOBS[j].n)}</td><td>${JOB_FN[JOBS[j].fn]}</td><td colspan="4" style="font-size:.82rem">Comes up at Usaha ${LEVELS[lv+1].n}</td></tr>`).join('')}
      </tbody></table></div>
    </div></section>
  <section class="panel"><div class="panel-h"><div><h3>Teams</h3><div class="note">Team heads carry the title ${HEADT[lv].t} at this size${lv<3?' and become VP at Usaha Besar':''}. Staff are hired and let go automatically as the workload changes.</div></div></div>
    <div class="panel-b">${(c.depts||[]).length?(c.depts.map(d=>{ const need=deptNeed(c,d), cost=(d.head?d.head.sal:0)+d.staff*d.staffSal*(1+bpjsRate(S.h)); return `<div class="unit"><div><h4>${esc(d.name)}</h4>
        <div class="meta">${d.head?`${esc(headTitle(c,d))}: ${esc(d.head.name)} · skill ${d.head.skill} · ${esc(d.head.bg)}`:'No head yet'} · ${d.staff} staff (workload ${need})</div>
        <div class="meta" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${d.jobs.map(j=>`<span class="chip ${needJob(c,j)?'good':''}">${esc(JOBS[j].n)}${needJob(c,j)?'':' · not needed now'}</span>`).join('')||'<span class="chip bad">No jobs</span>'}</div>
        <div class="meta">${L(()=>`Quality ${Math.round(deptQ(c,d)*100)} · focus ${pc(deptFocus(c,d.jobs),0)}`)}</div></div>
        <div style="text-align:right"><div class="num">${rp(cost)} / mo</div><div class="btns" style="justify-content:flex-end;margin-top:6px"><button class="btn sm" data-act="editdept" data-id="${c.id}" data-v="${d.id}">Change jobs</button><button class="btn sm bad" data-act="closedept" data-id="${c.id}" data-v="${d.id}">Close</button></div></div></div>`; }).join('')+`<div class="tbl-wrap"><table><thead><tr><th>Role</th><th>Name</th><th>From</th><th class="n">Skill</th><th>References</th><th class="n">Pay / month</th><th></th></tr></thead><tbody>${c.depts.filter(d=>d.head).map(d=>personRow(c,{p:d.head,where:'dept',dept:d})).join('')}</tbody></table></div><p class="note">You can adjust a team head's pay or replace them; a dismissed head is replaced by a new hire automatically.</p>`):'<p class="note">No teams yet. Every job above is unhandled.</p>'}</div></section>`;
}

/* ---------- Outsourcing (alih daya) */
// job: [group business type that can deliver it (or null), what an outside vendor is called]
const OUTSRC={
  acct:[null,'accounting services firm'], tax:[null,'tax consultant'], payroll:['alihdaya','payroll bureau'], recruit:['alihdaya','recruitment agency'],
  logi:['alihdaya','3PL logistics provider'], it:['konsultan_ti','IT vendor'], ga:['alihdaya','facility management firm'], legal:[null,'law firm'], audit:[null,'public accounting firm (KAP)'],
};
const VCAP=[2,6,20];
const VT=[{k:'Budget',m:0.8,q:[0.42,0.55]},{k:'Standard',m:1.1,q:[0.6,0.72]},{k:'Premium',m:1.6,q:[0.78,0.9]}];
const VNAME=['Mitra','Prima','Solusi','Karya','Sinergi','Nusantara','Jasa','Andalan','Cipta','Global','Bina','Sentosa','Utama','Integra','Graha'];
function outBase(c,j){ const lv=c.level||0; return Math.max(1,Math.round(JOBS[j].w*(1+c.units.length/6)*DEPT_SCALE[lv]))*staffPay(c)*(1+bpjsRate(S.h))*1.35; }
function outFee(c,j,o){ return Math.round(outBase(c,j)*(o?o.m:1)/1000)*1000; }
function hashN(str){ let h=2166136261; for(const ch of str){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0)/4294967296; }
function vendorOffers(c,j){
  const mo=Math.floor(S.h/(24*30)), lv=c.level||0;
  return VT.map((t,i)=>{ const r=hashN(c.id+j+mo+i), r2=hashN(j+i+mo+c.id+'n'), b0=Math.floor(hashN(c.id+j+mo)*VNAME.length), n1=VNAME[(b0+i*5)%VNAME.length], n2=VNAME[(b0+i*5+2+Math.floor(r2*3))%VNAME.length];
    const q=clamp(t.q[0]+(t.q[1]-t.q[0])*r+0.02*lv,0,0.95);
    const sfx={acct:'Akuntansi',tax:'Konsultan Pajak',payroll:'Payroll Services',recruit:'Rekrutmen',logi:'Logistik',it:'Teknologi',ga:'Facility Services'}[j];
    const k0=(b0+i*7)%LAST.length, name=sfx?`PT ${n1} ${n2} ${sfx}`:`${j==='audit'?'KAP ':''}${LAST[k0]}${j==='legal'?', '+LAST[(k0+3)%LAST.length]:''} & Rekan`;
    return {v:'X',tier:t.k,name,q,m:t.m}; });
}
function vendorKind(j){ return OUTSRC[j]&&OUTSRC[j][0]; }
function vendorCap(v,kind){ return v.units.filter(u=>u.t===kind).reduce((s,u)=>s+VCAP[u.lv],0); }
function vendorUsed(v,kind){ let n=0; for(const c of S.C) for(const j in c.outs||{}){ const o=c.outs[j]; if(o.v===v.id&&vendorKind(j)===kind) n++; } return n; }
function vendorCovers(v,j){ const kind=vendorKind(j); if(!kind||!v.units.some(u=>u.t===kind)) return false; if(kind!=='alihdaya'||j==='ga') return true; return !!deptOf(v,j)||(j==='logi'&&jobQ(v,'bz_logi')>0); }
function ownVendorQ(v,kind,j){ const us=v.units.filter(u=>u.t===kind); if(!us.length) return 0; const lv=Math.max(...us.map(u=>u.lv)), tq=kind==='alihdaya'&&j&&j!=='ga'?Math.max(jobQ(v,j),j==='logi'?jobQ(v,'bz_logi'):0):Math.max(0.5,jobQ(v,'bz_'+SEC_OF[kind]));
  return clamp((0.48+0.12*lv)*(0.8+0.35*mgmt(v)/100)*(0.7+0.5*tq)*Math.min(1.05,Math.max(...us.map(u=>staffF(u)))),0,0.95); }
function groupVendors(c,j){ const kind=vendorKind(j); if(!kind) return []; return S.C.filter(v=>v!==c&&vendorCovers(v,j)).map(v=>({v:v.id,name:coName(v),q:ownVendorQ(v,kind,j),m:1,cap:vendorCap(v,kind),used:vendorUsed(v,kind)})); }
function outQ(c,j){ const o=(c.outs||{})[j]; if(!o) return 0; if(o.v==='X') return o.q; const v=acct(o.v); return v&&vendorCovers(v,j)?ownVendorQ(v,vendorKind(j),j):0; }
function outsource(c,j,o){
  if(!OUTSRC[j]) return `${JOBS[j].n} cannot be outsourced. Set up a team for it.`;
  if(JOBS[j].lv>(c.level||0)) return `${coName(c)} does not need ${JOBS[j].n.toLowerCase()} yet.`;
  if(o.v!=='X'){ const v=acct(o.v); if(!v) return 'That company no longer exists.'; const kind=vendorKind(j);
    if(vendorUsed(v,kind)>=vendorCap(v,kind)) return `${coName(v)} is already serving as many clients as its ${BIZ[kind].n} units can handle (${vendorCap(v,kind)}). Expand a unit or open another.`; }
  const fee=outFee(c,j,o); if(c.cash<fee) return `${coName(c)} needs at least one month's fee, ${rp(fee)}, in its account to sign the contract.`;
  const moved=moveJobs(c,[j],null);
  (c.outs||(c.outs={}))[j]={v:o.v,name:o.name,q:o.q,m:o.m,since:S.h,last:0};
  logm(`${coName(c)} outsourced ${JOBS[j].n.toLowerCase()} to ${o.name} for about ${rp(fee)} a month${o.v!=='X'?', a group company: the fee stays inside the group':''}.${moved.length?` ${moved.join(', ')} no longer handle${moved.length>1?'':'s'} it.`:''}`,'good');
  S.dirty=true; return null;
}
function endOut(c,j){ const o=(c.outs||{})[j]; if(!o) return; delete c.outs[j]; logm(`${coName(c)} ended its contract with ${o.name} for ${JOBS[j].n.toLowerCase()}. The job is unhandled until a team or another vendor takes it.`); S.dirty=true; }
function billOuts(){
  for(const c of S.C){ for(const j of Object.keys(c.outs||{})){ const o=c.outs[j];
    if(JOBS[j].lv>(c.level||0)){ delete c.outs[j]; continue; }
    if(o.v!=='X'){ const v=acct(o.v), kind=vendorKind(j); if(!v||!vendorCovers(v,j)){ delete c.outs[j]; logm(`${coName(c)}: the outsourcing contract for ${JOBS[j].n.toLowerCase()} lapsed because ${o.name} ${!kind?'cannot provide this kind of work':v&&v.units.some(u=>u.t===kind)?'no longer has a team that does this work':'no longer runs a '+BIZ[kind].n+' unit'}.`,'bad'); continue; } }
    const fee=outFee(c,j,o); o.last=fee; c.cash-=fee; book(c,'outs',fee);
    if(o.v!=='X'){ const v=acct(o.v), kind=vendorKind(j), u=v.units.filter(x=>x.t===kind).sort((a,b)=>b.lv-a.lv)[0], cost=Math.round(fee*(1-BIZ[kind].margin));
      v.cash+=fee-cost; book(v,'rev',fee); book(v,'cogs',cost); u.mrev=(u.mrev||0)+fee; const m=um(u); m.rev+=fee; m.cost+=cost; }
  } }
}
function outModal(cid,j){
  const c=acct(cid), ext=vendorOffers(c,j), grp=groupVendors(c,j), kind=vendorKind(j), d=deptOf(c,j);
  const row=(o,i,src)=>{ const fee=outFee(c,j,o), full=o.cap!=null&&o.used>=o.cap;
    return `<div class="row" style="align-items:center"><span class="k"><b>${esc(o.name)}</b><div class="muted" style="font-size:.75rem">${src==='g'?`Group company · serving ${o.used} of ${o.cap} client jobs · fee becomes its revenue`:`${o.tier} ${OUTSRC[j][1]}`}</div></span>
      <span class="v" style="display:inline-flex;gap:10px;align-items:center"><span class="prog" style="width:70px"><i style="width:${Math.round(o.q*100)}%"></i></span>${Math.round(o.q*100)} · ${rp(fee)}/mo <button class="btn sm ${full?'':'pri'}" data-pick="${src}${i}" ${full?'disabled':''}>${full?'Full':'Hire'}</button></span></div>`; };
  openModal(`Outsource ${JOBS[j].n.toLowerCase()} · ${coName(c)}`,`<div id="os-body" style="display:flex;flex-direction:column;gap:12px">
    <p class="note">An outside vendor does the job for a monthly fee that follows the company's size. There is no team head or staff to recruit, and you can end the contract at any time. Quality is what the vendor delivers; a team of your own built around one job is usually comparable at Standard quality.${d?` <b>${esc(d.name)}</b> handles this job today and will hand it over.`:''}</p>
    <div class="eyebrow">Outside vendors this month</div><div class="rows">${ext.map((o,i)=>row(o,i,'x')).join('')}</div>
    ${kind?`<div class="eyebrow">Your own group</div>${grp.length?`<div class="rows">${grp.map((o,i)=>row(o,i,'g')).join('')}</div>`:(S.C.some(v=>v!==c&&v.units.some(u=>u.t===kind))?`<p class="note">Your ${BIZ[kind].n} compan${S.C.filter(v=>v!==c&&v.units.some(u=>u.t===kind)).length>1?'ies':'y'} can only sell work it has a team for. A basic outsourcing firm supplies general affairs and office staff; for ${esc(JOBS[j].n.toLowerCase())} it first needs its own team handling that job${j==='logi'?' (or a Logistics & transport business team)':''}.</p>`:`<p class="note">No company in your group runs a ${BIZ[kind].n} unit yet. Open one in a subsidiary (it is a medium business, so the subsidiary must be at least a Usaha Kecil) and it can take this job, earning the fee inside the group.</p>`)}`:`<p class="note">Accounting, tax, legal and audit work needs licensed specialist firms, so your outsourcing companies cannot take it.</p>`}
    <div class="rows"><div class="row"><span class="k">Company account</span><span class="v">${rp(c.cash)}</span></div></div>
    <div class="btns"><button class="btn" data-act="close">Cancel</button></div></div>`,el=>{
      el.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ const k=b.dataset.pick, o=(k[0]==='x'?ext:grp)[+k.slice(1)]; if(err(outsource(c,j,o))) return; closeModal(); render(); });
    });
}

/* ---------- Organisation panel */
function personRow(c,f,extra){
  const p=f.p, self=p.who==='P', rb=refBand(p.integ);
  return `<tr><td><b>${esc(personTitle(c,f))}</b>${extra||''}</td><td>${esc(self?S.name+' (you)':p.name)}<div class="muted" style="font-size:.75rem">${self?(p.role==='dir'?'Shared across every company you direct'+(c.reg!==S.home?`, and ${NF.format(km(S.home,c.reg))} km from your home`:''):'Owner oversight'):esc(p.bg)}</div></td>
    <td><span class="chip ${p.src==='pro'?'':'acc'}">${self?'You':p.src==='pro'?'Professional':'Family'}</span></td>
    <td class="n">${self&&p.role==='dir'?L(()=>String(skillOf(p,c))):self?'70':p.skill}</td><td>${self?'—':`<span class="chip ${rb[1]}">${rb[0]}</span>`}</td>
    <td class="n">${self?L(()=>rp(c.dir)):`<span style="display:inline-flex;gap:6px;align-items:center"><input type="number" id="bs-${p.id}" min="0" step="50000" value="${Math.round(p.sal)}" style="width:130px" aria-label="Monthly pay for ${esc(p.name)}"><button class="btn sm" data-act="bsal" data-id="${c.id}" data-b="${p.id}">Set</button></span>${p.mkt>0?`<div class="muted" style="font-size:.72rem;margin-top:2px">${p.sal<0.8*p.mkt?'<span class="down">Underpaid · </span>':''}market ${rp(p.mkt)}</div>`:''}`}</td>
    <td><button class="btn sm ${self?'':'bad'}" data-act="fire" data-id="${c.id}" data-b="${p.id}">${self?'Step down':'Dismiss'}</button></td></tr>`;
}
function orgPanel(c){
  const pt=c.form==='PT'||c.form==='PTP', canKom=c.form==='PT', me=c.board.find(b=>b.who==='P'), Z=SZ(c), lv=c.level||0, R=sizeRules(S.h);
  const cnt=t=>(c.org||[]).filter(p=>p.tier===t).length, dirs=c.board.filter(b=>b.role==='dir'), koms=c.board.filter(b=>b.role==='kom');
  const head=['Role','Name','From','Skill','References','Pay / month',''];
  const th=`<thead><tr>${head.map((h,i)=>`<th${i===3||i===5?' class="n"':''}>${h}</th>`).join('')}</tr></thead>`;
  const fnSel=b=>pt?`<div style="margin-top:4px"><select data-chg="dfn" data-id="${c.id}" data-b="${b.id}" aria-label="Function" style="width:auto;padding:3px 6px;font-size:.78rem"><option value="" ${!b.fn?'selected':''}>Director</option><option value="ceo" ${b.fn==='ceo'?'selected':''}>Direktur Utama</option>${FNS.map(f=>`<option value="${f}" ${b.fn===f?'selected':''} ${Z.fn?'':'disabled'}>${FN[f].t}${Z.fn?'':' · from Usaha Kecil'}</option>`).join('')}</select></div>`:'';
  const capRow=(n,have,max)=>`<div class="row"><span class="k">${n}</span><span class="v ${max&&have>=max?'warn':''}">${max?`${have} / ${max}`:'locked'}</span></div>`;
  return `
  <section class="panel"><div class="panel-h"><div><h3>Company size</h3><div class="note">Usaha ${Z.n} under ${esc(R.law)}. Size sets how big the head office can be and who will apply.</div></div>${L(()=>['Usaha '+SZ(c).n,''],'span','chip acc')}</div>
    <div class="panel-b"><div class="grid3">
      <div class="rows">
        <div class="row"><span class="k">Turnover, last 12 months</span>${L(()=>rp(turnover12(c)),'span','v')}</div>
        <div class="row"><span class="k">Net assets</span>${L(()=>rp(Math.max(0,equity(c))),'span','v')}</div>
        <div class="row"><span class="k">Best candidates</span><span class="v">skill up to ~${Z.tal.cap}</span></div>
      </div>
      <div class="rows">${capRow('Directors',dirs.length,Z.dirs)}${pt?capRow('Commissioners',koms.length,Z.koms):''}${capRow('Teams',(c.depts||[]).length,DEPT_MAX[lv])}<div class="row"><span class="k">Team heads</span><span class="v">${HEADT[lv].t}</span></div><div class="row"><span class="k">Jobs to cover</span><span class="v">${jobsAt(lv).length}</span></div>${capRow('Regional divisions',(c.divs||[]).length,Z.divs)}</div>
      <p class="note">${lv<3?esc(nextLevelText(c))+' '+esc(unlockText(lv+1).replace('It can now have','At that size it can have')):'The largest class: every position is open.'} Size is re-measured on the 1st of each month.</p>
    </div></div></section>

  <section class="panel"><div class="panel-h"><div><h3>${pt?'Direksi & dewan komisaris':'Management'}</h3><div class="note">${pt?esc(lawPT(S.h).law.split(' tentang')[0])+(c.form==='PTP'?': a PT Perorangan needs at least one director.':': a PT needs at least one director and one commissioner.')+(Z.fn?' Give directors a function to make them CFO, COO, CMO or CHRO.':' Functional directors (CFO, COO…) become possible at Usaha Kecil.'):'A UD or CV has no formal board. You can hire a manager to run it.'}</div></div>
      ${pt?L(()=>compliant(c)?['Board complete',''] : ['Board incomplete','down'],'span','chip'):''}</div>
    <div class="panel-b">
      <div class="grid3">
        <div class="rows"><div class="row"><span class="k">Management score</span>${L(()=>String(Math.round(mgmt(c))),'span','v')}</div>
          <div class="row"><span class="k">Effect on output</span>${L(()=>'× '+mgmtF(c).toFixed(2).replace('.',','),'span','v')}</div></div>
        <div class="rows"><div class="row"><span class="k">Governance score</span>${L(()=>String(gov(c)),'span','v')}</div>
          <div class="row"><span class="k">Head-office monitoring discount</span>${L(()=>pc(0.35*mgmt(c)/100,0),'span','v')}</div></div>
        <p class="note">Directors raise output and cut leakage. Commissioners catch fraud. Pay is set by RUPS resolution: underpaid people are likelier to skim, and professionals under 80% of market rate may resign.</p>
      </div>
      ${c.board.length?`<div class="tbl-wrap"><table>${th}<tbody>${c.board.map(b=>personRow(c,{p:b,where:'board'},b.role==='dir'?fnSel(b):'')).join('')}</tbody></table></div>`:'<p class="note warn">Nobody is running this company. Output and oversight suffer.</p>'}
      <div class="btns">
        <button class="btn pri sm" data-act="hire" data-id="${c.id}" data-v="dir">${pt?'Hire a director':'Hire a manager'}</button>
        ${canKom?`<button class="btn sm" data-act="hire" data-id="${c.id}" data-v="kom">Hire a commissioner</button>`:''}
        ${me?'':`<button class="btn sm" data-act="join" data-id="${c.id}" data-v="dir">Join as ${pt?'director':'manager'}</button>${canKom?`<button class="btn sm" data-act="join" data-id="${c.id}" data-v="kom">Join as commissioner</button>`:''}`}
      </div>
      ${me?`<div class="fields"><label class="f">Your pay from ${esc(coName(c))} / month<input type="number" id="dir-${c.id}" min="0" step="100000" value="${Math.round(c.dir)}"></label><button class="btn" data-act="setdir" data-id="${c.id}">Set pay</button></div>
      <p class="note">Paid on the 25th with PPh 21 withheld (now ${L(()=>rp(pph21(S.h,c.dir)))} / month). It is a deductible cost for the company.</p>`:''}
    </div></section>

  ${deptSection(c)}

  <section class="panel"><div class="panel-h"><div><h3>Regional divisions</h3><div class="note">A division office manages the business units nearest to it, so distant towns are run up close without founding a subsidiary. Its head is recruited for you.</div></div><button class="btn sm ${Z.divs?'pri':'ghost'}" data-act="opendiv" data-id="${c.id}">Open a division (${Z.divs?(c.divs||[]).length+'/'+Z.divs:'from Kecil'})</button></div>
    <div class="panel-b">${(c.divs||[]).length?`<div class="tbl-wrap"><table><thead><tr><th>Division</th><th>Head</th><th class="n">Units</th><th class="n">Cost / month</th><th></th></tr></thead><tbody>
      ${c.divs.map(v=>{ const units=c.units.filter(u=>officeFor(c,u.reg).div===v); return `<tr><td><b>${esc(v.name)}</b><div class="muted" style="font-size:.75rem">office in ${esc(REG[v.reg].n)} · since ${fdate(v.since)}</div></td>
        <td>${v.head?`${esc(v.head.name)} <span class="muted">· skill ${v.head.skill}</span><div class="muted" style="font-size:.75rem">${esc(v.head.bg)}</div>`:'<span class="muted">Being recruited, starts next month</span>'}</td>
        <td class="n">${units.length}</td><td class="n">${rp(divRent(v.reg,S.h)+(v.head?v.head.sal:0))}</td>
        <td><div class="btns" style="justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-act="renamediv" data-id="${c.id}" data-v="${v.id}">Rename</button><button class="btn sm bad" data-act="closediv" data-id="${c.id}" data-v="${v.id}">Close</button></div></td></tr>`; }).join('')}
      </tbody></table></div>${c.divs.some(v=>v.head)?`<div class="tbl-wrap"><table>${th}<tbody>${c.divs.filter(v=>v.head).map(v=>personRow(c,{p:v.head,where:'div',div:v})).join('')}</tbody></table></div>`:''}`:'<p class="note">No regional divisions. Every unit is monitored from head office.</p>'}</div></section>

  <section class="panel"><div class="panel-h"><div><h3>Annual pay review</h3><div class="note">Runs every 1 January. Market rates rise with the regional minimum wage whatever you choose.</div></div></div>
    <div class="panel-b">
      <div class="fields">
        <label class="f">Policy<select id="pp-${c.id}" data-chg="payp" data-id="${c.id}">${Object.entries(PAY_MODES).map(([k,n])=>`<option value="${k}" ${c.pay.mode===k?'selected':''}>${n}</option>`).join('')}</select></label>
        <label class="f">Merit on top of inflation (%)<input type="number" id="ppl-${c.id}" data-chg="payplus" data-id="${c.id}" min="0" max="20" step="0.5" value="${c.pay.plus}"></label>
      </div>
      <label class="check"><input type="checkbox" id="pps-${c.id}" data-chg="paystaff" data-id="${c.id}" ${c.pay.staff?'checked':''}> Give business-unit staff the same raise (never below UMR)</label>
      <p class="note">Last year's inflation: ${pc((INF[yearOf(S.h)-1]??2)/100,1)}. "Match the market rate" lifts anyone below their market rate up to it; the other policies raise everyone by the same percentage.</p>
    </div></section>`;
}

/* ---------- Hiring */
function capErr(c,role){
  const Z=SZ(c), cnt=t=>(c.org||[]).filter(p=>p.tier===t).length, nx=nextLevelText(c);
  if(['vp','mgr','staff'].includes(role)) return 'Head-office staff, managers and VPs are recruited automatically when you set up a team under Organisation.';
  if(role==='kom'&&c.form!=='PT') return `Only a regular PT has a board of commissioners.`;
  if(role==='dir'&&c.board.filter(b=>b.role==='dir').length>=Z.dirs) return `As a Usaha ${Z.n}, ${coName(c)} can have at most ${Z.dirs} directors. ${nx}`;
  if(role==='kom'&&c.board.filter(b=>b.role==='kom').length>=Z.koms) return `As a Usaha ${Z.n}, ${coName(c)} can have at most ${Z.koms} commissioner${Z.koms>1?'s':''}. ${nx}`;
  if(['vp','mgr','staff'].includes(role)){ const max=Z[role], nm={vp:'VPs',mgr:'managers',staff:'head-office staff'}[role];
    if(!max) return `${coName(c)} is a Usaha ${Z.n} and is too small for ${nm}. ${role==='mgr'?'Managers come at Usaha Kecil.':'VPs come at Usaha Menengah.'} ${nx}`;
    if(cnt(role)>=max) return `As a Usaha ${Z.n}, ${coName(c)} can have at most ${max} ${nm}. ${nx}`; }
  return null;
}
function hireModal(cid,role,divId){
  const c=acct(cid), pt=c.form==='PT'||c.form==='PTP', Z=SZ(c), div=divId?(c.divs||[]).find(v=>v.id===divId):null;
  if(err(capErr(c,role))) return;
  if(role==='divhead'&&(!div||div.head)) return err(div?`${div.name} already has a head.`:'That division no longer exists.');
  const what=role==='dir'&&!pt?'manager':TIER[role].n, needFn=['vp','mgr','staff'].includes(role), dirFn=role==='dir'&&pt;
  const taken=new Set(c.board.filter(b=>b.role==='dir'&&b.fn).map(b=>b.fn));
  const fnOpts=needFn?FNS.map(f=>`<option value="${f}">${FN[f].en} (${FN[f].n})</option>`).join(''):dirFn?`<option value="">No specific function</option>${!taken.has('ceo')&&!c.board.some(b=>b.role==='dir')?'<option value="ceo" selected>Direktur Utama</option>':''}${Z.fn?FNS.filter(f=>!taken.has(f)).map(f=>`<option value="${f}">${FN[f].t}</option>`).join(''):''}`:'';
  const card=x=>{ const rb=refBand(x.integ); return `<div class="unit"><div><h4>${esc(x.name)}</h4><div class="meta">${esc(x.bg)}</div>
      <div class="meta" style="display:flex;gap:8px;align-items:center;margin-top:4px">Skill <span class="prog" style="width:90px"><i style="width:${x.skill}%"></i></span> ${x.skill} <span class="chip ${rb[1]}">${rb[0]}</span></div></div>
      <div style="text-align:right"><div class="num">${rp(x.sal)} / mo</div><div class="meta">${x.fee?(role==='staff'?'Recruitment cost ':'Headhunter fee ')+rp(x.fee):'No fee'}</div><button class="btn sm pri" data-k="${x.key}" style="margin-top:6px">Hire</button></div></div>`; };
  const cs=candidates(c,role), fam=cs.filter(x=>x.src==='fam'), pro=cs.filter(x=>x.src==='pro');
  openModal(`Hire a ${what}${div?' · '+div.name:''} · ${coName(c)}`,`
    <p class="note">New candidates each month. As a Usaha ${Z.n}, ${esc(coName(c))} attracts professionals up to about skill ${Z.tal.cap}${(c.level||0)<3?`; a bigger company draws stronger people`:''}. Family is cheap and usually loyal, but rarely trained.</p>
    ${fnOpts?`<label class="f">${needFn?'Function':'Function on the board'}<select id="hm-fn">${fnOpts}</select></label>`:''}
    <div class="eyebrow">From the family</div>${fam.map(card).join('')||'<p class="note">No relatives available this month.</p>'}
    <div class="eyebrow">Professional hire</div>${pro.map(card).join('')||'<p class="note">No candidates left this month.</p>'}
    <p class="note">Company account: ${rp(c.cash)}</p>`,el=>{
    el.querySelectorAll('[data-k]').forEach(btn=>btn.onclick=()=>{ const x=cs.find(y=>y.key===btn.dataset.k), fn=el.querySelector('#hm-fn')?.value||'';
      if(err(capErr(c,role))) return;
      if(c.cash<x.fee) return err(`${coName(c)} needs ${rp(x.fee)} in its account for the ${role==='staff'?'recruitment cost':'headhunter fee'}; it holds ${rp(c.cash)}.`);
      if(x.fee){ c.cash-=x.fee; book(c,'opex',x.fee); }
      const p={id:nid('B'),who:'X',src:x.src,name:x.name,bg:x.bg,skill:x.skill,integ:x.integ,sal:x.sal,mkt:x.src==='pro'?x.sal:0,since:S.h};
      let title;
      if(role==='dir'||role==='kom'){ Object.assign(p,{role}); if(role==='dir'&&fn){ for(const b of c.board) if(b.fn===fn) b.fn=''; p.fn=fn; } c.board.push(p); title=titleOf(c,p); }
      else if(role==='divhead'){ Object.assign(p,{tier:'divhead'}); div.head=p; title=`Kepala ${div.name}`; }
      else { Object.assign(p,{tier:role,fn:fn||'ops'}); title=role; }
      (c.hired||(c.hired=[])).push(x.key);
      logm(`${coName(c)} appointed ${x.name} as ${title} at ${rp(x.sal)} a month${x.fee?`, ${role==='staff'?'recruitment cost':'headhunter fee'} ${rp(x.fee)}`:''}.`,'good');
      closeModal(); render(); });
  });
}

