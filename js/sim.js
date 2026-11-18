'use strict';
/* ============================================================
   STATE
   ============================================================ */
let S=null;
const SAVE_KEY='juragan.save.v1';
const blankPL=()=>({rev:0,cogs:0,wage:0,opex:0,mon:0,dep:0,intx:0,other:0,mfi:0,mfee:0,outs:0,tax:0,fine:0,loss:0,tn:0});
const netOf=p=>p.rev-p.cogs-p.wage-p.opex-(p.mon||0)-p.dep-p.intx+p.other+(p.mfi||0)-(p.mfee||0)-(p.outs||0)-p.tax-p.fine-(p.loss||0);
const newAcct=()=>({cash:0,deps:[],loans:[],hold:{},bonds:[]});
function nid(p){ return p+(S.nid++); }
function acct(id){ return id==='P'?S.P:S.C.find(c=>c.id===id); }
function acctName(id){ if(id==='P') return 'Personal'; if(id==='F') return 'Family partner'; if(id==='PUB') return 'Public investors'; const c=acct(id); return c?coName(c):'(closed)'; }
function coName(c){ return (FORMS[c.form].short)+' '+c.name+(c.tbk?' Tbk':''); }

function newGame(o){
  S={v:2,seed:o.seed,name:o.name||'Juragan',home:o.home,h:hOf(o.year,0,3,7),start:0,capital0:o.capital,speed:1,paused:false,living:o.living,nid:1,
     tab:'home',sel:{co:null,sym:'BBCA',acct:'P',range:'1Y',regf:{p:'',b:''}},
     P:Object.assign(newAcct(),{id:'P',cash:o.capital}), C:[], orders:[], log:[], nwh:[], over:false, news:0, lastDay:0};
  S.start=S.h;
  buildMarket(S.seed);
  S.bench=newBench(o.capital); exchangeInit();
  while(S.news<NEWS.length && NEWS[S.news][0]<keyH(S.h)) S.news++;
  logm(`Your parents transfer ${rp(o.capital,true)} into your account to start a business. Home base: ${REG[o.home].n}, ${provOf(o.home)}. ${HARI[dOf(S.h).getUTCDay()]}, ${fdate(S.h)}.`,'good');
  recordNW();
}
function migrate(){
  if(S.life){ delete S.life; if(S.tab==='life') S.tab='home'; }
  for(const a of [S.P,...S.C]){ if(a.sav) a.cash+=a.sav; delete a.sav; a.bonds=a.bonds||[]; }
  const mapR=r=>REG[r]?r:(OLD_REG[r]||'3171'); S.home=mapR(S.home||'3171');
  S.sel.regf=S.sel.regf||{p:'',b:''}; S.sel.rep=S.sel.rep||{e:'P',per:'Q',i:0}; S.P.hist=S.P.hist||[];
  for(const c of S.C){ c.reg=c.reg?mapR(c.reg):S.home; for(const u of c.units) u.reg=mapR(u.reg); for(const v of c.divs||[]) v.reg=mapR(v.reg); c.outs=c.outs||{}; for(const p of [c.mon,c.ytd,c.ytdPrev]) if(p) p.outs=p.outs||0; c.divs=c.divs||[]; c.pay=c.pay||PAY_DEF(); c.mfees=c.mfees||{}; for(const p of [c.mon,c.ytd,c.ytdPrev]) if(p){ p.mfi=p.mfi||0; p.mfee=p.mfee||0; } if(!c.board) c.board=defaultBoard(c); c.rups=c.rups||RUPS_DEF(); for(const b of c.board) if(b.mkt==null) b.mkt=b.sal; for(const p of [c.mon,c.ytd,c.ytdPrev]) if(p){ p.mon=p.mon||0; p.loss=p.loss||0; } for(const u of c.units) if(!REG[u.reg]) u.reg=S.home; }
  for(const c of S.C){ const tot=Object.values(c.own||{}).reduce((x,y)=>x+(y>0?y:0),0); if(c.shares>0&&tot<c.shares-0.5&&c.parent==='P'){ const miss=c.shares-tot; c.own.P=(c.own.P||0)+miss; logm(`Share register of ${coName(c)} corrected: ${NF.format(miss)} unassigned shares from the PT conversion returned to you.`); } }
  exchangeInit();
  for(const c of S.C) if(c.level==null) updateLevel(c,true);
  for(const c of S.C) migrateOrg(c);
  if(!S.bench){ const I=S.inv; S.bench=I?{contrib:I.contrib,bDep:I.bDep,bIhsgU:I.bIhsgU,bInfU:I.bInfU,fraudY:0}:newBench(Math.max(1,nwP())); }
  delete S.inv; if(S.tab==='inv') S.tab='home';
  for(const c of S.C) for(const u of c.units){ um(u); u.mh=u.mh||[]; }
}

/* ---------- ledger helpers */
function logm(msg,kind=''){ S.log.unshift({h:S.h,m:msg,k:kind}); if(S.log.length>400) S.log.length=400; S.logDirty=true; }
function book(c,f,amt){ if(!c||c.id==='P'||!amt) return; c.mon[f]+=amt; c.ytd[f]+=amt; if(f!=='tn') c.retained+=(f==='rev'||f==='other')?amt:-amt; }
function toast(title,msg){ const t=document.createElement('div'); t.className='toast'; t.innerHTML=`<b>${esc(title)}</b>${esc(msg)}`; const box=document.getElementById('toasts'); box.appendChild(t); while(box.children.length>4) box.firstChild.remove(); setTimeout(()=>t.remove(),7000); }

/* ---------- valuation */
const depSum=a=>a.deps.reduce((s,d)=>s+d.amt,0);
const debt=a=>a.loans.reduce((s,l)=>s+l.bal,0);
function holdMV(a){ let v=0; for(const s in a.hold) v+=a.hold[s].sh*quote(s,S.h); return v; }
function liquid(a){ return a.cash+depSum(a)+holdMV(a)+bondMV(a); }
const unitBook=c=>c.units.reduce((s,u)=>s+u.book,0);
const ownPct=(c,k)=>(c.own[k]||0)/c.shares;
function equity(c,depth=0){
  let e=liquid(c)+unitBook(c)-debt(c)-(c.taxDue||0);
  if(depth<8) for(const s of S.C) if(s.own[c.id]) e+=ownPct(s,c.id)*(s.tbk?mcap(s):equity(s,depth+1));
  return e;
}
function stakesP(){ let v=0; for(const c of S.C) if(c.own.P) v+=ownPct(c,'P')*(c.tbk?mcap(c):equity(c)); return v; }
function nwP(){ return liquid(S.P)-debt(S.P)+stakesP(); }
function recordNW(){ const v=nwP(); const last=S.nwh[S.nwh.length-1]; if(last&&last[0]===S.h) return; S.nwh.push([S.h,Math.round(v)]); }
function kol(a){ let m=0; for(const l of a.loans) m=Math.max(m,l.miss); return m===0?1:m<=2?2:m===3?3:m<=5?4:5; }
const KOL=['','Lancar','Dalam Perhatian Khusus','Kurang Lancar','Diragukan','Macet'];
function avgRev3(c){ const h=c.hist.slice(-3); if(!h.length) return c.mon.rev; return h.reduce((s,x)=>s+x.rev,0)/h.length; }

/* ============================================================
   SIMULATION
   ============================================================ */
function step(){
  S.h++;
  const d=dOf(S.h), hr=d.getUTCHours();
  if(hr===0){ newDay(d); if(S.over) return; }
  // retail sales by the hour
  for(const c of S.C) for(const u of c.units){
    const b=BIZ[u.t]; if(b.kind!=='retail'||u.w<=0||frozenNow(c)) continue;
    if(hr<b.open[0]||hr>=b.open[1]) continue;
    const daily=b.lv[u.lv].rev*cpi(S.h)*REG[u.reg].dem*staffF(u)*moraleF(u,S.h)*(u.t==='wisata'?1:seasonRetail(S.h))*shockF(u.t,u.reg,S.h)*(u.df||1)*retailMult(u.t,u.reg)*bizF(c,u)*mgmtF(c)*(1-leak(c,u))*(1+0.08*fnScore(c,'mkt')/100)*(1+0.04*fnScore(c,'hr')/100);
    const rev=daily/(b.open[1]-b.open[0])*Math.max(0.2,1+0.2*rg());
    const cogs=rev*(1-b.margin)*(1-0.04*jobQ(c,'proc'));
    c.cash+=rev-cogs; book(c,'rev',rev); book(c,'cogs',cogs); u.mrev=(u.mrev||0)+rev; const m=um(u); m.rev+=rev; m.cost+=cogs;
  }
  if(S.orders.length && isOpen(S.h)) runOrders();
  deskTick();
}

function newDay(d){
  const k=kOf(d), day=d.getUTCDate(), m=d.getUTCMonth(), y=d.getUTCFullYear();
  if(k>END_KEY){ monthClose(y,m); yearClose(y-1); endGame('The historical record ends on 31 December 2024.'); return; }
  while(S.news<NEWS.length && NEWS[S.news][0]<=k){ const n=NEWS[S.news++]; logm(n[1],'news'); toast(fkey(n[0]),n[1]); }
  if(day===1){ monthClose(y,m); if(m===0){ yearClose(y-1); S.bench.fraudY=0; } }
  if(m===0&&day===1) newYearWages(y);
  if(m===3&&day===30) payCIT();
  if(m===5&&day===15) stockDividends();
  if(LEBK[y] && k===keyH(hK(LEBK[y])-7*24)) payTHR();
  if(day===20) for(const {c} of orderedCos().reverse()) if(c.rups&&c.rups.month===m&&S.C.includes(c)) rupsRun(c);
  if(day===25) payroll();
  for(const c of [...S.C]) for(const u of c.units){
    if(BIZ[u.t].kind==='retail'){ u.df=Math.exp(0.1*rg()); continue; }
    if(u.ph==='grow'){ u.d++; if(u.d>=BIZ[u.t].cycle) harvest(c,u); }
    else if(u.auto) tryStart(c,u,true);
  }
  for(const a of [S.P,...S.C]){ dueLoans(a); matureDeps(a); }
  bondDay();
  exchangeDay(k);
  for(const a of [S.P,...S.C]) if(a.loans.some(l=>l.miss>=6)) forcedLiquidation(a);
  recordNW();
  S.dayDirty=true;
}

function tryStart(c,u,quiet){
  const b=BIZ[u.t], cost=b.lv[u.lv].input*cpi(S.h)*(b.land?landAdj(u.reg):1)*(1-0.04*jobQ(c,'proc'));
  if(frozenNow(c)){ u.wait=true; return false; }
  if(c.cash<cost){ if(!u.wait) logm(`${coName(c)}: ${b.n} is idle, waiting for ${rp(cost)} in the company account to restock.`,'bad'); u.wait=true; return false; }
  c.cash-=cost; book(c,'cogs',cost); um(u).cost+=cost; u.ph='grow'; u.d=0; u.wait=false; u.inCost=cost; return true;
}
function harvest(c,u){
  const b=BIZ[u.t], L=b.lv[u.lv];
  const bf=bizF(c,u), fail=rnd()<b.fail*(1-0.5*jobQ(c,'qc'))*(bf<0.85?1.3:1.1-0.4*(bf-0.85)/0.25);
  const kg=Math.round(L.yield*(u.w<=0?0.35:0.6+0.4*Math.min(1.08,staffF(u)))*moraleF(u,S.h)*specF(u)*bf*mgmtF(c)*(1-leak(c,u))*(1+0.04*fnScore(c,'hr')/100)*Math.exp(0.07*rg())*(fail?0.2+0.3*rnd():1));
  const price=Math.round(commodityPrice(u.t,S.h)*Math.exp(b.vol*rg())*(1+0.05*fnScore(c,'mkt')/100)/10)*10;
  const rev=kg*price;
  c.cash+=rev; book(c,'rev',rev); um(u).rev+=rev;
  u.last={kg,price,rev,cost:u.inCost||0,fail,h:S.h};
  u.ph='idle'; u.d=0;
  logm(`${coName(c)} · ${b.n}: ${fail?'poor harvest, ':''}${NF.format(kg)} ${unitOf(b)} ${b.prod} at ${rp(price,true)}/${unitOf(b)} = ${rp(rev)}.`, fail?'bad':(rev>(u.inCost||0)?'good':''));
  if(u.auto) tryStart(c,u);
}

function monthClose(y,m){
  // m is the month that just started; close the previous month
  const pd=new Date(Date.UTC(y,m,1)-864e5), py=pd.getUTCFullYear(), pm=pd.getUTCMonth();
  const h=S.h;
  for(const a of [S.P,...S.C]){
    if(a.cash>0){ const gross=a.cash*savRate(h)/12, net=gross*(a.cash>7.5e6?0.8:1); a.cash+=net; book(a,'other',net); srcAdd(a,'int',net); }
    else if(a.cash<0){ const od=-a.cash*0.02; a.cash-=od; book(a,'intx',od); if(a.id==='P') expAdd('interest',od); logm(`${a.id==='P'?'Personal account':coName(a)}: overdraft charge ${rp(od)}.`,'bad'); }
  }
  S.bench.bDep*=1+depRate(h,12)*0.8/12;
  billFees(); billOuts(); exchangeMonth();
  for(const c of S.C){
    const uNets={};
    for(const v of c.divs||[]){ const r=divRent(v.reg,h); c.cash-=r; book(c,'opex',r); }
    for(const u of c.units){
      const L=BIZ[u.t].lv[u.lv];
      const ox=L.opex*cpi(h)*REG[u.reg].land*(1-0.05*jobQ(c,'ga')); c.cash-=ox; book(c,'opex',ox);
      const mc=monCost(c,u); c.cash-=mc; book(c,'mon',mc);
      if(u.t==='bpr'){ const yy=yearOf(h), crisis=(yy===2008||yy===2009||yy===2020||yy===2021)?2:1; if(rnd()<0.05*crisis*(1-0.5*jobQ(c,'risk'))*(1-0.4*fnScore(c,'fin')/100)){ const bl=Math.round(u.cap*(0.02+0.06*rnd())); c.cash-=bl; book(c,'loss',bl); um(u).cost+=bl; logm(`${coName(c)} · BPR in ${REG[u.reg].n}: a batch of loans went bad (kredit macet). Write-off ${rp(bl)}. Risk management and a strong finance team reduce this.`,'bad'); } }
      const dp=Math.min(u.book,u.cap*(BIZ[u.t].depr??1)/48); if(dp>0){ u.book-=dp; book(c,'dep',dp); }
      if(u.w>0 && u.sal<umr(u.reg,h) && rnd()<0.07*(1-0.8*fnScore(c,'hr')/100)){
        const short=(umr(u.reg,h)-u.sal)*u.w*6, fine=Math.round(short*1.1);
        c.cash-=fine; book(c,'fine',fine); u.sal=umr(u.reg,h);
        logm(`Labour inspection (Disnaker) at ${coName(c)}, ${REG[u.reg].n}: wages below UMR. Back pay and fine ${rp(fine)}. Wage raised to ${rp(u.sal,true)}.`,'bad');
        toast('Disnaker inspection',`${coName(c)} fined ${rp(fine)} for paying under UMR.`);
      }
      { const m=um(u); m.cost+=ox+mc+dp; (u.mh||(u.mh=[])).push(Math.round(m.rev-m.cost)); uNets[u.id]=[`${BIZ[u.t].n} · ${REG[u.reg].n}`,Math.round(m.rev-m.cost)]; if(u.mh.length>24) u.mh.shift(); u.m={rev:0,cost:0}; }
      u.mrev=0;
    }
    for(const f of allPeople(c)){ const b=f.p; if(b.src==='pro'&&b.mkt>0&&b.sal<0.8*b.mkt&&rnd()<0.25*(1-0.6*fnScore(c,'hr')/100)){ removePerson(c,f); logm(`${b.name} resigned from ${coName(c)}: ${rp(b.sal)} a month is well below the ${rp(b.mkt)} the market pays.`,'bad'); toast('Resignation',`${b.name} left ${coName(c)} over pay.`); S.dirty=true; } }
    const G=gov(c);
    const fin=fnScore(c,'fin');
    for(const f of allPeople(c)){
      const b=f.p; if(c.cash<=0) continue;
      const p=Math.pow((100-effInteg(b))/100,2)*0.06*(1-0.75*G/100)*(FRAUDW[b.role||b.tier]||0.4)*(1-0.6*fin/100)*(1-0.3*jobQ(c,'risk'));
      if(rnd()>=p) continue;
      const amt=Math.round(Math.min(c.cash,Math.max(5e6*cpi(h),c.cash*(0.03+0.07*rnd()))));
      c.cash-=amt; book(c,'loss',amt); S.bench.fraudY++;
      if(rnd()<0.25+0.6*G/100+0.3*fin/100+0.35*jobQ(c,'audit')){ const back=Math.round(amt*0.4), t=personTitle(c,f); c.cash+=back; book(c,'loss',-back); removePerson(c,f);
        logm(`${coName(c)}: ${fin>G?'the finance team':'the commissioners'} caught ${t} ${b.name} diverting ${rp(amt)}. ${rp(back)} recovered and ${b.name} is dismissed.`,'bad'); toast('Fraud uncovered',`${b.name} skimmed ${rp(amt)} from ${coName(c)}.`); }
      else logm(`${coName(c)}: ${rp(amt)} is missing from the accounts and nobody can explain it. Stronger commissioners catch this.`,'bad');
      S.dirty=true;
    }
    const reg=umkmRegime(c,py,pm); c.regime=reg;
    if(reg.k==='final'){
      let base=c.mon.rev;
      if(c.form==='UD' && py>=2022){ const before=c.ytd.rev-c.mon.rev; base=Math.max(0,c.ytd.rev-Math.max(500e6,before)); }
      const t=base*reg.r; if(t>0){ c.cash-=t; book(c,'tax',t); }
    } else {
      const p=c.mon; book(c,'tn',p.rev-p.cogs-p.wage-p.opex-p.mon-p.dep-p.intx+(p.mfi||0)-(p.mfee||0)-(p.outs||0));
    }
    const names={}; for(const key in c.srcM||{}){ const id=key.split(':')[1]; if(id){ const x=acct(id); names[id]=x?coName(x):'(closed company)'; } }
    c.hist.push({k:py*100+pm+1,...c.mon,net:netOf(c.mon),bs:balanceOf(c),src:c.srcM||{},units:uNets,names}); c.srcM={};
    if(c.hist.length>240) c.hist.shift();
    c.mon=blankPL();
    updateLevel(c);
    for(const d of c.depts||[]) staffDept(c,d);
    for(const v of c.divs||[]) if(!v.head){ v.head=autoHead(c,v,-2); v.head.tier='divhead'; const fee=2*v.head.sal; c.cash-=fee; book(c,'opex',fee); logm(`${coName(c)} recruited ${v.head.name} to head ${v.name} (fee ${rp(fee)}).`); }
    corpRisks(c,h);
  }
  closePersonalMonthPending=py*100+pm+1;
  if(S.living){
    const lc=livingCost(h), P=S.P; P.cash-=lc; expAdd('living',lc);
    if(P.cash<0){ logm(`Living costs of ${rp(lc)} overdrew your personal account to ${rp(P.cash)}. Overdraft costs 2% a month: pay yourself from a company or sell assets.`,'bad'); toast('Personal account overdrawn','Living costs exceed your balance. Pay yourself from a company or sell assets.'); }
  }
  closePersonalMonth(closePersonalMonthPending);
  if(S.tab==='rep') S.dirty=true;
}
let closePersonalMonthPending=null;
function migrateOrg(c){ c.depts=c.depts||[]; if(!(c.org||[]).length){ delete c.org; return; }
  const lv=c.level||0; for(const fn of FNS){ const ps=c.org.filter(p=>p.fn===fn); if(!ps.length) continue; const jobs=jobsAt(lv).filter(j=>JOBS[j].fn===fn&&!deptOf(c,j)); if(!jobs.length) continue;
    const best=ps.sort((a,b)=>b.skill-a.skill)[0]; c.depts.push({id:nid('T'),name:{fin:'Keuangan',ops:'Operasional',mkt:'Pemasaran',hr:'SDM'}[fn],jobs,head:{...best,tier:'dhead',hl:lv},staff:Math.max(1,ps.length-1),staffSal:staffPay(c),since:S.h}); }
  delete c.org; }
// Compliance risks. What can go wrong, how often and what it costs depend on the company's actual
// workforce and how hazardous its businesses are, not on its paper size. Statutory fines are the
// nominal amounts in the law of the day; most of the real cost is the back payment or the fix.
const HAZ={batubara:1,minyak:1,gas:1,tangkap:1,spbu:0.8,agen_lpg:0.6,mebel:0.6,logistik:0.5,konveksi:0.4,batik:0.4,sawit:0.4,karet:0.3,tembakau:0.3,ayam:0.3,sapi:0.3,udang:0.3};
const hazOf=t=>HAZ[t]??(BIZ[t]&&BIZ[t].kind==='cycle'?0.2:0.05); // farms 0.2; shops, eateries, services 0.05
function workforce(c){ return c.units.reduce((n,u)=>n+u.w,0)+(c.depts||[]).reduce((n,d)=>n+d.staff+(d.head?1:0),0); }
function corpRisks(c,h){
  if(!c.units.length) return;
  const k=keyH(h), W=workforce(c), lg=1-0.3*jobQ(c,'legal'), wages=c.units.reduce((s,u)=>s+u.w*u.sal,0)+(c.depts||[]).reduce((s,d)=>s+d.staff*d.staffSal,0);
  const q=j=>Math.max(jobQ(c,j),0.25*mgmt(c)/100); // with no team for it, the directors still catch some of it
  const hit=(j,p)=>rnd()<p*(1-q(j));
  const pay=(amt,msg,kind)=>{ amt=Math.round(amt/1000)*1000; if(amt<=0) return; c.cash-=amt; book(c,'fine',amt); logm(`${coName(c)}: ${msg}`,kind||'bad'); S.dirty=true; };
  // K3 workplace safety (UU 1/1970). P2K3 and later SMK3 are compulsory with 100+ workers or high-hazard work.
  const hz=c.units.map(u=>({u,z:hazOf(u.t)})), hiHaz=hz.some(x=>x.z>=0.8), exp=hz.reduce((s,x)=>s+x.z*x.u.w,0);
  const k3p=(W>=100||hiHaz?0.015:0.002)*Math.min(2,0.3+exp/20);
  if(exp>0.5&&hit('qc',k3p)){
    const x=hz.filter(y=>y.z>=0.2&&y.u.w>0).sort((a,b)=>b.z*b.u.w-a.z*a.u.w)[0]||hz[0], u=x.u;
    const fix=(5+3*Math.sqrt(u.w))*umr(u.reg,h)*x.z*(0.6+0.8*rnd())*lg, smk3=W>=100&&k>=20120412;
    pay(fix+100000,`a K3 safety inspection at ${BIZ[u.t].n} in ${REG[u.reg].n} found ${x.z>=0.8?'unsafe installations and missing protective gear':x.z>=0.4?'unguarded machines and blocked fire exits':'missing fire extinguishers and first-aid kits'}${smk3?', and no SMK3 safety system (PP 50/2012)':''}. Corrections ordered: ${rp(fix)}, plus the Rp 100.000 fine set by UU 1/1970.`);
  }
  // Social security audit: under-reported wages mean back contributions plus 2% a month.
  const covered=k>=20140101||W>=10||wages>=1e6;
  if(covered&&wages>0&&hit('payroll',0.004+0.02*Math.min(1,W/100))){
    const m=6+Math.floor(rnd()*7), back=wages*bpjsRate(h)*(0.15+0.2*rnd())*m, intr=back*0.02*m/2;
    pay((back+intr)*lg,`${k<20140101?'a Jamsostek':'a BPJS'} audit found wages under-reported for ${m} months. Back contributions ${rp(back)} plus ${rp(intr)} late interest (2% a month).`);
  }
  // Wajib Lapor Ketenagakerjaan (UU 7/1981): the fine has been capped at Rp 1 juta since 1981.
  if(W>0&&hit('regrep',0.003+0.006*Math.min(1,W/50))) pay(1e6,`the yearly workforce report to Disnaker (WLKP) was missing. Fine Rp 1.000.000 under UU 7/1981.`);
  // Investment report to BKPM for medium and large companies: written warnings, then a frozen licence.
  if((c.level||0)>=2&&k>=20100101&&hit('regrep',0.02)){
    c.lkpm=(c.lkpm||[]).filter(t=>h-t<8766).concat(h);
    if(c.lkpm.length>=3){ c.lkpm=[]; c.frozen=h+30*24; logm(`${coName(c)}: a third warning in a year for late investment reports (LKPM). BKPM freezes its business licence for one month: its shops and services cannot sell and no new production cycle can start until ${fdate(c.frozen)}.`,'bad'); toast('Licence frozen',`${coName(c)} cannot trade for a month.`); S.dirty=true; }
    else logm(`${coName(c)}: written warning ${c.lkpm.length} of 3 from BKPM for a late investment report (LKPM). A third within a year freezes the business licence.`,'bad');
  }
  // Labour disputes need a real workforce; they end in a settlement, not a fine.
  if(W>=10&&hit('ir',0.002+0.012*Math.min(1,W/200))){
    const n=Math.min(10,1+Math.floor(W/60*rnd())), mo=2+Math.floor(rnd()*5), avg=wages/Math.max(1,W);
    pay(n*mo*avg*lg,`${n} worker${n>1?'s':''} took a dismissal dispute to the Disnaker mediator${k>=20060114?' (UU 2/2004)':' (P4D)'}. Settled for ${mo} months' pay each.`);
  }
}
const frozenNow=c=>c.frozen&&S.h<c.frozen;
function livingCost(h){ return 1.5e6*cpi(h)*(0.55+0.45*umr(S.home,h)/umr('3171',h)); }
function yearClose(y){
  for(const c of S.C){
    let taxable=c.ytd.tn;
    if(c.ytd.mfee>0.05*c.ytd.rev&&c.form!=='UD'){ const ex=c.ytd.mfee-0.05*c.ytd.rev; taxable+=ex; logm(`${coName(c)}: the tax office treats ${rp(ex)} of management fees above 5% of revenue as non-deductible for ${y} (koreksi fiskal).`,'bad'); }
    let tax=0;
    if(taxable>0) tax = c.form==='UD' ? pit(y,taxable-ptkp(y)) : cit(y,taxable,c.ytd.rev);
    if(tax>0&&c.form!=='UD'){ const q=jobQ(c,'tax'); if(rnd()<0.6*(1-q)){ const pen=Math.round(tax*0.1*(1-q)); tax+=pen; logm(`${coName(c)}: the ${y} tax return had errors. Administrative penalty ${rp(pen)} (sanksi administrasi). A team handling tax filing prevents this.`,'bad'); } }
    if((c.level||0)>=3&&c.units.some(u=>RESOURCE.includes(u.t))){ const q=jobQ(c,'csr'); if(q<0.5){ const fine=Math.round(50e6*cpi(S.h)*(1-q)); c.cash-=fine; book(c,'fine',fine); logm(`${coName(c)}: no adequate CSR programme for ${y} although it works with natural resources (UU 40/2007 Art. 74, PP 47/2012). Sanction ${rp(fine)}.`,'bad'); } }
    tax=tbkTaxCut(c,y,tax);
    if(c.pph23>0){ const cr=Math.min(tax,c.pph23); if(cr>0) logm(`${coName(c)} credits ${rp(cr)} of PPh 23 withheld on management fees against its ${y} income tax.`); tax-=cr; c.pph23=0; }
    if(tax>0){
      c.taxDue=(c.taxDue||0)+tax; c.taxDueH=hOf(y+1,3,30); c.retained-=tax;
      const last=c.hist[c.hist.length-1]; if(last){ last.net-=tax; last.tax+=tax; }
      c.ytd.tax+=tax;
      logm(`${coName(c)}: ${c.form==='UD'?'personal income tax on business profit':'corporate income tax (PPh Badan)'} for ${y} assessed at ${rp(tax)}, due 30 April.`);
    }
    c.prevTurnover=c.ytd.rev; c.ytdPrev={...c.ytd,y}; c.ytd=blankPL();
  }
}
function payCIT(){ for(const c of S.C) if(c.taxDue>0){ c.cash-=c.taxDue; logm(`${coName(c)} paid ${rp(c.taxDue)} annual income tax.`); c.taxDue=0; } }
function newYearWages(y){
  logm(`New minimum wages for ${y}. UMP DKI Jakarta is now ${rp(UMP[y]||UMP[2025],true)}.`,'news');
  for(const c of S.C){ let n=0; for(const u of c.units){ const m=umr(u.reg,S.h); if(c.autoUMR && u.sal<m){ u.sal=m; n++; } } if(n) logm(`${coName(c)}: raised ${n} wage line(s) to the new UMR.`); payReview(c,y); }
}
function payroll(){
  const br=bpjsRate(S.h);
  for(const c of S.C){
    let staff=0; for(const u of c.units){ const w=u.w*u.sal*(1+br); staff+=w; um(u).cost+=w; }
    for(const d of c.depts||[]) staff+=d.staff*d.staffSal*(1+br);
    let brd=0; for(const {p} of allPeople(c)) brd+=p.sal;
    const me=c.dir>0&&onBoard(c,'P')?c.dir:0, tot=staff+brd+me;
    if(tot<=0) continue;
    c.cash-=tot; book(c,'wage',tot);
    if(me){ S.P.cash+=me-pph21(S.h,me); srcAdd(S.P,'sal:'+c.id,me-pph21(S.h,me)); }
    logm(`Gajian at ${coName(c)}: ${rp(tot)}${staff?`, staff and teams ${rp(staff)} incl. ${(br*100).toLocaleString('id-ID')}% employer social security`:''}${brd?`, board and management ${rp(brd)}`:''}${me?`, your pay ${rp(me-pph21(S.h,me))} net of PPh 21`:''}.`);
  }
}
function payTHR(){
  for(const c of S.C){
    let tot=0; for(const u of c.units){ tot+=u.w*u.sal; um(u).cost+=u.w*u.sal; } for(const {p} of allPeople(c)) tot+=p.sal; for(const d of c.depts||[]) tot+=d.staff*d.staffSal;
    const me=c.dir>0&&onBoard(c,'P')?c.dir:0; if(me){ S.P.cash+=me-pph21(S.h,me); srcAdd(S.P,'sal:'+c.id,me-pph21(S.h,me)); tot+=me; }
    if(tot>0){ c.cash-=tot; book(c,'wage',tot); logm(`THR (Lebaran bonus) paid at ${coName(c)}: ${rp(tot)}, one month's pay for staff and board, due H-7 by law.`); }
  }
}
function stockDividends(){
  for(const a of [S.P,...S.C]) for(const s in a.hold){
    const st=STK[s], sh=a.hold[s].sh; if(!sh) continue;
    const gross=sh*MK[s][lastFullIdx(S.h)]*st.y;
    const rate=a.id==='P'?divTaxIndiv(S.h):divTaxCorp(S.h,0.01), net=gross*(1-rate);
    a.cash+=net; book(a,'other',net); srcAdd(a,'stkdiv',net);
    logm(`${acctName(a.id)} received ${rp(net)} dividend from ${s}${rate?` after ${pc(rate,0)} withholding`:''}.`,'good');
  }
}

/* ---------- banking */
function annuity(P,r,n){ const i=r/12; return i===0?P/n:P*i/(1-Math.pow(1+i,-n)); }
function dueLoans(a){
  for(const l of [...a.loans]){
    if(S.h<l.due) continue;
    const pay=l.pay, avail=a.cash;
    const interest=l.bal*l.r/12;
    if(avail>=pay){
      a.cash-=pay;
      book(a,'intx',interest); if(a.id==='P') expAdd('interest',interest); l.bal=Math.max(0,l.bal-(pay-interest)); l.left--; l.miss=0;
      if(l.left<=0||l.bal<1){ a.loans.splice(a.loans.indexOf(l),1); logm(`${acctName(a.id)}: ${l.name} paid off.`,'good'); S.dirty=true; continue; }
    } else {
      const pen=pay*0.02; l.bal+=interest+pen; book(a,'intx',interest+pen); if(a.id==='P') expAdd('interest',interest+pen); l.miss++;
      l.pay=annuity(l.bal,l.r,l.left);
      logm(`${acctName(a.id)} missed a ${l.name} instalment of ${rp(pay)}. Credit status: ${KOL[kol(a)]}.`,'bad');
      toast('Missed instalment',`${acctName(a.id)} · ${l.name}. Status: ${KOL[kol(a)]}.`);
    }
    l.due=addMonths(l.due,1);
  }
}
function matureDeps(a){
  for(const d of [...a.deps]){
    if(S.h<d.mat) continue;
    const net=d.amt*d.r*d.m/12*0.8;
    a.cash+=net; book(a,'other',net); srcAdd(a,'int',net);
    if(d.aro){ d.r=depRate(S.h,d.m); d.mat=addMonths(S.h,d.m); logm(`${acctName(a.id)}: deposito rolled over (ARO) at ${pc(d.r)}; interest ${rp(net)} credited.`); }
    else { a.cash+=d.amt; a.deps.splice(a.deps.indexOf(d),1); logm(`${acctName(a.id)}: deposito of ${rp(d.amt)} matured, ${rp(net)} interest after 20% final tax.`,'good'); }
    S.dirty=true;
  }
}
function forcedLiquidation(a){
  logm(`Bank declares ${acctName(a.id)}'s loan Macet (kolektibilitas 5) and seizes assets.`,'bad');
  toast('Kredit macet',`The bank is seizing assets from ${acctName(a.id)}.`);
  for(const d of a.deps) a.cash+=d.amt; a.deps=[];
  for(const s in a.hold){ a.cash+=a.hold[s].sh*quote(s,S.h)*0.9975; } a.hold={};
  for(const b of a.bonds||[]) a.cash+=b.face*bondPx(b)*0.995; a.bonds=[];
  if(a.id!=='P'){ for(const u of a.units) a.cash+=u.book*0.4; a.units=[]; }
  for(const l of [...a.loans]){ const p=Math.min(Math.max(a.cash,0),l.bal); a.cash-=p; l.bal-=p; if(l.bal<1) a.loans.splice(a.loans.indexOf(l),1); else { l.miss=3; l.pay=annuity(l.bal,l.r,Math.max(6,l.left)); } }
  if(a.id==='P' && a.loans.length){ endGame('Personal bankruptcy (pailit): the bank seized everything and debt remains.'); }
  if(a.id!=='P' && a.loans.length){
    if(a.form==='PT'||a.form==='PTP'){ logm(`${coName(a)} is insolvent. As a PT, its remaining debt of ${rp(debt(a))} stays with the company; your liability is limited.`,'bad'); a.loans=[]; a.cash=Math.max(0,a.cash); }
    else { const rem=debt(a); S.P.loans.push({id:nid('L'),name:`Debt assumed from ${coName(a)}`,prod:'KTA',P:rem,bal:rem,r:ktaRate(S.h),n:24,left:24,pay:annuity(rem,ktaRate(S.h),24),due:addMonths(S.h,1),miss:0}); a.loans=[]; logm(`${coName(a)} is a ${a.form}: you are personally liable. ${rp(rem)} of its debt moves to you.`,'bad'); }
  }
  S.dirty=true;
}

/* ---------- market orders */
function placeOrder(aid,sym,side,lots,lim){
  if(!listed(sym,S.h)) return `${sym} (${STK[sym].n}) only lists on the exchange on ${fkey(STK[sym].ipo)}.`;
  if(!(lots>0)) return 'Enter a number of lots.';
  if(STK[sym]&&STK[sym].co){ const e=tbkPre(aid,sym,side); if(e) return e; }
  if(lim!=null){
    if(!(lim>0)) return 'Enter a limit price.';
    lim=roundTick(lim);
    const hit=side==='buy'?quote(sym,S.h)<=lim:quote(sym,S.h)>=lim;
    if(isOpen(S.h)&&hit) return execOrder(aid,sym,side,lots);
    S.orders.push({id:nid('O'),a:aid,s:sym,side,lots,h:S.h,lim,exp:S.h+30*24});
    logm(`${acctName(aid)}: limit order to ${side} ${lots} lot ${sym} at ${NF.format(lim)} or better, good for 30 days.`);
    return null;
  }
  if(isOpen(S.h)) return execOrder(aid,sym,side,lots);
  S.orders.push({id:nid('O'),a:aid,s:sym,side,lots,h:S.h});
  logm(`${acctName(aid)}: ${side==='buy'?'buy':'sell'} order for ${lots} lot ${sym} queued for the next session.`);
  return null;
}
function execOrder(aid,sym,side,lots,quiet){
  const a=acct(aid); if(!a) return 'Account no longer exists.';
  if(STK[sym]&&STK[sym].co) return tbkTrade(a,sym,side,lots,quiet);
  const px=quote(sym,S.h), sh=lots*lotSize(S.h), gross=sh*px;
  if(side==='buy'){
    const fee=gross*0.0015, cost=gross+fee;
    if(a.cash<cost) return `Not enough in the account: need ${rp(cost)}, ${acctName(aid)} has ${rp(a.cash)}.`;
    a.cash-=cost; const hd=a.hold[sym]||(a.hold[sym]={sh:0,cost:0}); hd.sh+=sh; hd.cost+=cost;
    if(!quiet) logm(`${acctName(aid)} bought ${lots} lot (${NF.format(sh)} shares) ${sym} at ${NF.format(px)}. Total ${rp(cost)} incl. fees.`);
  } else {
    const hd=a.hold[sym]; let q=sh; if(!hd||hd.sh<=0) return `${acctName(aid)} holds no ${sym}.`;
    if(q>hd.sh) q=hd.sh;
    const g=q*px, fee=g*0.0015, tax=g*0.001, proceeds=g-fee-tax, basis=hd.cost*q/hd.sh, gain=proceeds-basis;
    a.cash+=proceeds; hd.sh-=q; hd.cost-=basis; if(hd.sh<=0) delete a.hold[sym];
    book(a,'other',gain); srcAdd(a,'gain',gain); if(a.id==='P') S.P.realized=(S.P.realized||0)+gain;
    if(!quiet) logm(`${acctName(aid)} sold ${NF.format(q)} shares ${sym} at ${NF.format(px)}. Proceeds ${rp(proceeds)} after 0,1% final tax; ${gain>=0?'gain':'loss'} ${rp(Math.abs(gain))}.`, gain>=0?'good':'bad');
  }
  S.dirty=true; return null;
}
function runOrders(){
  const os=S.orders, n0=os.length; S.orders=[];
  for(const o of os){
    if(o.lim){ const q=quote(o.s,S.h), hit=o.side==='buy'?q<=o.lim:q>=o.lim;
      if(!hit){ if(S.h>=o.exp) logm(`${acctName(o.a)}: limit order to ${o.side} ${o.lots} lot ${o.s} at ${NF.format(o.lim)} expired unfilled.`); else S.orders.push(o); continue; } }
    const err=execOrder(o.a,o.s,o.side,o.lots); if(err) logm(`Queued order failed: ${err}`,'bad');
  }
  if(S.orders.length!==n0) S.dirty=true;
}

function endGame(why){ S.over=true; S.overWhy=why; S.paused=true; S.final=finalEval(); logm(why,'news'); logm(`Final tally: ${S.final.rank}. Net worth ${rp(S.final.nw)} against ${rp(S.final.b.dep)} had your parents' money sat in deposito.`,'news'); S.dirty=true; save(); }

/* ============================================================
   PLAYER ACTIONS
   ============================================================ */
const momName=id=>'Ibu '+FEM[(parseInt(String(id).slice(1))*7)%FEM.length];
function pickBoard(tmp,key,role){
  if(key==='P') return {who:'P',role,src:'self',skill:0,integ:100,sal:0,mkt:0,since:S.h};
  if(key==='MOM') return {who:'X',role,src:'fam',name:momName(tmp.id),bg:'Your mother, the family shareholder',skill:40,integ:90,sal:0,mkt:0,since:S.h};
  const x=candidates(tmp,role).find(y=>y.key===key); if(!x) return null;
  return {who:'X',role,src:x.src,name:x.name,bg:x.bg,skill:x.skill,integ:x.integ,sal:x.sal,mkt:x.sal,since:S.h,fee:x.fee,key};
}
function foundCompany(o){
  const h=S.h, src=acct(o.owner); if(!src) return 'Choose who owns the company.';
  const name=(o.name||'').trim(); if(!name) return 'Give the company a name.';
  if(S.C.some(x=>x.name.toLowerCase()===name.toLowerCase())) return `You already have a company called ${name}. Pick another name.`;
  if(!REG[o.reg]) return 'Choose the regency where the company is registered.';
  const law=lawPT(h), isPT=o.form==='PT'||o.form==='PTP', short=o.form==='PTP'?'PT Perorangan':FORMS[o.form].short;
  if(o.form==='PTP' && h<H_PTP) return 'PT Perorangan only exists from February 2021 (PP 8/2021).';
  if((o.form==='UD'||o.form==='CV'||o.form==='PTP') && o.owner!=='P') return `A ${short} can only be owned by an individual. Subsidiaries must be regular PTs.`;
  if(o.owner!=='P'){ const par=acct(o.owner); if(!par||par.form!=='PT') return 'Only a regular PT can be a parent company.'; }
  const cap=+o.capital||0; if(cap<=0) return 'Enter the capital you put in.';
  let pct=0, partner=null;
  if(o.form==='CV'){ pct=clamp((+o.pct||0)/100,0.01,0.49); partner='F'; }
  if(o.form==='PT'){ pct=clamp((+o.pct||1)/100,0.01,0.49); partner=o.partner||'F'; if(partner===o.owner) return 'The two founders must be different.'; }
  const total=cap/(1-pct), pcap=total-cap;
  if(o.form==='PT' && total<law.minPaid) return `Paid-up capital must be at least ${rp(law.minPaid,true)} under ${law.law}.`;
  const tmp={id:'C'+S.nid,reg:o.reg,hired:[],level:sizeOf(total,0,h)};
  if(!o.dir) return isPT?`Choose the Direktur Utama. A ${short} cannot be registered without a director (UU 40/2007 Art. 92).`:`Choose who runs the ${short}: you or a hired manager.`;
  if(o.form==='PT'&&!o.kom) return 'Choose a commissioner. A PT needs at least one (UU 40/2007 Art. 108).';
  if(o.form==='PT'&&o.dir==='P'&&o.kom==='P') return 'You cannot be both director and commissioner of the same PT. Pick someone else for one of the two seats.';
  const picks=[[o.dir,'dir'],...(o.form==='PT'?[[o.kom,'kom']]:[])].map(([k,r])=>pickBoard(tmp,k,r));
  if(picks.some(p=>!p)) return 'That candidate is no longer available this month. Pick again.';
  const hf=picks.reduce((s,p)=>s+(p.fee||0),0);
  if(hf>=total) return `The headhunter fees of ${rp(hf)} are more than the company's ${rp(total)} starting capital. Raise the capital, or pick yourself or a relative.`;
  const fee=formFee(o.form,h);
  if(src.cash<cap+fee) return `Not enough capital to open another ${short}. You need ${rp(cap+fee)} (capital ${rp(cap)} + setup fees ${rp(fee)}), but ${o.owner==='P'?'your personal account':coName(src)} holds ${rp(src.cash)}. Lower the capital, or pay yourself a dividend from a company first.`;
  if(partner && partner!=='F'){ const pa=acct(partner); if(!pa||pa.cash<pcap) return `${acctName(partner)} needs ${rp(pcap)} for its ${pc(pct,0)} stake.`; pa.cash-=pcap; }
  src.cash-=cap+fee;
  if(o.owner!=='P') book(src,'opex',fee);
  const shares=Math.max(1,Math.round(total/1000));
  const own={}; own[o.owner]=Math.round(shares*(1-pct)); if(partner) own[partner]=shares-own[o.owner];
  const c=Object.assign(newAcct(),{id:nid('C'),name,form:o.form,reg:o.reg,parent:o.owner,own,shares,paidIn:total,retained:0,dir:0,autoUMR:true,units:[],mon:blankPL(),ytd:blankPL(),hist:[],taxDue:0,prevTurnover:null,founded:h});
  c.cash=total-hf; if(hf) book(c,'opex',hf);
  c.board=picks.map(p=>{ const {fee:_f,key:_k,...b}=p; return {...b,id:nid('B')}; });
  c.hired=picks.filter(p=>p.key).map(p=>p.key); c.rups=RUPS_DEF(); c.depts=[]; c.divs=[]; c.pay=PAY_DEF(); c.mfees={}; c.level=tmp.level;
  { const d0=c.board.find(b=>b.role==='dir'); if(d0) d0.fn='ceo'; }
  S.C.push(c); S.sel.co=c.id;
  const how={UD:'registered with SIUP/TDP',CV:'deed signed before a notary and registered',PT:'deed signed before a notary and ratified by the Ministry of Law and Human Rights',PTP:'registered online with a statement of establishment'}[o.form];
  logm(`${coName(c)} founded in ${REG[o.reg].n}, ${provOf(o.reg)}: ${how}. Paid-up capital ${rp(total)}${partner?`, ${acctName(partner)} holds ${pc(pct,0)}`:''}. Setup fees ${rp(fee)}${hf?`, headhunter fees ${rp(hf)}`:''}. ${c.board.map(b=>`${titleOf(c,b)}: ${b.who==='P'?'you':b.name}`).join(' · ')}.`,'good');
  return null;
}
function addUnit(cid,t,reg){
  const c=acct(cid), b=BIZ[t], L=b.lv[0];
  if(!allowed(t,reg)) return `${b.n} is not possible in ${REG[reg].n}. ${whyNot(t)}.`;
  { const g=bizGate(c,t); if(g) return g; }
  const cost=L.setup*cpi(S.h)*landAdj(reg);
  if(c.cash<cost) return `${coName(c)} needs ${rp(cost)} in its account. Inject capital or take a loan first.`;
  c.cash-=cost;
  const u={id:nid('U'),t,reg,lv:0,w:L.staff,sal:Math.round(umr(reg,S.h)*(b.wage||1)/1000)*1000,book:cost,cap:cost,auto:true,ph:'idle',d:0,df:1};
  c.units.push(u);
  const d=km(c.reg,reg);
  logm(`${coName(c)} opened ${b.n} (${L.l}) in ${REG[reg].n} for ${rp(cost)}${isSpec(t,reg)?', a regional specialty':b.kind==='retail'&&retailMult(t,reg)>1.05?', a strong local market':''}. ${d?`${NF.format(d)} km from the office: monitoring ${rp(monCost(c,u))} a month.`:`Monitoring ${rp(monCost(c,u))} a month.`}`,'good');
  if(b.kind==='cycle') tryStart(c,u);
  return null;
}
function upgradeCost(u){ const b=BIZ[u.t]; if(u.lv>=b.lv.length-1) return null; return (b.lv[u.lv+1].setup-b.lv[u.lv].setup)*cpi(S.h)*landAdj(u.reg); }
function companyOwners(c){ return Object.entries(c.own).filter(([,v])=>v>0).map(([k,v])=>({k,pct:v/c.shares})); }
function distributable(c){
  if(c.form==='UD') return Math.max(0,c.cash);
  if(c.form==='CV') return Math.max(0,Math.min(c.cash,c.retained));
  return Math.max(0,Math.min(c.cash,c.retained-(c.reserve||0)));
}
function payDividend(c,amt){
  const max=distributable(c); if(!(amt>0)) return 'Enter an amount.';
  if(amt>max+1) return `At most ${rp(max)} can be distributed right now.`;
  c.cash-=amt; c.retained-=amt;
  if(c.form==='UD'){ S.P.cash+=amt; srcAdd(S.P,'div:'+c.id,amt); logm(`Prive: you withdrew ${rp(amt)} from ${coName(c)}.`); return null; }
  const parts=[];
  for(const {k,pct} of companyOwners(c)){
    const g=amt*pct; let rate=0;
    if(c.form!=='CV') rate = (k==='P'||k==='F'||k==='PUB')?divTaxIndiv(S.h):divTaxCorp(S.h,pct);
    const net=g*(1-rate);
    if(k==='P'){ S.P.cash+=net; srcAdd(S.P,'div:'+c.id,net); } else if(k!=='F'){ const r=acct(k); if(r){ r.cash+=net; book(r,'other',net); srcAdd(r,'div:'+c.id,net); } }
    parts.push(`${acctName(k)} ${rp(net)}${rate?` (after ${pc(rate,0)} tax)`:''}`);
  }
  if(c.tbk) tbkOnDividend(c,amt);
  logm(`${coName(c)} ${c.form==='CV'?'distributed profit':'paid a dividend'} of ${rp(amt)}: ${parts.join(', ')}.`,'good');
  return null;
}
function injectCapital(c,from,amt){
  const src=acct(from); if(!(amt>0)) return 'Enter an amount.'; if(!src||src.cash<amt) return `${acctName(from)} does not have ${rp(amt)} in its account.`;
  if(c.ipo) return `${coName(c)} is in registration for its IPO. The share register is frozen until it lists.`;
  const bvps=shareVal(c);
  src.cash-=amt; c.cash+=amt; c.paidIn+=amt;
  const ns=Math.round(amt/bvps); c.shares+=ns; c.own[from]=(c.own[from]||0)+ns;
  logm(`${acctName(from)} injected ${rp(amt)} into ${coName(c)} for ${NF.format(ns)} new shares. Your stake is now ${pc(ownPct(c,'P'),1)}.`);
  return null;
}
function dissolve(c){
  if(c.tbk) return `${coName(c)} is listed on the exchange and has public shareholders. A listed company cannot simply be dissolved.`;
  if(c.ipo) return `Withdraw the IPO of ${coName(c)} first.`;
  if(S.C.some(s=>s.own[c.id])) return 'Dissolve or sell its subsidiaries first.';
  for(const u of c.units) c.cash+=u.book*0.5; c.units=[];
  for(const d of c.deps) c.cash+=d.amt; c.deps=[];
  for(const s in c.hold) c.cash+=c.hold[s].sh*quote(s,S.h)*0.9975; c.hold={};
  for(const b of c.bonds||[]) c.cash+=b.face*bondPx(b)*0.998; c.bonds=[];
  for(const l of c.loans) c.cash-=l.bal; c.loans=[];
  c.cash-=c.taxDue||0; c.taxDue=0;
  const left=c.cash;
  if(left>0){
    for(const {k,pct} of companyOwners(c)){ const g=left*pct, gain=Math.max(0,g-c.paidIn*pct); const rate=(c.form==='PT'||c.form==='PTP')?((k==='P'||k==='F')?divTaxIndiv(S.h):divTaxCorp(S.h,pct)):0; const net=g-gain*rate; if(k==='P') S.P.cash+=net; else if(k!=='F'){ const r=acct(k); if(r) r.cash+=net; } }
  } else if(left<0){
    if(c.form==='UD'||c.form==='CV'){ S.P.cash+=left; logm(`As owner of a ${c.form} you cover its shortfall of ${rp(-left)} personally.`,'bad'); }
  }
  S.C.splice(S.C.indexOf(c),1);
  logm(`${coName(c)} dissolved. ${left>=0?`Liquidation surplus ${rp(left)} returned to shareholders.`:''}`);
  if(S.sel.co===c.id) S.sel.co=S.C[0]?.id||null;
  return null;
}
function loanLimit(a,prod){
  const d=debt(a);
  if(prod==='KTA') return Math.max(0,0.3*(liquid(S.P)+stakesP())-d);
  if(prod==='KMK') return Math.max(0,0.5*(Math.max(0,a.cash)+depSum(a)+holdMV(a)+unitBook(a))+3*avgRev3(a)-d);
  if(prod==='KUR'){ const t=kurTerms(S.h); if(!t) return 0; const kd=a.loans.filter(l=>l.prod==='KUR').reduce((s,l)=>s+l.bal,0); return Math.max(0,Math.min(t.kecilMax-kd, 0.6*unitBook(a)+6*avgRev3(a)+20e6)); }
  return 0;
}
function loanRate(prod,amt,a){ if(prod==='KTA') return ktaRate(S.h); const disc=a&&a.id!=='P'?0.015*fnScore(a,'fin')/100:0; if(prod==='KMK') return kmkRate(S.h)-disc; const t=kurTerms(S.h); return (amt<=t.mikroMax?t.mikroRate:t.kecilRate)-disc; }
function loanCheck(a,prod,amt){
  if(kol(a)>=3) return `Rejected: credit status is ${KOL[kol(a)]}. Clear arrears first.`;
  if(prod==='KUR'){
    if(!kurTerms(S.h)) return 'KUR does not exist yet. It launches on 5 November 2007.';
    if(S.h-a.founded<180*24) return 'KUR needs a business that has run for at least 6 months.';
    if(avgRev3(a)*12>2.5e9) return 'KUR is for micro and small businesses (turnover up to Rp 2,5 M a year).';
    if(!a.units.length) return 'KUR needs an operating business unit.';
  }
  if(prod==='KMK'){ if(!a.units.length) return 'Working-capital credit needs an operating business.'; if(S.h-a.founded<90*24) return 'Banks want at least 3 months of operating history for KMK.'; }
  const lim=loanLimit(a,prod); if(amt>lim) return `Above your limit of ${rp(lim)}.`;
  return null;
}
function takeLoan(aid,prod,amt,n){
  const a=acct(aid); if(!(amt>0)) return 'Enter an amount.';
  const err=loanCheck(a,prod,amt); if(err) return err;
  const r=loanRate(prod,amt,a), pay=annuity(amt,r,n);
  const nm={KTA:'KTA personal loan',KMK:'Kredit Modal Kerja',KUR:amt<=kurTerms(S.h)?.mikroMax?'KUR Mikro':'KUR Kecil'}[prod];
  const prov=amt*0.01; a.cash+=amt-prov; book(a,'intx',prov);
  a.loans.push({id:nid('L'),name:nm,prod,P:amt,bal:amt,r,n,left:n,pay,due:addMonths(S.h,1),miss:0});
  logm(`${acctName(aid)} took a ${nm} of ${rp(amt)} at ${pc(r)} for ${n} months. Instalment ${rp(pay)}/month (1% provision fee).`);
  return null;
}

