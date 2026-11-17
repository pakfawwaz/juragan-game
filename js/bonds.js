'use strict';
/* ============================================================
   GOVERNMENT BONDS (Surat Berharga Negara)
   ============================================================ */
// 10-year SUN benchmark yield (%), year-ends plus key turning points (approximate).
const Y10_A=[[20041231,10.3],[20050630,11.2],[20051031,15.8],[20051231,13.6],[20060630,12.4],[20061231,10.0],[20070630,9.4],[20071231,10.0],[20080630,13.1],[20081024,20.0],[20081231,12.0],[20090630,11.0],[20091231,10.1],[20101031,7.5],[20101231,7.6],[20110930,8.0],[20111231,6.0],[20121231,5.2],[20130520,5.5],[20130827,8.7],[20131231,8.4],[20141231,7.8],[20150930,9.6],[20151231,8.7],[20160930,6.9],[20161231,7.9],[20171231,6.3],[20181031,8.8],[20181231,8.0],[20191231,7.1],[20200323,8.4],[20201231,5.9],[20211231,6.4],[20221031,7.6],[20221231,6.9],[20231031,7.1],[20231231,6.5],[20240620,7.2],[20240916,6.4],[20241231,7.0]];
// Retail ORI series: settlement date, name, fixed coupon % (3-year tenor, monthly coupon). Approximate.
const ORI_HIST=[[20060809,'ORI001',12.05],[20070316,'ORI002',9.28],[20070725,'ORI003',9.40],[20080313,'ORI004',9.50],[20080827,'ORI005',11.45],[20090225,'ORI006',12.95],[20100804,'ORI007',7.50],[20111006,'ORI008',7.30],[20121010,'ORI009',6.25],[20131015,'ORI010',8.50],[20141015,'ORI011',8.50],[20151021,'ORI012',9.00],[20161019,'ORI013',6.60],[20171025,'ORI014',5.85],[20181024,'ORI015',8.25],[20191023,'ORI016',6.80],[20200722,'ORI017',6.40],[20201028,'ORI018',5.57],[20210303,'ORI019',5.57],[20211027,'ORI020',4.95],[20220309,'ORI021',4.90],[20221026,'ORI022',5.95],[20230315,'ORI023',5.90],[20231025,'ORI024',6.10],[20240313,'ORI025',6.25],[20241023,'ORI026',6.30]];
const CURVE=[[0.25,-2.0],[1,-1.6],[3,-1.0],[5,-0.6],[10,0],[15,0.3],[20,0.45],[30,0.6]];
function yieldPath(rng){
  const N=TD.length, Y=new Float64Array(N), anc=Y10_A.map(([k,v])=>[tdLE(k),v]);
  for(let a=0;a<anc.length-1;a++){ const [i0,v0]=anc[a],[i1,v1]=anc[a+1], n=i1-i0; if(n<=0) continue;
    const w=[0]; for(let k=1;k<=n;k++) w.push(w[k-1]+gauss(rng)*0.045);
    for(let k=0;k<=n;k++) Y[i0+k]=v0+w[k]+(k/n)*((v1-v0)-w[n]); }
  for(let i=0;i<N;i++) Y[i]=Math.round(Math.max(3,Y[i])*1000)/1000;
  return Y;
}
const y10At=h=>MK.Y10[tdLE(keyH(h))];
function curveSp(T){ if(T<=CURVE[0][0]) return CURVE[0][1]; for(let i=1;i<CURVE.length;i++){ const [a,va]=CURVE[i-1],[b,vb]=CURVE[i]; if(T<=b) return va+(vb-va)*(T-a)/(b-a); } return CURVE[CURVE.length-1][1]; }
const yieldAt=(T,h)=>y10At(h??S.h)+curveSp(T);
function bondTax(h){ const k=keyH(h); return k<20090209?0.20:k<20210830?0.15:0.10; }
const YRH=24*365.25;
// Dirty price per 1 of face value at the market yield for the remaining life.
function bondPx(b,h){
  h=h??S.h; if(h>=b.mat) return 1;
  const rem=(b.mat-h)/YRH, y=(yieldAt(rem,h)+(b.kind==='ORI'?0.25:0))/100, f=b.freq, c=b.cpn/100/f;
  let nc=b.nc||nextCpn(b,h), pv=0;
  while(nc<=b.mat){ const t=(nc-h)/YRH; pv+=(c+(nc>=b.mat-24?1:0))/Math.pow(1+y/f,t*f); if(nc>=b.mat-24) break; nc=addMonths(nc,12/f); }
  return pv;
}
function nextCpn(b,h){ let nc=b.iss; while(nc<=h) nc=addMonths(nc,12/b.freq); return Math.min(nc,b.mat); }
const bondMV=a=>(a.bonds||[]).reduce((s,b)=>s+b.face*bondPx(b),0);
function oriSeries(row){ const [k,name,cpn]=row, iss=hK(k); return {kind:'ORI',name,cpn,iss,mat:addMonths(iss,36),freq:12}; }
function bondOffers(a){
  const h=S.h, k=keyH(h), out=[];
  for(const row of ORI_HIST){ const s=oriSeries(row), open=hK(row[0])-21*24;
    if(h>=open&&h<s.iss&&a.id==='P') out.push({...s,key:'p'+s.name,px:1,fee:0,min:k<20190101?5e6:1e6,label:`${s.name} · primary offer · ${String(s.cpn).replace('.',',')}% · 3 years · until ${fdate(s.iss)}`,note:'Retail ORI is sold only to individual Indonesians during its offering window, at par with no fees. Monthly coupons, tradable afterwards.'});
    else if(h>=s.iss&&h<s.mat-30*24) out.push({...s,key:'s'+s.name,px:bondPx(s,h),fee:0.002,min:1e6,label:`${s.name} · secondary · coupon ${String(s.cpn).replace('.',',')}% · due ${fdate(s.mat)}`,note:'Bought from the bank\'s bond desk at the market price, which includes accrued interest. 0,2% spread.'}); }
  for(const T of [5,10,20]){ const cpn=Math.round(yieldAt(T,h)*8)/8; out.push({kind:'FR',name:`FR ${T}Y ${yearOf(h)+T}`,cpn,iss:h,mat:addMonths(h,12*T),freq:2,key:'f'+T,px:1,fee:0.001,min:10e6,label:`SUN FR ${T}-year · new issue · ${pc(cpn/100,2)} · due ${yearOf(h)+T}`,note:'Fixed-rate government bond (Seri FR) bought at the auction through the bank, at par. Semi-annual coupons. Its price moves against market yields: long tenors move most.'}); }
  return out.sort((x,y)=>'pfs'.indexOf(x.key[0])-'pfs'.indexOf(y.key[0]));
}
function buyBond(a,key,face,quiet){
  const o=bondOffers(a).find(x=>x.key===key); if(!o) return 'That bond is no longer on offer. Pick another.';
  face=Math.floor((+face||0)/1e6)*1e6;
  if(face<o.min) return `The minimum for ${o.name} is ${rp(o.min)} face value, in multiples of Rp 1 juta.`;
  if(o.kind==='ORI'&&key[0]==='p'&&a.id!=='P') return 'Retail ORI is only sold to individuals. A company can buy SUN FR series, or ORI on the secondary market.';
  const cost=face*o.px*(1+o.fee); if(a.cash<cost) return `Not enough in ${acctName(a.id)}'s account: ${rp(cost)} needed, ${rp(a.cash)} available.`;
  a.cash-=cost; const b={id:nid('G'),kind:o.kind,name:o.name,face,cpn:o.cpn,iss:o.iss,mat:o.mat,freq:o.freq,cost}; b.nc=nextCpn(b,Math.max(S.h,o.iss-1)); (a.bonds||(a.bonds=[])).push(b);
  if(!quiet) logm(`${acctName(a.id)} bought ${rp(face)} of ${o.name} (coupon ${String(o.cpn).replace('.',',')}%, due ${fdate(o.mat)}) for ${rp(cost)}.`,'good'); return null;
}
function sellBond(a,id,quiet){
  const b=(a.bonds||[]).find(x=>x.id===id); if(!b) return 'That bond is gone.';
  const gross=b.face*bondPx(b)*(1-0.002), gain=gross-b.cost, tax=gain>0?gain*bondTax(S.h):0, net=gross-tax;
  a.cash+=net; a.bonds.splice(a.bonds.indexOf(b),1);
  if(Math.abs(gain-tax)>0.5){ book(a,'other',gain-tax); srcAdd(a,'bondgain',gain-tax); }
  if(!quiet) logm(`${acctName(a.id)} sold ${rp(b.face)} of ${b.name} for ${rp(net)}: ${gain>=0?'gain':'loss'} of ${rp(Math.abs(gain-tax))}${tax?` after ${pc(bondTax(S.h),0)} final tax`:''}.`,gain>=0?'good':'bad'); return null;
}
function bondDay(){
  for(const a of [S.P,...S.C]) for(const b of [...(a.bonds||[])]){
    while(b.nc<=S.h&&b.nc<=b.mat){ const c=b.face*b.cpn/100/b.freq, net=c*(1-bondTax(S.h)); a.cash+=net; book(a,'other',net); srcAdd(a,'bond',net); if(b.nc>=b.mat-24) break; b.nc=addMonths(b.nc,12/b.freq); }
    if(S.h>=b.mat){ a.cash+=b.face; const g=b.face-b.cost; if(Math.abs(g)>0.5){ book(a,'other',g); srcAdd(a,'bondgain',g); } a.bonds.splice(a.bonds.indexOf(b),1); logm(`${acctName(a.id)}: ${b.name} matured; ${rp(b.face)} principal repaid.`,'good'); S.dirty=true; }
  }
}
function bondPanel(a){
  const offers=bondOffers(a), issued=ORI_HIST.filter(r=>hK(r[0])<=S.h);
  return `<section class="panel"><div class="panel-h"><div><h3>Government bonds (SBN)</h3><div class="note">Surat Berharga Negara: fixed-rate SUN (Seri FR) for anyone and retail ORI for individuals from August 2006. Coupons carry a final tax of ${L(()=>pc(bondTax(S.h),0))}${''} and arrive in the rekening.</div></div></div>
    <div class="panel-b"><div class="grid2">
      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <div class="rows">
          <div class="row"><span class="k">SUN 10-year yield</span>${L(()=>{ const y=y10At(S.h), p=MK.Y10[Math.max(0,tdLE(keyH(S.h))-21)]; return [pc(y/100,2)+'  '+(y>=p?'+':'')+((y-p)*100).toFixed(0)+' bp in a month',y>p?'down':'up']; },'span','v')}</div>
          <div class="row"><span class="k">Yield curve 1 / 3 / 5 / 20 years</span>${L(()=>[1,3,5,20].map(T=>pc(yieldAt(T)/100,2)).join(' · '),'span','v')}</div>
          <div class="row"><span class="k">Deposito 12 months, for comparison</span>${L(()=>pc(depRate(S.h,12),2),'span','v')}</div>
        </div>
        <canvas class="chart" data-chart="y10" aria-label="SUN 10-year yield history"></canvas>
        <p class="note">When yields rise, bond prices fall, and the reverse. Held to maturity, you get every coupon and the full face value back.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <label class="f">Bond<select id="bd-key">${offers.map(o=>`<option value="${o.key}">${esc(o.label)}</option>`).join('')}</select></label>
        <label class="f">Face value<input type="number" id="bd-amt" min="1000000" step="1000000" value="${a.id==='P'?10e6:100e6}"></label>
        <p class="note">${L(()=>{ const k=document.getElementById('bd-key')?.value, o=offers.find(x=>x.key===k)||offers[0]; if(!o) return 'Nothing on offer.'; const f=+document.getElementById('bd-amt')?.value||0, px=o.key[0]==='s'?bondPx(o):1; const y=o.key[0]==='s'?(yieldAt((o.mat-S.h)/YRH)+0.25):o.cpn; return `${o.note} Price ${(px*100).toFixed(2).replace('.',',')}% of face, yield about ${pc(y/100,2)}. Cost ≈ ${rp(f*px*(1+o.fee))}; minimum ${rp(o.min)}.`; })}</p>
        <div class="btns"><button class="btn pri" data-act="bondbuy">Buy</button></div>
      </div>
    </div>
    ${LH(()=>(a.bonds||[]).length?`<div class="tbl-wrap"><table><thead><tr><th>Series</th><th class="n">Face value</th><th class="n">Coupon</th><th>Next coupon · due</th><th class="n">Market value</th><th class="n">Gain</th><th></th></tr></thead><tbody>${a.bonds.map(b=>{ const v=b.face*bondPx(b), g=v-b.cost; return `<tr><td><b>${esc(b.name)}</b><div class="muted" style="font-size:.75rem">${b.kind==='ORI'?'Retail ORI · monthly':'SUN FR · semi-annual'}</div></td><td class="n">${rp(b.face)}</td><td class="n">${String(b.cpn).replace('.',',')}%</td><td>${fdate(b.nc)} · ${fdate(b.mat)}</td><td class="n">${rp(v)}</td><td class="n ${cls(g)}">${sgn(g,x=>rp(x))}</td><td><button class="btn sm" data-act="bondsell" data-v="${b.id}">Sell</button></td></tr>`; }).join('')}</tbody></table></div>`:'<p class="note">No bonds held in this account.</p>')}
    ${issued.length?`<details><summary class="note" style="cursor:pointer">Retail ORI issued so far (${issued.length})</summary><div class="tbl-wrap"><table><thead><tr><th>Series</th><th>Settlement</th><th class="n">Coupon</th><th>Matures</th></tr></thead><tbody>${issued.slice().reverse().map(r=>{ const s=oriSeries(r); return `<tr><td>${r[1]}</td><td>${fkey(r[0])}</td><td class="n">${String(r[2]).replace('.',',')}%</td><td>${fdate(s.mat)}</td></tr>`; }).join('')}</tbody></table></div></details>`:''}
    </div></section>`;
}

