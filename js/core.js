'use strict';
/* ============================================================
   JURAGAN · Indonesian business strategy sim
   1 real second = 1 game hour (at 1×). Data: approximate
   reconstructions of Indonesian macro & IDX history 2005–2024.
   ============================================================ */

// ---------- formatting
const NF = new Intl.NumberFormat('id-ID');
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const dec = v => v.toLocaleString('id-ID',{maximumFractionDigits: v>=100?0 : v>=10?1 : 2});
function rp(x, full){
  if(!isFinite(x)) return '—';
  const s = x < -0.5 ? '−' : ''; const a = Math.abs(x);
  if(!full){
    if(a>=1e12) return s+'Rp '+dec(a/1e12)+' T';
    if(a>=1e9) return s+'Rp '+dec(a/1e9)+' M';
    if(a>=1e6) return s+'Rp '+dec(a/1e6)+' jt';
  }
  return s+'Rp '+NF.format(Math.round(a));
}
const pc = (v,d=2)=> (v*100).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const sgn = (v,f)=> (v>=0?'+':'−')+f(Math.abs(v));
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- time (game clock is hours since 1 Jan 2004 00:00 WIB, stored in UTC fields)
const EPOCH = Date.UTC(2004,0,1), HR = 3600e3;
const dOf = h => new Date(EPOCH + h*HR);
const hOf = (y,m,d,hr=0) => Math.round((Date.UTC(y,m,d,hr)-EPOCH)/HR);
const kOf = dt => dt.getUTCFullYear()*10000 + (dt.getUTCMonth()+1)*100 + dt.getUTCDate();
const hK = k => hOf(Math.floor(k/10000), Math.floor(k/100)%100-1, k%100);
const keyH = h => kOf(dOf(h));
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function fdate(h){ const d=dOf(h); return d.getUTCDate()+' '+BLN[d.getUTCMonth()]+' '+d.getUTCFullYear(); }
function fkey(k){ return (k%100)+' '+BLN[Math.floor(k/100)%100-1]+' '+Math.floor(k/10000); }
function addMonths(h,n){ const d=dOf(h); return hOf(d.getUTCFullYear(), d.getUTCMonth()+n, Math.min(d.getUTCDate(),28), 0); }
function yfrac(h){ const d=dOf(h), y=d.getUTCFullYear(); const a=hOf(y,0,1), b=hOf(y+1,0,1); return y+(h-a)/(b-a); }
const yearOf = h => dOf(h).getUTCFullYear();

// ---------- RNG
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0;while(u===0)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function hash3(a,b,c){let h=(2166136261^a)>>>0;h=Math.imul(h^b,16777619);h=Math.imul(h^c,16777619);h^=h>>>13;h=Math.imul(h,0x5bd1e995);h^=h>>>15;return (h>>>0)/4294967296}
function hg(a,b,c){const u=Math.max(1e-9,hash3(a,b,c)),v=hash3(c+7,a+3,b+11);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const rnd = ()=>Math.random();
const rg = ()=>gauss(Math.random);

