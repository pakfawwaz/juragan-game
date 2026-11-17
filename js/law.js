'use strict';
/* ============================================================
   INDONESIAN LAW & POLICY, BY DATE
   ============================================================ */
const H_UU40=hK(20070816), H_CIPTA=hK(20201102), H_PTP=hK(20210202), H_KUR=hK(20071105), H_IDX=hK(20071203), H_LOT=hK(20140106), H_LPS=hK(20050922);
function lotSize(h){ return h<H_LOT?500:100; }
function exName(h){ return h<H_IDX?'Bursa Efek Jakarta (BEJ)':'Bursa Efek Indonesia (BEI / IDX)'; }
function lawPT(h){
  if(h<H_UU40) return {law:'UU No. 1/1995 tentang Perseroan Terbatas', minAuth:20e6, minPaid:5e6, founders:2, note:'Authorised capital ≥ Rp 20 juta, at least 25% paid up. Minimum two founders.'};
  if(h<H_CIPTA) return {law:'UU No. 40/2007 tentang Perseroan Terbatas', minAuth:50e6, minPaid:12.5e6, founders:2, note:'Authorised capital ≥ Rp 50 juta, at least 25% paid up. Minimum two founders. 20% statutory reserve before full dividend payout (Art. 70).'};
  return {law:'UU 40/2007 as amended by UU No. 11/2020 (Cipta Kerja)', minAuth:0, minPaid:0, founders:2, note:'Capital set by the founders. Minimum two founders for a regular PT; single-founder PT Perorangan for micro and small businesses'+(h<H_PTP?' once PP 8/2021 takes effect.':' (PP 8/2021).')};
}
const FORMS={
  UD:{n:'Usaha Dagang (sole proprietorship)', short:'UD', fee:0.5e6, legal:false},
  CV:{n:'Persekutuan Komanditer (CV)', short:'CV', fee:3e6, legal:false},
  PT:{n:'Perseroan Terbatas (PT)', short:'PT', fee:8e6, legal:true},
  PTP:{n:'PT Perorangan', short:'PT', fee:0, legal:true},
};
function formFee(form,h){ if(form==='PTP') return 50000; return Math.round(FORMS[form].fee*cpi(h)/1000)*1000; }
function citRate(y){ return y<=2008?null : y===2009?0.28 : y<2020?0.25 : 0.22; }
function cit(y,taxable,annualRev){
  if(taxable<=0) return 0;
  if(y<=2008){ let t=Math.min(taxable,50e6)*0.10; if(taxable>50e6) t+=Math.min(taxable-50e6,50e6)*0.15; if(taxable>100e6) t+=(taxable-100e6)*0.30; return t; }
  const r=citRate(y);
  if(annualRev<=4.8e9) return taxable*r*0.5;
  if(annualRev<=50e9){ const f=4.8e9/annualRev; return taxable*f*r*0.5+taxable*(1-f)*r; }
  return taxable*r;
}
function ptkp(y){ return y<=2005?12e6 : y<=2008?13.2e6 : y<=2012?15.84e6 : y<=2014?24.3e6 : y===2015?36e6 : 54e6; }
function pitBrackets(y){
  if(y<=2008) return [[25e6,.05],[50e6,.10],[100e6,.15],[200e6,.25],[Infinity,.35]];
  if(y<=2021) return [[50e6,.05],[250e6,.15],[500e6,.25],[Infinity,.30]];
  return [[60e6,.05],[250e6,.15],[500e6,.25],[5e9,.30],[Infinity,.35]];
}
function pit(y,pkp){ if(pkp<=0) return 0; let t=0,prev=0; for(const [cap,r] of pitBrackets(y)){ if(pkp>prev){ t+=(Math.min(pkp,cap)-prev)*r; } prev=cap; } return t; }
function pph21(h,monthly){ const y=yearOf(h); return pit(y,monthly*12-ptkp(y))/12; }
function divTaxIndiv(h){ return yearOf(h)<2009?0.15:0.10; }
function divTaxCorp(h,pct){ if(h>=H_CIPTA) return 0; return pct>=0.25?0:0.15; }
function bpjsRate(h){ const k=keyH(h); return k<20140101?0.0624 : k<20150701?0.0824 : 0.1024; }
function bpjsLabel(h){ const k=keyH(h); return k<20140101?'Jamsostek (JKK, JKM, JHT, JPK)':k<20150701?'BPJS Kesehatan 4% + Jamsostek/BPJS TK':'BPJS Kesehatan 4% + BPJS TK (JKK, JKM, JHT 3,7%, JP 2%)'; }
function lpsCap(h){ const k=keyH(h); return k<20050922?'Government blanket guarantee (pre-LPS)':k<20060322?'Full guarantee (LPS transition)':k<20060922?'Rp 5 miliar':k<20070322?'Rp 1 miliar':k<20081013?'Rp 100 juta':'Rp 2 miliar'; }
function umkmRegime(c,y,m){
  const ym=y*100+m+1, prev=c.prevTurnover, small=(prev==null||prev<=4.8e9);
  if(ym<201307||!small) return {k:'normal',label:'Normal (profit-based)'};
  if(ym<201807) return {k:'final',r:0.01,label:'PP 46/2013 · 1% final on turnover'};
  const startY=Math.max(2018,yearOf(c.founded)), lim=c.form==='UD'?7:c.form==='CV'?4:c.form==='PTP'?4:3;
  if(y-startY<lim) return {k:'final',r:0.005,label:`PP 23/2018 · 0,5% final (until end of ${startY+lim-1})`};
  return {k:'normal',label:'Normal (PP 23 period ended)'};
}
function kurTerms(h){
  if(h<H_KUR) return null; const y=yearOf(h);
  const r = y<2015?null : y===2015?0.12 : y<=2017?0.09 : y<=2019?0.07 : 0.06;
  return {mikroMax: y<2015?20e6 : y<2020?25e6 : y<2023?50e6 : 100e6, mikroRate: r??0.22, kecilMax:500e6, kecilRate: r??0.13};
}
const savRate = h => Math.max(0.005, biRate(h)*0.25);
const depRate = (h,m) => Math.max(0.01, biRate(h)-0.0075+({1:0,3:0.0025,6:0.004,12:0.005}[m]||0));
const kmkRate = h => biRate(h)+0.055;
const ktaRate = h => biRate(h)+0.13;

