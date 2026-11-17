'use strict';
/* ============================================================
   THE EXCHANGE · going public, listed companies, public
   offerings of the day and the stock market screen
   ============================================================ */
const IPO_MIN_EQ=5e9, FLOAT_MIN=0.075, CONTROL_MIN=0.51;
const ipoFixFee=h=>Math.round(500e6*cpi(h)/1e6)*1e6;       // lawyers, auditors, appraiser, prospectus
const listFee=h=>Math.round(15e6*cpi(h)/1e5)*1e5;           // per month: listing fee, public accountant, disclosure
const regulator=h=>keyH(h)<20130101?'Bapepam-LK':'OJK';
const todayIdx=()=>tdLE(keyH(S.h));
const mcap=c=>quote(c.tbk.sym,S.h)*c.shares;
const pubPct=c=>(c.own.PUB||0)/c.shares;
function shareVal(c){ return c.tbk?c.tbk.px:Math.max(100,equity(c)/c.shares); }

function exchangeInit(){
  if(!S.xch){ S.xch={seen:{},subs:[]}; const k=keyH(S.h); for(const s of Object.keys(STK)){ const st=STK[s]; if(st.ipo&&!st.co&&st.ipo<=k) S.xch.seen[s]=1; } }
  S.sel.mtab=S.sel.mtab||'q'; S.sel.mf=S.sel.mf||{f:'all',sec:'',sort:'s',dir:1}; S.sel.ot=S.sel.ot||'mkt';
  syncTbk();
}
// Listed companies of the player live in the same tables as the historical stocks.
function syncTbk(){
  for(const s of Object.keys(STK)) if(STK[s].co) delete STK[s];
  if(S&&MK) for(const c of S.C) if(c.tbk) regTbk(c);
  SYMS=Object.keys(STK).sort();
}
function regTbk(c){
  const T=c.tbk, N=TD.length, arr=new Float64Array(N);
  for(let i=0;i<N;i++){ const j=i-T.i0; arr[i]=j<0?T.ipoPx:T.p[Math.min(j,T.p.length-1)]; }
  MK[T.sym]=arr;
  STK[T.sym]={s:T.sym,n:c.name,sec:c.units.length?SECTORS[mainSec(c)].n:'Holding company',b:T.beta,y:0,ipo:TD[T.i0],ipx:T.ipoPx,co:c.id};
}

/* ---------- What a company is worth to the market */
function divIn12(c){ let v=0; for(const e of c.hist.slice(-12)) for(const k in e.src||{}) if(k.startsWith('div:')) v+=e.src[k]; return v; }
// Earnings attributable to shareholders over the last 12 months, counting subsidiaries by stake and not their dividends twice.
function earnA(c,depth=0){
  const hs=c.hist.slice(-12); if(!hs.length) return 0;
  const f=hs.length>=12?1:hs.length>=6?12/hs.length:1;
  let e=(hs.reduce((s,x)=>s+x.net,0)-divIn12(c))*f;
  if(depth<6) for(const s of S.C) if(s!==c&&s.own[c.id]>0) e+=ownPct(s,c.id)*earnA(s,depth+1);
  return e;
}
function revGrowth(c){ const h=c.hist; if(h.length<24) return 0.1; const a=h.slice(-12).reduce((s,x)=>s+x.rev,0), b=h.slice(-24,-12).reduce((s,x)=>s+x.rev,0); return b>0?clamp(a/b-1,-0.3,0.6):0.1; }
// Market mood: the index against its own one-year average
function mood(i){ const a=Math.max(0,i-250); let s=0; for(let j=a;j<=i;j++) s+=MK.IHSG[j]; return clamp(MK.IHSG[i]/(s/(i-a+1)),0.7,1.4); }
function peFair(c,i){ return clamp(9*mood(i)*(0.8+0.4*gov(c)/100)*(1+0.8*revGrowth(c))*(1+0.03*(c.level||0)),4,30); }
// Earnings at the going multiple plus net cash on hand; never much below book value.
function fairCap(c,i){ const cashNet=Math.max(0,liquid(c)-debt(c)-(c.taxDue||0)); return Math.max(earnA(c)*peFair(c,i)+cashNet, 0.7*Math.max(0,equity(c))*Math.sqrt(mood(i)), c.shares*50); }
function tbkPre(aid,sym,side){ const c=acct(STK[sym].co), T=c.tbk; if(side==='sell'){ if(!(c.own[aid]>0)) return `${acctName(aid)} holds no ${sym}.`; if(S.h<T.lock) return `Founders' shares in ${coName(c)} are locked up until ${fdate(T.lock)}, eight months after the listing (${regulator(S.h)} rule).`; } return null; }

/* ---------- Going public */
function ipoReqs(c){
  const dirs=(c.board||[]).filter(b=>b.role==='dir').length, koms=(c.board||[]).filter(b=>b.role==='kom').length, eq=equity(c), e=earnA(c), fee=ipoFixFee(S.h);
  return [
    {ok:c.form==='PT',t:'A regular PT',d:c.form==='PT'?'Yes':FORMS[c.form].n},
    {ok:c.hist.length>=12,t:'Twelve months of financial statements',d:c.hist.length+' month'+(c.hist.length===1?'':'s')+' on record'},
    {ok:eq>=IPO_MIN_EQ,t:'Net assets of at least '+rp(IPO_MIN_EQ),d:rp(eq)},
    {ok:e>0,t:'Profit over the last 12 months, subsidiaries included',d:rp(e)},
    {ok:dirs>=2,t:'At least two directors',d:dirs+' on the board'},
    {ok:koms>=2,t:'At least two commissioners, one of them independent',d:koms+' on the board'},
    {ok:kol(c)===1,t:'Bank credit status Lancar',d:KOL[kol(c)]},
    {ok:c.cash>=fee,t:'Cash for lawyers, auditors and the prospectus',d:rp(fee)+' needed, '+rp(c.cash)+' in the account'},
  ];
}
function tickerIdea(c){ const w=c.name.toUpperCase().replace(/[^A-Z ]/g,'').split(/\s+/).filter(Boolean); let s=(w.length>=4?w.slice(0,4).map(x=>x[0]).join(''):w.length>=2?w[0].slice(0,2)+w[1].slice(0,2):(w[0]||'')).padEnd(4,'X').slice(0,4); const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; for(let n=0;STK[s]&&n<26;n++) s=s.slice(0,3)+A[n]; return s; }
function ipoPlan(c,o){
  const i=todayIdx(), E=earnA(c), fairV=fairCap(c,i), peF=E>0?fairV/E:0;
  const d=dOf(S.h), wob=1+0.12*(hash3(S.seed|0,d.getUTCFullYear()*12+d.getUTCMonth(),parseInt(c.id.slice(1))||1)-0.5);
  const f=clamp((+o.f||0)/100,0.1,0.49), V=Math.max(0,+o.v||0), pe=E>0?V/E:0, eq=Math.max(1,equity(c));
  const k=Math.max(1,Math.round(V/c.shares/500)), px=roundTick(V/(c.shares*k)), old=c.shares*k, ns=Math.max(500,Math.round(old*f/(1-f)/500)*500);
  const proceeds=ns*px, uw=proceeds*0.03, fix=ipoFixFee(S.h);
  return {E,eq,fairV,vLo:fairV*wob*0.85,vHi:fairV*wob*1.1,pe,pbv:V/eq,f,V,k,px,old,ns,proceeds,uw,fix,net:proceeds-uw,post:(old+ns)*px,listH:S.h+90*24};
}
function ipoCheck(c,o){
  if(c.tbk) return `${coName(c)} is already listed.`;
  if(c.ipo) return `${coName(c)} is already in registration with ${regulator(S.h)}.`;
  const bad=ipoReqs(c).find(r=>!r.ok); if(bad) return `${coName(c)} is not ready to go public. ${bad.t}: ${bad.d}.`;
  if(c.rupsPend) return `Hold the pending ${meetName(c)} first.`;
  if(!o) return null;
  const sym=String(o.sym||'').toUpperCase();
  if(!/^[A-Z]{4}$/.test(sym)) return 'A ticker code is four letters, like BBCA or TLKM.';
  if(STK[sym]||sym==='IHSG'||S.C.some(x=>x!==c&&x.ipo&&x.ipo.sym===sym)) return `The code ${sym} is already taken on the exchange. Pick another.`;
  const P=ipoPlan(c,o);
  if(!(P.V>0)) return 'Enter the valuation you are asking for.';
  if(P.px<50) return `The offer price works out at Rp ${NF.format(P.px)} a share. The exchange does not list shares below Rp 50; ask for a higher valuation.`;
  return null;
}
function ipoFile(c,o){
  const e=ipoCheck(c,o); if(e) return e;
  const P=ipoPlan(c,o), sym=String(o.sym).toUpperCase();
  c.cash-=P.fix; c.retained-=P.fix; // issue costs go against equity, not this year's profit
  c.ipo={sym,v:P.V,f:P.f,k:P.k,px:P.px,fix:P.fix,fileH:S.h,listH:P.listH};
  logm(`${coName(c)} filed its registration statement with ${regulator(S.h)} to list as ${sym}: ${pc(P.f,0)} of the company offered to the public at Rp ${NF.format(P.px)} a share${P.k>1?` after a 1:${P.k} stock split`:''}, valuing it at ${rp(P.V)} before the new money. Target listing ${fdate(P.listH)}. Fees paid so far ${rp(P.fix)}.`,'news');
  S.dirty=true; return null;
}
function ipoCancel(c){ const I=c.ipo; if(!I) return; c.ipo=null; logm(`${coName(c)} withdrew its IPO. The ${rp(I.fix)} already spent on lawyers and auditors is lost.`,'bad'); S.dirty=true; }
function ipoList(c,i){
  const I=c.ipo, E=earnA(c), preV=I.px*c.shares*I.k, fairV=fairCap(c,i);
  const demand=Math.exp(-3.5*(preV/Math.max(1,fairV)-1))*Math.exp(0.3*rg());
  if(E<=0||demand<0.4||kol(c)>2){
    c.ipo=null; S.dirty=true;
    logm(`The IPO of ${coName(c)} is called off. ${E<=0?'The company slipped into a loss during registration and the underwriters walked away.':kol(c)>2?'Its bank loans fell into arrears during registration.':`At Rp ${NF.format(I.px)} a share investors asked for only ${pc(demand,0)} of the offer; the price was too rich for this market.`} The ${rp(I.fix)} in fees is lost.`,'bad');
    toast('IPO called off',`${coName(c)} could not fill its book.`); return;
  }
  const k=I.k, nom=c.paidIn/(c.shares*k);
  for(const h in c.own) c.own[h]*=k; c.shares*=k;
  const ns=Math.max(500,Math.round(c.shares*I.f/(1-I.f)/500)*500), proceeds=ns*I.px, uw=proceeds*(demand<1?0.045:0.03);
  const cb={}; for(const h in c.own) cb[h]=c.own[h]*nom;
  c.own.PUB=ns; c.shares+=ns; c.cash+=proceeds-uw; c.paidIn+=proceeds-uw;
  const pop=demand>=1?Math.min(0.35,0.02+0.16*Math.log(demand)):-0.02-0.2*(1-demand), px=roundTick(I.px*(1+pop));
  const old=coName(c);
  c.tbk={sym:I.sym,i0:i,p:[px],px,ipoPx:I.px,ipoH:S.h,lock:addMonths(S.h,8),beta:Math.round((0.8+0.6*rnd())*100)/100,shock:0,cb,raised:proceeds-uw,demand,lf:c.ytd.loss+c.ytd.fine};
  c.ipo=null; syncTbk(); updateLevel(c,true);
  logm(`${old} is now ${coName(c)}, listed on the ${exName(S.h)} as ${I.sym}. ${NF.format(ns)} new shares sold at Rp ${NF.format(I.px)}: the book was ${demand>=1?`covered ${dec(demand)} times`:`only ${pc(demand,0)} covered, so the underwriters took up the rest for a higher fee`}. ${rp(proceeds-uw)} reaches the company account after ${rp(uw)} in underwriting fees. The public holds ${pc(pubPct(c),1)}. First-day close Rp ${NF.format(px)} (${sgn(pop,x=>pc(x,1))}). Shares held before the offer are locked up until ${fdate(c.tbk.lock)}.`,'good');
  toast('Listed: '+I.sym,`${coName(c)} raised ${rp(proceeds-uw)} and closed its first day at Rp ${NF.format(px)}.`);
  S.sel.sym=I.sym; S.paused=true; syncSpeed(); S.dirty=true;
}

/* ---------- Life as a listed company */
function tbkDay(c,i){
  const T=c.tbk, fair=fairCap(c,i)/c.shares, mret=Math.log(MK.IHSG[i]/MK.IHSG[Math.max(0,i-1)]);
  const lf=c.ytd.loss+c.ytd.fine; if(T.lf!=null&&lf>T.lf+1) T.shock=(T.shock||0)-Math.min(0.12,0.01+3*(lf-T.lf)/Math.max(1,T.px*c.shares)); T.lf=lf;
  const lp0=Math.log(T.px), lp=clamp(lp0+T.beta*mret+0.025*(Math.log(fair)-lp0)+0.016*rg()+(T.shock||0),lp0-0.2,lp0+0.2);
  T.shock=0; T.px=roundTick(Math.exp(lp));
  const j=i-T.i0; while(T.p.length<j) T.p.push(T.p[T.p.length-1]); T.p[j]=T.px; MK[T.sym][i]=T.px;
}
function tbkImpact(c,q){ return clamp(0.5*q/Math.max(1,c.own.PUB||0),0,0.25); }
function tbkNudge(c,f){ const T=c.tbk, i=todayIdx(), arr=MK[T.sym], px=roundTick(Math.max(1,arr[i]*(1+f))); arr[i]=px; T.px=px; const j=i-T.i0; if(j>=0&&j<T.p.length) T.p[j]=px; }
function tbkOnDividend(c,amt){ c.tbk.shock=(c.tbk.shock||0)-0.6*amt/Math.max(1,mcap(c)); }
function tbkAfterRups(c,amt,net){
  if(!(net>0)) return; const pay=amt/net, T=c.tbk;
  if(pay<0.2){ T.shock=(T.shock||0)-0.04; logm(`Public shareholders of ${coName(c)} wanted more than a ${pc(pay,0)} payout. ${T.sym} is marked down.`,'bad'); }
  else if(pay>=0.4) T.shock=(T.shock||0)+0.02;
}
function tbkTaxCut(c,y,tax){
  if(!c.tbk||tax<=0) return tax; const r=citRate(y); if(!r||pubPct(c)<0.4) return tax;
  const cut=y>=2020?0.03:0.05, t=Math.round(tax*(r-cut)/r);
  logm(`${coName(c)} has ${pc(pubPct(c),0)} of its shares in public hands, so its ${y} income tax rate is ${cut*100} points lower (listed-company facility). Saving ${rp(tax-t)}.`,'good');
  return t;
}
function exchangeMonth(){ for(const c of S.C) if(c.tbk){ const f=listFee(S.h); c.cash-=f; book(c,'opex',f); } }
function topHolder(c){ const t=Object.entries(c.own).filter(([k,v])=>v>0&&k!=='F'&&k!=='PUB').sort((a,b)=>b[1]-a[1])[0]; if(t) c.parent=t[0]; }
// Buying and selling shares of your own listed company moves the share register, not a portfolio line.
function tbkTrade(a,sym,side,lots,quiet){
  const c=acct(STK[sym].co), T=c.tbk, ls=lotSize(S.h), q0=lots*ls, px=quote(sym,S.h);
  if(side==='buy'){
    if(a.id!=='P'&&a.form!=='PT') return `Only you personally or a regular PT can hold shares in ${coName(c)}.`;
    if(a===c) return `${coName(c)} cannot buy its own shares with a market order. Use a share buyback from its listing panel.`;
    if(a.id!=='P'&&isAncestor(c,a)) return `${coName(c)} owns ${coName(a)}, so ${coName(a)} cannot hold shares in its own parent.`;
    const room=Math.floor(((c.own.PUB||0)-FLOAT_MIN*c.shares)/ls);
    if(lots>room) return `Only ${NF.format(Math.max(0,room))} lot can still be bought. The exchange requires at least ${pc(FLOAT_MIN,1)} of ${sym} to stay in public hands.`;
    const imp=tbkImpact(c,q0), pe=px*(1+imp/2), cost=q0*pe*1.0015;
    if(a.cash<cost) return `Not enough in the account: need ${rp(cost)}, ${acctName(a.id)} has ${rp(a.cash)}.`;
    a.cash-=cost; c.own[a.id]=(c.own[a.id]||0)+q0; c.own.PUB-=q0; T.cb[a.id]=(T.cb[a.id]||0)+cost; tbkNudge(c,imp*0.6);
    if(!quiet) logm(`${acctName(a.id)} bought ${lots} lot (${NF.format(q0)} shares) of ${sym} from the public at an average of ${NF.format(Math.round(pe))}. Total ${rp(cost)} incl. fees. The public now holds ${pc(pubPct(c),1)}.`);
  } else {
    const held=c.own[a.id]||0; if(!held) return `${acctName(a.id)} holds no ${sym}.`;
    if(S.h<T.lock) return `Founders' shares in ${coName(c)} are locked up until ${fdate(T.lock)}, eight months after the listing (${regulator(S.h)} rule).`;
    const q=Math.min(q0,held), ctrl=1-((c.own.PUB||0)+q)/c.shares;
    if(ctrl<CONTROL_MIN) return `That sale would leave your group with ${pc(ctrl,1)} of ${coName(c)}. Keep at least ${pc(CONTROL_MIN,0)} to stay in control.`;
    const imp=tbkImpact(c,q), pe=px*(1-imp/2), g=q*pe, proceeds=g*(1-0.0015-0.001), basis=(T.cb[a.id]||0)*q/held, gain=proceeds-basis;
    a.cash+=proceeds; c.own[a.id]-=q; if(c.own[a.id]<=0) delete c.own[a.id]; c.own.PUB=(c.own.PUB||0)+q; T.cb[a.id]=(T.cb[a.id]||0)-basis;
    book(a,'other',gain); srcAdd(a,'gain',gain); if(a.id==='P') S.P.realized=(S.P.realized||0)+gain;
    tbkNudge(c,-imp*0.6); topHolder(c);
    if(!quiet) logm(`${acctName(a.id)} sold ${NF.format(q)} shares of ${sym} to the public at an average of ${NF.format(Math.round(pe))}. Proceeds ${rp(proceeds)} after 0,1% final tax; ${gain>=0?'gain':'loss'} ${rp(Math.abs(gain))}. The public now holds ${pc(pubPct(c),1)}.`,gain>=0?'good':'bad');
  }
  S.dirty=true; return null;
}
function buybackInfo(c,lots){
  const T=c.tbk, q=Math.max(0,Math.floor(lots||0))*lotSize(S.h), px=quote(T.sym,S.h), imp=tbkImpact(c,q), y=yearOf(S.h), used=T.bb&&T.bb.y===y?T.bb.sh:0;
  return {q,px,imp,cost:q*px*(1+imp/2)*1.0015,used,cap:Math.max(0,Math.floor(0.1*c.shares)-used),room:Math.max(0,Math.floor(((c.own.PUB||0)-FLOAT_MIN*c.shares)/(1-FLOAT_MIN))),y};
}
function tbkBuyback(c,lots){
  const I=buybackInfo(c,lots), T=c.tbk; if(!(I.q>0)) return 'Enter a number of lots.';
  if(I.q>I.cap) return `A company may buy back at most 10% of its shares a year. ${NF.format(I.cap)} shares are left for ${I.y}.`;
  if(I.q>I.room) return `At least ${pc(FLOAT_MIN,1)} of ${T.sym} must stay in public hands. No more than ${NF.format(I.room)} shares can be bought back.`;
  const max=Math.min(c.cash,distributable(c));
  if(I.cost>max) return `A buyback is paid from retained earnings. It needs ${rp(I.cost)}; ${coName(c)} can spend ${rp(Math.max(0,max))}.`;
  c.cash-=I.cost; c.retained-=I.cost; c.own.PUB-=I.q; c.shares-=I.q; T.bb={y:I.y,sh:I.used+I.q};
  tbkNudge(c,I.imp*0.6+0.5*I.q/c.shares);
  logm(`${coName(c)} bought back and cancelled ${NF.format(I.q)} of its own shares for ${rp(I.cost)}. Every remaining share now owns a little more of the company; your group holds ${pc(1-pubPct(c),1)}.`,'good');
  S.dirty=true; return null;
}
function issueInfo(c,pct){
  const T=c.tbk, ns=Math.round(c.shares*clamp(+pct||0,0,10)/100/500)*500, px=roundTick(quote(T.sym,S.h)*0.92), proceeds=ns*px, fee=proceeds*0.02;
  return {ns,px,proceeds,fee,net:proceeds-fee,ctrl:1-((c.own.PUB||0)+ns)/(c.shares+ns)};
}
function tbkIssue(c,pct){
  const T=c.tbk, I=issueInfo(c,pct); if(!(I.ns>0)) return 'Enter how much new stock to place, up to 10% of the shares.';
  if(S.h<T.ipoH+180*24) return `${coName(c)} listed on ${fdate(T.ipoH)}. Investors expect at least six months before it comes back for more money.`;
  if(T.plH&&S.h<T.plH+8766) return `Without pre-emptive rights a company may place at most 10% new shares a year. The last placement was on ${fdate(T.plH)}.`;
  if(I.ctrl<CONTROL_MIN) return `The placement would dilute your group to ${pc(I.ctrl,1)}. Keep at least ${pc(CONTROL_MIN,0)} to stay in control.`;
  c.own.PUB=(c.own.PUB||0)+I.ns; c.shares+=I.ns; c.cash+=I.net; c.paidIn+=I.net; T.plH=S.h;
  tbkNudge(c,-(0.03+0.4*I.ns/c.shares)); updateLevel(c,true);
  logm(`${coName(c)} placed ${NF.format(I.ns)} new shares with institutions at Rp ${NF.format(I.px)}, an 8% discount to the market. ${rp(I.net)} raised after fees; the public now holds ${pc(pubPct(c),1)}.`,'good');
  S.dirty=true; return null;
}

/* ---------- Public offerings of the day (historical listings) */
const offerOpen=(st,h)=>!!st.ipx&&!st.co&&h>=hK(st.ipo)-21*24&&keyH(h)<st.ipo;
function offerBuzz(st){
  let hot=MK[st.s][ipoIdx(st)]/st.ipx; const n=hash3(S.seed|0,st.ipo,7); if(n<0.2) hot=1+(hot-1)*-0.5; // brokers are sometimes wrong
  return hot>=1.3?'Brokers say the book is covered many times over. Expect only a small allotment.':hot>=1.08?'Brokers report healthy demand.':hot>=0.98?'Demand is lukewarm.':'Brokers are struggling to place it.';
}
function subscribe(aid,sym,lots){
  const a=acct(aid), st=STK[sym]; if(!a||!st) return 'Choose an account.';
  if(!offerOpen(st,S.h)) return `The offering of ${sym} is not open.`;
  if(!(lots>0)) return 'Enter a number of lots.';
  const amt=lots*lotSize(S.h)*st.ipx;
  if(a.cash<amt) return `The order must be paid in full: ${rp(amt)} needed, ${acctName(aid)} has ${rp(a.cash)}.`;
  a.cash-=amt; const x=S.xch.subs.find(s=>s.a===aid&&s.s===sym); if(x){ x.lots+=lots; x.amt+=amt; } else S.xch.subs.push({a:aid,s:sym,lots,amt});
  logm(`${acctName(aid)} subscribed for ${lots} lot of ${sym} (${st.n}) in its initial public offering at Rp ${NF.format(st.ipx)}: ${rp(amt)} is blocked until the allotment on ${fkey(st.ipo)}.`);
  S.dirty=true; return null;
}
function cancelSub(aid,sym){ const i=S.xch.subs.findIndex(s=>s.a===aid&&s.s===sym); if(i<0) return; const x=S.xch.subs[i], a=acct(x.a)||S.P; a.cash+=x.amt; S.xch.subs.splice(i,1); logm(`${acctName(a.id)} cancelled its order for ${sym}; ${rp(x.amt)} is released.`); S.dirty=true; }
function listHistorical(st){
  const fc=MK[st.s][ipoIdx(st)], hot=st.ipx?fc/st.ipx:1, allot=hot>1.02?clamp(1/(1+(hot-1)*20),0.05,1):1, ls=lotSize(S.h);
  logm(`${st.s} (${st.n}) starts trading on the ${exName(S.h)} today${st.ipx?`, offered at Rp ${NF.format(st.ipx)} a share`:''}.`,'news');
  for(const x of S.xch.subs.filter(s=>s.s===st.s)){
    const a=acct(x.a)||S.P, got=Math.min(x.lots,Math.max(1,Math.round(x.lots*allot))), sh=got*ls, cost=sh*st.ipx;
    a.cash+=x.amt-cost; const hd=a.hold[st.s]||(a.hold[st.s]={sh:0,cost:0}); hd.sh+=sh; hd.cost+=cost;
    logm(`${st.s} allotment for ${acctName(a.id)}: ${got} of ${x.lots} lot${allot<1?`, the offer was about ${dec(1/allot)} times oversubscribed`:''}. ${rp(cost)} paid, ${rp(x.amt-cost)} released.`,'good');
    toast(st.s+' allotment',`${acctName(a.id)} received ${got} of ${x.lots} lot.`);
  }
  S.xch.subs=S.xch.subs.filter(s=>s.s!==st.s); S.dirty=true;
}
function exchangeDay(k){
  const i=tdLE(k), trading=TD[i]===k;
  for(const s of SYMS){ const st=STK[s]; if(st.co||!st.ipo||S.xch.seen[s]||k<st.ipo) continue; S.xch.seen[s]=1; listHistorical(st); }
  if(!trading) return;
  for(const c of [...S.C]){ if(c.ipo&&S.h>=c.ipo.listH) ipoList(c,i); else if(c.tbk&&i>c.tbk.i0) tbkDay(c,i); }
}

/* ============================================================
   STOCK MARKET SCREEN
   ============================================================ */
const isHeld=s=>STK[s]?.co?true:[S.P,...S.C].some(a=>a.hold[s]);
function hiLo(s,n){ const last=lastFullIdx(S.h), a=Math.max(0,last-n,STK[s]?.ipo?ipoIdx(STK[s]):0); let hi=-Infinity,lo=Infinity; for(let i=a;i<=last;i++){ const v=MK[s][i]; if(v>hi) hi=v; if(v<lo) lo=v; } const q=quote(s,S.h); return {hi:Math.max(hi,q),lo:Math.min(lo,q)}; }
function ytdOf(s){ const yi=Math.max(tdLE((yearOf(S.h)-1)*10000+1231),STK[s]?.ipo?ipoIdx(STK[s]):0); return quote(s,S.h)/MK[s][yi]-1; }
function breadth(){ let up=0,dn=0,best=null,worst=null; for(const s of SYMS){ if(!listed(s,S.h)) continue; const ch=quote(s,S.h)/prevClose(s,S.h)-1; if(ch>0.0005) up++; else if(ch<-0.0005) dn++; if(!best||ch>best[1]) best=[s,ch]; if(!worst||ch<worst[1]) worst=[s,ch]; } return {up,dn,best,worst}; }

function vMarket(){
  if(!acct(S.sel.acct)) S.sel.acct='P';
  if(S.sel.sym!=='IHSG'&&!STK[S.sel.sym]) S.sel.sym='IHSG';
  const tab=S.sel.mtab||'q', nOff=SYMS.filter(s=>offerOpen(STK[s],S.h)).length, nPipe=S.C.filter(c=>c.ipo).length;
  return `
  <section class="panel mk-head"><div class="panel-b">
    <div class="tiles">
      <div class="tile wide"><span class="eyebrow">${L(()=>exName(S.h))}</span>${L(()=>quote('IHSG',S.h).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}),'div','big')}
        <div class="note">IHSG ${L(()=>{const q=quote('IHSG',S.h),p=prevClose('IHSG',S.h);return [sgn(q/p-1,x=>pc(x)),cls(q-p)];},'b')} today · ${L(()=>{const v=ytdOf('IHSG');return [sgn(v,x=>pc(x,1))+' this year',cls(v)];})}</div></div>
      <div class="tile"><span class="eyebrow">Session</span>${L(()=>[isOpen(S.h)?'Open':'Closed',isOpen(S.h)?'up':'muted'],'b')}<span class="note">${L(()=>isOpen(S.h)?'until 16:00 WIB':'orders queue for 09:00 WIB')} · lot ${L(()=>NF.format(lotSize(S.h)))}</span></div>
      <div class="tile"><span class="eyebrow">Advancers · decliners</span>${LH(()=>{const b=breadth();return `<span class="up">▲ ${b.up}</span> <span class="down">▼ ${b.dn}</span>`;},'b')}<span class="note">${L(()=>{const b=breadth();return b.best?`best ${b.best[0]} ${sgn(b.best[1],x=>pc(x,1))} · worst ${b.worst[0]} ${sgn(b.worst[1],x=>pc(x,1))}`:'';})}</span></div>
      <div class="tile"><span class="eyebrow">Market mood</span>${L(()=>{const m=mood(todayIdx());return [m>1.12?'Euphoric':m>1.03?'Bullish':m>0.97?'Steady':m>0.88?'Nervous':'Fearful',m>1.03?'up':m<0.97?'down':''];},'b')}<span class="note">sets what investors pay for new listings</span></div>
    </div>
    <div class="acct-tabs" role="tablist" aria-label="Market sections">${[['q','Quotes & trading'],['ipo','IPO desk'+(nOff||nPipe?` · ${nOff+nPipe}`:'')],['own','Your listed companies'+(S.C.some(c=>c.tbk)?` · ${S.C.filter(c=>c.tbk).length}`:'')]].map(([k,l])=>`<button role="tab" data-act="mtab" data-v="${k}" aria-pressed="${tab===k}">${l}</button>`).join('')}</div>
  </div></section>
  ${tab==='ipo'?vIpoDesk():tab==='own'?vListed():vQuotes()}`;
}
function vQuotes(){
  const sym=S.sel.sym, st=STK[sym]||{n:'Jakarta Composite Index',sec:'Index'}, F=S.sel.mf, co=st.co?acct(st.co):null, on=listed(sym,S.h);
  const secs=[...new Set(SYMS.map(s=>STK[s].sec))].sort();
  return `<div class="split split2">
  <section class="panel"><div class="panel-h"><h3>Quotes</h3>
      <div class="acct-tabs">${[['all','All'],['idx30','IDX30'],['held','Held'],['mine','Yours']].map(([k,l])=>`<button data-act="mfilter" data-v="${k}" aria-pressed="${F.f===k}">${l}</button>`).join('')}</div></div>
    <div class="panel-b">
      <label class="f" style="max-width:260px">Sector<select data-chg="msec" id="mk-sec"><option value="">All sectors</option>${secs.map(x=>`<option ${F.sec===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      ${LH(()=>tickerTable(),'div','tbl-scroll')}
      <p class="note">Prices are approximate, split-adjusted reconstructions anchored on year-end closes and major turning points; daily moves in between are simulated. Fees: buy 0,15%, sell 0,15% + 0,1% final tax on the sale value.</p></div></section>
  <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
  <section class="panel"><div class="panel-h"><div><h3>${sym} · ${esc(co?coName(co):st.n)}</h3><div class="note">${esc(st.sec)}${IDX30.has(sym)?' · IDX30':''}${co?' · your company':''}${st.y?` · dividend yield about ${pc(st.y,1)}, paid mid-June`:''}${st.ipo?` · listed ${fkey(st.ipo)}`:''}</div></div>
      <div class="acct-tabs">${['1M','6M','1Y','5Y','ALL'].map(r=>`<button data-act="range" data-v="${r}" aria-pressed="${S.sel.range===r}">${r}</button>`).join('')}</div></div>
    <div class="panel-b">${on?`<div class="big" style="font-size:2rem">${L(()=>sym==='IHSG'?quote(sym,S.h).toLocaleString('id-ID',{minimumFractionDigits:2}):NF.format(quote(sym,S.h)))} ${L(()=>{const q=quote(sym,S.h),p=prevClose(sym,S.h);return [sgn(q/p-1,x=>pc(x)),cls(q-p)];},'span','chg')}</div>
    <canvas class="chart" data-chart="sym" aria-label="Price chart"></canvas>
    ${LH(()=>symStats(sym),'div','tiles sm')}`:`<p class="note">Not listed yet. ${esc(st.n)} goes public on ${fkey(st.ipo)}${st.ipx?` at about Rp ${NF.format(st.ipx)} a share; its offering opens three weeks before on the IPO desk`:''}.</p>`}</div></section>
  ${sym==='IHSG'||!on?'':`<section class="panel"><div class="panel-h"><h3>Trade ${sym}</h3>${acctPicker('tradeacct')}</div><div class="panel-b">
    <div class="fields"><label class="f">Lots<input type="number" id="lots" min="1" step="1" value="1"></label>
      <label class="f">Order<select id="otype" data-chg="otype"><option value="mkt" ${S.sel.ot==='mkt'?'selected':''}>At market</option><option value="lim" ${S.sel.ot==='lim'?'selected':''}>Limit, good for 30 days</option></select></label>
      ${S.sel.ot==='lim'?`<label class="f">Limit price<input type="number" id="olim" min="1" step="${tick(quote(sym,S.h))}" value="${quote(sym,S.h)}"></label>`:''}</div>
    <p class="note">${L(()=>{ const a=acct(S.sel.acct); const n=+document.getElementById('lots')?.value||0, lim=+document.getElementById('olim')?.value||0; const px=S.sel.ot==='lim'&&lim?lim:quote(sym,S.h), v=n*lotSize(S.h)*px; const sh=co?(co.own[a?.id]||0):(a?.hold[sym]?.sh||0); return `≈ ${rp(v*1.0015)} incl. fee · ${acctName(S.sel.acct)} account ${rp(a?.cash||0)}`+(sh?` · holds ${NF.format(sh)} shares`:'')+(S.sel.ot==='lim'?' · a buy fills at the limit or lower, a sell at the limit or higher':''); })}</p>
    ${co?`<p class="note">${esc(sym)} is your own company. Orders trade against the ${L(()=>pc(pubPct(co),1))} public float and move the price; large orders move it more. ${L(()=>S.h<co.tbk.lock?'Founders\' shares are locked up until '+fdate(co.tbk.lock)+'.':'The lock-up has ended.')}</p>`:''}
    <div class="btns"><button class="btn pri" data-act="buy">Buy</button><button class="btn" data-act="sell">Sell</button></div>
  </div></section>`}
  <section class="panel"><div class="panel-h"><h3>Portfolios & orders</h3></div><div class="panel-b">${LH(()=>portfolio())}</div></section>
  </div></div>`;
}
function symStats(sym){
  const t=(k,v,c='')=>`<div class="tile"><span class="eyebrow">${k}</span><b class="${c}">${v}</b></div>`, st=STK[sym], x=hiLo(sym,250), y=ytdOf(sym);
  let out=t('This year',sgn(y,v=>pc(v,1)),cls(y))+t('52-week range',`${NF.format(Math.round(x.lo))} – ${NF.format(Math.round(x.hi))}`);
  const c=st&&st.co?acct(st.co):null;
  if(c){ const m=mcap(c), e=earnA(c), eq=equity(c), r=quote(sym,S.h)/c.tbk.ipoPx-1;
    out+=t('Market value',rp(m))+t('P/E · P/BV',(e>0?dec(m/e)+'×':'loss')+' · '+(eq>0?dec(m/eq)+'×':'—'))+t('Public float',pc(pubPct(c),1))+t('Since IPO at '+NF.format(c.tbk.ipoPx),sgn(r,v=>pc(v,1)),cls(r)); }
  else if(st){ out+=t('Dividend yield',st.y?pc(st.y,1):'none')+t('Beta to IHSG',dec(st.b))+(st.ipx&&st.ipo>20041231?t('Since IPO at '+NF.format(st.ipx),sgn(quote(sym,S.h)/st.ipx-1,v=>pc(v,1)),cls(quote(sym,S.h)-st.ipx)):''); }
  return out;
}
function tickerTable(){
  const F=S.sel.mf, h=S.h, rows=[];
  for(const s of SYMS){ const st=STK[s];
    if(F.sec&&st.sec!==F.sec) continue;
    if(F.f==='idx30'&&!IDX30.has(s)) continue; if(F.f==='held'&&!isHeld(s)) continue; if(F.f==='mine'&&!st.co) continue;
    if(!listed(s,h)){ rows.push({s,st,off:true,q:-1,d:-9,y:-9}); continue; }
    const q=quote(s,h); rows.push({s,st,q,d:q/prevClose(s,h)-1,y:ytdOf(s)}); }
  const k=F.sort, dir=F.dir; rows.sort((a,b)=>a.off!==b.off?(a.off?1:-1):k==='s'?dir*a.s.localeCompare(b.s):dir*(b[k]-a[k]));
  const th=(key,l,n)=>`<th class="${n?'n ':''}sort" data-act="msort" data-v="${key}" aria-sort="${F.sort===key?(F.dir>0?'descending':'ascending'):'none'}">${l}${F.sort===key?(F.dir>0?(key==='s'?' ▲':' ▼'):(key==='s'?' ▼':' ▲')):''}</th>`;
  const iq=quote('IHSG',h), ip=prevClose('IHSG',h), iy=ytdOf('IHSG');
  const body=(!F.sec&&F.f==='all'?`<tr class="click ${S.sel.sym==='IHSG'?'sel':''}" data-act="sym" data-v="IHSG"><td><b>IHSG</b><div class="muted sub">Composite index</div></td><td class="n">${iq.toLocaleString('id-ID',{minimumFractionDigits:2})}</td><td class="n ${cls(iq-ip)}">${sgn(iq/ip-1,x=>pc(x))}</td><td class="n ${cls(iy)}">${sgn(iy,x=>pc(x,1))}</td></tr>`:'')
   +rows.map(r=>{ const {s,st}=r, tag=(st.co?' <span class="chip good">yours</span>':'')+(IDX30.has(s)?' <span class="chip">IDX30</span>':''), nm=st.co?coName(acct(st.co)):st.n;
    if(r.off) return `<tr class="click muted ${S.sel.sym===s?'sel':''}" data-act="sym" data-v="${s}"><td><b>${s}</b><div class="sub">${esc(nm)} · ${esc(st.sec)}</div></td><td colspan="3" class="n sub">${offerOpen(st,h)?'<span class="chip acc">offering open</span> ':''}IPO ${fkey(st.ipo)}</td></tr>`;
    return `<tr class="click ${S.sel.sym===s?'sel':''}" data-act="sym" data-v="${s}"><td><b>${s}</b>${tag}<div class="muted sub">${esc(nm)} · ${esc(st.sec)}</div></td><td class="n">${NF.format(r.q)}</td><td class="n ${cls(r.d)}">${sgn(r.d,x=>pc(x))}</td><td class="n ${cls(r.y)}">${sgn(r.y,x=>pc(x,1))}</td></tr>`; }).join('');
  return `<table><thead><tr>${th('s','Code')}${th('q','Last',1)}${th('d','Day',1)}${th('y','YTD',1)}</tr></thead><tbody>${body||'<tr><td colspan="4" class="muted">Nothing matches this filter.</td></tr>'}</tbody></table>`;
}
function portfolio(){
  let html='';
  if(S.orders.length) html+=`<div class="callout"><b>Open orders</b><br>${S.orders.map(o=>`${esc(acctName(o.a))}: ${o.side} ${o.lots} lot ${o.s}${o.lim?` at ${NF.format(o.lim)} or better, until ${fdate(o.exp)}`:' at the next open'} <button class="btn sm ghost" data-act="cancelorder" data-v="${o.id}">Cancel</button>`).join('<br>')}</div>`;
  if(S.xch.subs.length) html+=`<div class="callout"><b>IPO subscriptions</b><br>${S.xch.subs.map(x=>`${esc(acctName(x.a))}: ${x.lots} lot ${x.s}, ${rp(x.amt)} blocked until ${fkey(STK[x.s].ipo)} <button class="btn sm ghost" data-act="cancelsub" data-id="${x.a}" data-v="${x.s}">Cancel</button>`).join('<br>')}</div>`;
  const lines=[];
  for(const a of [S.P,...S.C]) for(const s in a.hold){ const hd=a.hold[s], v=hd.sh*quote(s,S.h); lines.push([a.id,s,hd.sh,v,v-hd.cost]); }
  for(const c of S.C) if(c.tbk) for(const k in c.own){ if(k==='PUB'||k==='F'||!(c.own[k]>0)) continue; const v=c.own[k]*quote(c.tbk.sym,S.h); lines.push([k,c.tbk.sym,c.own[k],v,v-(c.tbk.cb[k]||0),1]); }
  if(!lines.length) return html+'<p class="note">No shares held yet.</p>';
  return html+`<div class="tbl-wrap"><table><thead><tr><th>Account</th><th>Code</th><th class="n">Shares</th><th class="n">Value</th><th class="n">P/L</th></tr></thead><tbody>${lines.map(([a,s,sh,v,pl,own])=>`<tr class="click" data-act="sym" data-v="${s}"><td>${esc(acctName(a))}</td><td><b>${s}</b>${own?' <span class="chip good">yours</span>':''}</td><td class="n">${NF.format(sh)}</td><td class="n">${rp(v)}</td><td class="n ${cls(pl)}">${sgn(pl,x=>rp(x))}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- IPO desk */
function vIpoDesk(){
  const h=S.h, k=keyH(h), open=SYMS.filter(s=>offerOpen(STK[s],h)), pts=S.C.filter(c=>c.form==='PT'&&!c.tbk);
  const soon=SYMS.map(s=>STK[s]).filter(st=>st.ipo&&!st.co&&st.ipo>k&&hK(st.ipo)<h+8766).sort((a,b)=>a.ipo-b.ipo);
  const recent=SYMS.map(s=>STK[s]).filter(st=>st.ipo&&st.ipx&&st.ipo<=k&&hK(st.ipo)>h-2*8766).sort((a,b)=>b.ipo-a.ipo);
  return `<div class="grid2">
  <section class="panel"><div class="panel-h"><div><h3>Take a company public</h3><div class="note">Sell new shares to the public and list on the exchange</div></div></div>
    <div class="panel-b">
      ${pts.length?pts.map(c=>{ if(c.ipo){ const I=c.ipo; return `<div class="unit"><div><h4>${esc(coName(c))} <span class="chip acc">${I.sym} · in registration</span></h4><div class="meta">Offer ${pc(I.f,0)} at Rp ${NF.format(I.px)} · filed ${fdate(I.fileH)} · lists about ${fdate(I.listH)}</div><div class="meta">${L(()=>{const P=I.px*c.shares*I.k, f=fairCap(c,todayIdx()), r=P/Math.max(1,f); return [r<0.9?'The market would pay more today: expect a strong first day.':r<1.1?'The price still looks about right for today\'s market.':r<1.3?'The market has cooled since filing. The book may not fill.':'At this price the offer is likely to fail in today\'s market.',r<1.1?'up':'down'];})}</div></div><div class="ctl"><button class="btn sm bad" data-act="ipocancel" data-id="${c.id}">Withdraw the IPO</button></div></div>`; }
        const R=ipoReqs(c), n=R.filter(r=>r.ok).length, miss=R.find(r=>!r.ok);
        return `<div class="unit"><div><h4>${esc(coName(c))} ${n===R.length?'<span class="chip good">ready</span>':`<span class="chip">${n} of ${R.length} requirements</span>`}</h4><div class="meta">Equity ${rp(equity(c))} · earnings last 12 months ${rp(earnA(c))}</div>${miss?`<div class="meta">Next: ${esc(miss.t.toLowerCase())} (${esc(miss.d)})</div>`:''}</div><div class="ctl"><button class="btn sm ${n===R.length?'pri':''}" data-act="ipoprep" data-id="${c.id}">${n===R.length?'Prepare the IPO':'See the requirements'}</button></div></div>`; }).join('')
      :'<p class="note">You have no regular PT that could list. Found a PT, or convert a UD or CV into one, and grow it to Rp 5 M of net assets.</p>'}
      <p class="note">An IPO takes about three months from filing with ${regulator(h)} to the first trading day. You choose the ticker, how much of the company to sell and at what valuation; the market mood on listing day decides whether the book fills. After listing, your stake is worth its market price, the company pays ${rp(listFee(h))} a month in listing and disclosure costs, and founders' shares are locked up for eight months.</p>
    </div></section>
  <section class="panel"><div class="panel-h"><div><h3>Public offerings open now</h3><div class="note">Order shares before they list</div></div>${acctPicker('tradeacct')}</div>
    <div class="panel-b">
      ${open.length?open.map(s=>{ const st=STK[s], lot=lotSize(h)*st.ipx; return `<div class="unit"><div><h4>${s} · ${esc(st.n)}</h4><div class="meta">${esc(st.sec)} · offer price Rp ${NF.format(st.ipx)} · one lot ${rp(lot)} · lists ${fkey(st.ipo)}</div><div class="meta">${esc(offerBuzz(st))}</div></div>
        <div class="ctl"><label class="f">Lots<input type="number" id="sub-${s}" min="1" step="1" value="10" style="width:110px"></label><button class="btn sm pri" data-act="subscribe" data-v="${s}">Subscribe as ${esc(acctName(S.sel.acct))}</button></div></div>`; }).join('')
      :`<p class="note">No offering is open today. ${soon.length?`The next one, ${soon[0].s}, opens on ${fdate(hK(soon[0].ipo)-21*24)}.`:'No listing is expected within a year.'}</p>`}
      <p class="note">An offering opens three weeks before the listing. Orders are paid in full and the money is blocked. Hot offerings are oversubscribed and you receive only part of your order; the rest is released on listing day. Weak offerings are allotted in full, which is rarely good news.</p>
      ${S.xch.subs.length?`<div class="callout">${S.xch.subs.map(x=>`${esc(acctName(x.a))}: ${x.lots} lot ${x.s}, ${rp(x.amt)} blocked <button class="btn sm ghost" data-act="cancelsub" data-id="${x.a}" data-v="${x.s}">Cancel</button>`).join('<br>')}</div>`:''}
    </div></section>
  <section class="panel"><div class="panel-h"><h3>Listing calendar</h3><span class="eyebrow">next 12 months</span></div>
    <div class="panel-b">${soon.length?`<div class="tbl-wrap"><table><thead><tr><th>Code</th><th>Listing</th><th class="n">Offer price</th></tr></thead><tbody>${soon.map(st=>`<tr class="click" data-act="showsym" data-v="${st.s}"><td><b>${st.s}</b><div class="muted sub">${esc(st.n)} · ${esc(st.sec)}</div></td><td>${fkey(st.ipo)}</td><td class="n">${st.ipx?NF.format(st.ipx):'—'}</td></tr>`).join('')}${S.C.filter(c=>c.ipo).map(c=>`<tr><td><b>${c.ipo.sym}</b> <span class="chip good">yours</span><div class="muted sub">${esc(coName(c))}</div></td><td>${fdate(c.ipo.listH)}</td><td class="n">${NF.format(c.ipo.px)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">The pipeline is empty for now.</p>'}</div></section>
  <section class="panel"><div class="panel-h"><h3>Recent listings</h3><span class="eyebrow">last two years</span></div>
    <div class="panel-b">${recent.length?LH(()=>`<table><thead><tr><th>Code</th><th>Listed</th><th class="n">Offer</th><th class="n">Last</th><th class="n">Since IPO</th></tr></thead><tbody>${recent.map(st=>{ const q=quote(st.s,S.h), r=q/st.ipx-1; return `<tr class="click" data-act="showsym" data-v="${st.s}"><td><b>${st.s}</b>${st.co?' <span class="chip good">yours</span>':''}</td><td>${fkey(st.ipo)}</td><td class="n">${NF.format(st.ipx)}</td><td class="n">${NF.format(q)}</td><td class="n ${cls(r)}">${sgn(r,x=>pc(x,1))}</td></tr>`; }).join('')}</tbody></table>`,'div','tbl-wrap'):'<p class="note">No company has listed in the last two years.</p>'}</div></section>
  </div>`;
}
function vListed(){
  const ts=S.C.filter(c=>c.tbk);
  if(!ts.length) return `<section class="panel"><div class="panel-h"><h3>Your listed companies</h3></div><div class="panel-b"><p class="note">None of your companies is listed yet. Once a PT has twelve months of accounts, Rp 5 M of net assets, a profit and a full board, the <b>IPO desk</b> can take it public. Listing brings in new money and puts a market price on your stake, at the cost of sharing profit and control with public investors.</p><div><button class="btn pri" data-act="mtab" data-v="ipo">Open the IPO desk</button></div></div></section>`;
  return ts.map(c=>listedCard(c,true)).join('');
}
function listedCard(c,full){
  const T=c.tbk, t=(k,v)=>`<div class="tile"><span class="eyebrow">${k}</span>${v}</div>`;
  return `<section class="panel"><div class="panel-h"><div><h3>${T.sym} · ${esc(coName(c))}</h3><div class="note">Listed ${fdate(T.ipoH)} at Rp ${NF.format(T.ipoPx)} · raised ${rp(T.raised)} · ${L(()=>S.h<T.lock?'founders locked up until '+fdate(T.lock):'lock-up ended')}</div></div>
      <div class="btns"><button class="btn sm" data-act="showsym" data-v="${T.sym}">Chart & trade</button><button class="btn sm" data-act="buyback" data-id="${c.id}">Buy back shares</button><button class="btn sm" data-act="issue" data-id="${c.id}">Place new shares</button>${full?`<button class="btn sm ghost" data-act="openco" data-id="${c.id}">Company page</button>`:''}</div></div>
    <div class="panel-b"><div class="tiles sm">
      ${t('Share price',L(()=>{const q=quote(T.sym,S.h),p=prevClose(T.sym,S.h);return ['Rp '+NF.format(q)+'  '+sgn(q/p-1,x=>pc(x,1)),cls(q-p)];},'b'))}
      ${t('Market value',L(()=>rp(mcap(c)),'b'))}
      ${t('Book equity',L(()=>rp(equity(c)),'b'))}
      ${t('Earnings, 12 months',L(()=>{const e=earnA(c);return [rp(e),cls(e)];},'b'))}
      ${t('P/E · P/BV',L(()=>{const e=earnA(c),q=equity(c);return (e>0?dec(mcap(c)/e)+'×':'loss')+' · '+(q>0?dec(mcap(c)/q)+'×':'—');},'b'))}
      ${t('Since IPO',L(()=>{const r=quote(T.sym,S.h)/T.ipoPx-1;return [sgn(r,x=>pc(x,1)),cls(r)];},'b'))}
    </div>
    ${LH(()=>`<table><thead><tr><th>Shareholder</th><th class="n">Shares</th><th class="n">Stake</th><th class="n">Market value</th></tr></thead><tbody>${Object.entries(c.own).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(acctName(k))}</td><td class="n">${NF.format(v)}</td><td class="n">${pc(v/c.shares,1)}</td><td class="n">${rp(v*quote(T.sym,S.h))}</td></tr>`).join('')}</tbody></table>`,'div','tbl-wrap')}
    <p class="note">The market prices ${T.sym} on its earnings of the last twelve months, its growth, the mood of the index and how well it is governed: stronger commissioners and a corporate secretary earn a higher multiple. Fraud, fines and a stingy dividend push the price down. With 40% or more in public hands the company pays a lower income tax rate.</p>
    </div></section>`;
}
// Company page, Money & payouts tab
function listingPanel(c){
  if(c.tbk) return listedCard(c,false);
  if(c.form!=='PT') return '';
  if(c.ipo){ const I=c.ipo; return `<section class="panel"><div class="panel-h"><div><h3>Stock exchange</h3><div class="note">IPO in registration with ${regulator(S.h)}</div></div><button class="btn sm bad" data-act="ipocancel" data-id="${c.id}">Withdraw the IPO</button></div><div class="panel-b"><div class="rows">
    <div class="row"><span class="k">Ticker</span><span class="v">${I.sym}</span></div><div class="row"><span class="k">Offer</span><span class="v">${pc(I.f,0)} of the company at Rp ${NF.format(I.px)}${I.k>1?` after a 1:${I.k} split`:''}</span></div>
    <div class="row"><span class="k">Expected listing</span><span class="v">${fdate(I.listH)}</span></div></div><p class="note">The share register is frozen until the listing. If the company slips into a loss, or the market turns and the price looks too rich, the underwriters will call the offer off.</p></div></section>`; }
  const R=ipoReqs(c), n=R.filter(r=>r.ok).length;
  return `<section class="panel"><div class="panel-h"><div><h3>Stock exchange</h3><div class="note">${esc(coName(c))} is privately held</div></div><button class="btn sm ${n===R.length?'pri':''}" data-act="ipoprep" data-id="${c.id}">${n===R.length?'Prepare an IPO':'IPO requirements'}</button></div>
    <div class="panel-b">${LH(()=>reqList(ipoReqs(c)),'ul','chk')}</div></section>`;
}
const reqList=R=>R.map(r=>`<li class="${r.ok?'ok':'no'}"><span>${r.ok?'✓':'✗'}</span><div>${esc(r.t)}<small>${esc(r.d)}</small></div></li>`).join('');

/* ---------- Modals */
function ipoModal(cid){
  const c=acct(cid); if(!c) return;
  if(c.tbk||c.ipo) return err(ipoCheck(c));
  const st={sym:tickerIdea(c),f:20,v:null};
  const draw=el=>{
    const body=el.querySelector('#ip-body'), R=ipoReqs(c), ready=R.every(r=>r.ok);
    if(!ready){ body.innerHTML=`<p class="note">A company must meet the exchange's listing requirements before ${regulator(S.h)} will take its registration.</p><ul class="chk">${reqList(R)}</ul><p class="note">Hire directors and commissioners on the company's Organisation tab. Net assets grow with retained profit and injected capital.</p><div class="btns"><button class="btn" data-act="close">Close</button></div>`; return; }
    if(st.v==null){ const P0=ipoPlan(c,{v:1,f:st.f}); st.v=Math.round((P0.vLo+P0.vHi)/2/1e8)*1e8; }
    const P=ipoPlan(c,st), chk=ipoCheck(c,st), grp=1-P.f, mine=ownPct(c,'P')*grp, rich=P.V/((P.vLo+P.vHi)/2);
    body.innerHTML=`<p class="note">${esc(coName(c))} sells new shares to the public and lists on the ${esc(exName(S.h))}. The money goes to the company, not to you; what you gain is a market price on the shares you keep.</p>
      <div class="fields">
        <label class="f">Ticker code<input type="text" id="ip-sym" maxlength="4" value="${esc(st.sym)}" style="text-transform:uppercase"></label>
        <label class="f">Share of the company offered (%)<input type="number" id="ip-f" min="10" max="49" step="1" value="${st.f}"></label>
        <label class="f">Valuation you ask for, before the new money (Rp)<input type="number" id="ip-v" min="0" step="100000000" value="${st.v}"></label>
      </div>
      <p class="note ${rich>1.15?'down':''}">The underwriter thinks investors would value the company between <b>${rp(P.vLo)}</b> and <b>${rp(P.vHi)}</b> today. ${rich>1.15?'Your price is above that range: the book may not fill, and a failed offer loses the fees.':rich<0.88?'Your price is below that range: expect a jump on the first day, but the company raises less than it could.':'Your price sits inside the range.'} The market can move in the three months before listing.</p>
      <div class="rows">
        <div class="row"><span class="k">Earnings, last 12 months</span><span class="v">${rp(P.E)}</span></div>
        <div class="row"><span class="k">Book equity</span><span class="v">${rp(P.eq)}</span></div>
        <div class="row"><span class="k">Your valuation</span><span class="v">${rp(P.V)} · ${dec(P.pe)}× earnings · ${dec(P.pbv)}× book</span></div>
        <div class="row"><span class="k">Offer price</span><span class="v">Rp ${NF.format(P.px)} a share${P.k>1?` · after a 1:${NF.format(P.k)} stock split`:''}</span></div>
        <div class="row"><span class="k">New shares sold to the public</span><span class="v">${NF.format(P.ns)}</span></div>
        <div class="row"><span class="k">Money raised</span><span class="v">${rp(P.proceeds)}</span></div>
        <div class="row"><span class="k">Underwriting fee, 3%</span><span class="v">−${rp(P.uw)}</span></div>
        <div class="row"><span class="k">Lawyers, auditors and prospectus, paid today</span><span class="v">−${rp(P.fix)}</span></div>
        <div class="row total"><span class="k">Into the company account on listing day</span><span class="v up">${rp(P.net)}</span></div>
        <div class="row"><span class="k">Existing shareholders keep</span><span class="v">${pc(grp,1)}${c.own.P?` · you personally ${pc(mine,1)}`:''}</span></div>
        <div class="row"><span class="k">Your personal stake at the offer price</span><span class="v">${rp(mine*P.post)} <span class="muted">· book value today ${rp(ownPct(c,'P')*equity(c))}</span></span></div>
        <div class="row"><span class="k">First trading day</span><span class="v">about ${fdate(P.listH)}</span></div>
      </div>
      <p class="note ${chk?'down':''}">${chk?esc(chk):`Ready to file with ${regulator(S.h)}. After listing: ${rp(listFee(S.h))} a month in listing costs, an eight-month lock-up on your shares, and public shareholders who expect a dividend.`}</p>
      <div class="btns"><button class="btn pri" id="ip-go">File the IPO</button><button class="btn" data-act="close">Cancel</button></div>`;
    const keep=()=>{ st.sym=body.querySelector('#ip-sym').value.toUpperCase().trim(); st.f=clamp(+body.querySelector('#ip-f').value||0,10,49); st.v=Math.max(0,+body.querySelector('#ip-v').value||0); };
    body.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>{ keep(); draw(el); }));
    body.querySelector('#ip-go').onclick=()=>{ keep(); if(err(ipoFile(c,st))) return; closeModal(); render(); };
  };
  openModal(`Initial public offering · ${coName(c)}`,'<div id="ip-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function buybackModal(cid){
  const c=acct(cid); if(!c||!c.tbk) return; const st={lots:100};
  const draw=el=>{ const body=el.querySelector('#bb-body'), I=buybackInfo(c,st.lots), max=Math.min(c.cash,distributable(c));
    body.innerHTML=`<p class="note">${esc(coName(c))} buys its own shares from the public and cancels them. Fewer shares share the same profit, so earnings per share and your percentage both rise. It is paid from retained earnings.</p>
      <label class="f">Lots to buy back<input type="number" id="bb-lots" min="1" step="1" value="${st.lots}"></label>
      <div class="rows">
        <div class="row"><span class="k">Shares</span><span class="v">${NF.format(I.q)} · ${pc(I.q/c.shares,2)} of the company</span></div>
        <div class="row"><span class="k">Market price · expected average</span><span class="v">${NF.format(I.px)} · ${NF.format(Math.round(I.px*(1+I.imp/2)))}</span></div>
        <div class="row"><span class="k">Cost incl. fees</span><span class="v ${I.cost>max?'down':''}">${rp(I.cost)}</span></div>
        <div class="row"><span class="k">Available from retained earnings and cash</span><span class="v">${rp(Math.max(0,max))}</span></div>
        <div class="row"><span class="k">Still allowed this year (10% rule)</span><span class="v">${NF.format(I.cap)} shares</span></div>
        <div class="row"><span class="k">Your group's stake</span><span class="v">${pc(1-pubPct(c),1)} → ${pc(1-((c.own.PUB||0)-I.q)/Math.max(1,c.shares-I.q),1)}</span></div>
      </div>
      <div class="btns"><button class="btn pri" id="bb-go">Buy back</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#bb-lots').addEventListener('change',e=>{ st.lots=Math.max(0,Math.floor(+e.target.value||0)); draw(el); });
    body.querySelector('#bb-go').onclick=()=>{ st.lots=Math.max(0,Math.floor(+body.querySelector('#bb-lots').value||0)); if(err(tbkBuyback(c,st.lots))) return; closeModal(); render(); };
  };
  openModal(`Share buyback · ${c.tbk.sym}`,'<div id="bb-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}
function issueModal(cid){
  const c=acct(cid); if(!c||!c.tbk) return; const st={pct:5};
  const draw=el=>{ const body=el.querySelector('#is-body'), I=issueInfo(c,st.pct);
    body.innerHTML=`<p class="note">${esc(coName(c))} raises fresh capital by placing new shares with institutional investors, at a discount to the market price. It is quick money for expansion, but it dilutes every existing shareholder and the price usually dips.</p>
      <label class="f">New shares, as % of the shares outstanding (max 10 a year)<input type="number" id="is-pct" min="1" max="10" step="1" value="${st.pct}"></label>
      <div class="rows">
        <div class="row"><span class="k">New shares</span><span class="v">${NF.format(I.ns)}</span></div>
        <div class="row"><span class="k">Placement price (8% below market)</span><span class="v">Rp ${NF.format(I.px)}</span></div>
        <div class="row"><span class="k">Fees, 2%</span><span class="v">−${rp(I.fee)}</span></div>
        <div class="row total"><span class="k">Into the company account</span><span class="v up">${rp(I.net)}</span></div>
        <div class="row"><span class="k">Your group's stake</span><span class="v ${I.ctrl<CONTROL_MIN?'down':''}">${pc(1-pubPct(c),1)} → ${pc(I.ctrl,1)}</span></div>
      </div>
      <div class="btns"><button class="btn pri" id="is-go">Place the shares</button><button class="btn" data-act="close">Cancel</button></div>`;
    body.querySelector('#is-pct').addEventListener('change',e=>{ st.pct=clamp(+e.target.value||0,0,10); draw(el); });
    body.querySelector('#is-go').onclick=()=>{ st.pct=clamp(+body.querySelector('#is-pct').value||0,0,10); if(err(tbkIssue(c,st.pct))) return; closeModal(); render(); };
  };
  openModal(`Private placement · ${c.tbk.sym}`,'<div id="is-body" style="display:flex;flex-direction:column;gap:12px"></div>',draw);
}

/* ---------- Events */
function orderFromForm(side){
  const lots=Math.floor(+document.getElementById('lots').value), lim=S.sel.ot==='lim'?+document.getElementById('olim')?.value:null;
  if(err(placeOrder(S.sel.acct,S.sel.sym,side,lots,lim))) return; render();
}
function setTheme(t){ if(t) document.documentElement.dataset.theme=t; else delete document.documentElement.dataset.theme; }
try{ setTheme(localStorage.getItem('juragan.theme')||''); }catch(e){}
Object.assign(ACT,{
  mtab:d=>{ S.sel.mtab=d.v; render(); },
  mfilter:d=>{ S.sel.mf.f=d.v; render(); },
  msort:d=>{ const F=S.sel.mf; if(F.sort===d.v) F.dir=-F.dir; else { F.sort=d.v; F.dir=1; } liveTick(); },
  showsym:d=>{ S.sel.sym=d.v; S.sel.mtab='q'; S.tab='market'; render(); window.scrollTo({top:0}); },
  subscribe:d=>{ if(err(subscribe(S.sel.acct,d.v,Math.floor(+document.getElementById('sub-'+d.v).value)))) return; render(); },
  cancelsub:d=>{ cancelSub(d.id,d.v); render(); },
  ipoprep:d=>ipoModal(d.id),
  ipocancel:d=>{ const c=acct(d.id); if(!c||!c.ipo) return; askConfirm(`Withdraw the IPO of ${esc(coName(c))}? The ${rp(c.ipo.fix)} already paid to lawyers and auditors is not refunded.`,'Withdraw',()=>{ ipoCancel(c); render(); }); },
  buyback:d=>buybackModal(d.id),
  issue:d=>issueModal(d.id),
  theme:()=>{ const dark=(document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))==='dark', t=dark?'light':'dark'; setTheme(t); try{ localStorage.setItem('juragan.theme',t); }catch(e){} drawCharts(); },
});
Object.assign(CHG,{
  msec:(d,el)=>{ S.sel.mf.sec=el.value; liveTick(); },
  otype:(d,el)=>{ S.sel.ot=el.value; render(); },
});
