'use strict';
// Trading calendar
const HOL=new Set([20081008,20081009,20081010]);
for(let y=2004;y<=2025;y++){ HOL.add(y*10000+101); HOL.add(y*10000+817); HOL.add(y*10000+1225);
  if(LEBK[y]){ const h=hK(LEBK[y]); HOL.add(LEBK[y]); HOL.add(keyH(h+24)); HOL.add(keyH(h-24)); } }
const TD=[]; (()=>{ for(let t=Date.UTC(2004,11,31); t<=Date.UTC(2024,11,31); t+=864e5){ const d=new Date(t), wd=d.getUTCDay(), k=kOf(d); if(wd&&wd!==6&&!HOL.has(k)) TD.push(k); } })();
function tdLE(k){ let lo=0,hi=TD.length-1; if(k<TD[0]) return 0; while(lo<hi){ const m=(lo+hi+1)>>1; if(TD[m]<=k) lo=m; else hi=m-1; } return lo; }
const END_KEY=20241231;

// Composite index (IHSG/JCI) anchors. Year-end closes plus key intra-year turning points.
const IHSG_A=[[20041231,1000.23],[20050830,994.8],[20051231,1162.64],[20060511,1553],[20060613,1310],[20061231,1805.52],[20070724,2405],[20070816,1909],[20071231,2745.83],[20080109,2830],[20080630,2350],[20081028,1111.39],[20081231,1355.41],[20090302,1256],[20091231,2534.36],[20100525,2641],[20101109,3755],[20101231,3703.51],[20110801,4193],[20111004,3269],[20111231,3821.99],[20121231,4316.69],[20130520,5214.98],[20130827,3967.84],[20131231,4274.18],[20141231,5226.95],[20150407,5523.29],[20150928,4120.5],[20151231,4593.01],[20161231,5296.71],[20171231,6355.65],[20180219,6689.29],[20180703,5633.94],[20181231,6194.5],[20191231,6299.54],[20200113,6325],[20200324,3937.63],[20200608,5070],[20201231,5979.07],[20211231,6581.48],[20220913,7318],[20221231,6850.62],[20231231,7272.8],[20240314,7433],[20240919,7905],[20241231,7079.9]];
// Blue chips: approximate split-adjusted year-end closes 2004..2024, beta to IHSG, dividend yield
const STOCKS=[
  {s:'BBCA',n:'Bank Central Asia',sec:'Banking',b:0.9,y:0.015,p:[330,355,470,675,650,970,1280,1600,1820,1920,2625,2660,3100,4380,5200,6685,6770,7300,8550,9400,9675]},
  {s:'BBRI',n:'Bank Rakyat Indonesia',sec:'Banking',b:1.2,y:0.035,p:[253,353,535,740,458,765,1050,1350,1390,1450,2330,2285,2335,3640,3660,4400,4170,4110,4940,5725,4080]},
  {s:'TLKM',n:'Telkom Indonesia',sec:'Telecom',b:0.8,y:0.035,p:[1010,1180,1800,2000,1380,1890,1590,1410,1810,2150,2865,3105,3980,4440,3750,3970,3310,4040,3750,3950,2710]},
  {s:'ASII',n:'Astra International',sec:'Conglomerate',b:1.2,y:0.03,p:[880,1020,1595,2730,1055,3470,5455,7400,7350,6800,7425,6000,8275,8300,8225,6925,6025,5700,5700,5650,4900]},
  {s:'UNVR',n:'Unilever Indonesia',sec:'Consumer',b:0.6,y:0.03,p:[705,885,1320,1350,1560,2210,3300,3760,4170,5200,6460,7400,7760,11180,9080,8400,7350,4110,4700,3530,1885]},
  {s:'GGRM',n:'Gudang Garam',sec:'Tobacco',b:0.7,y:0.03,p:[13600,10500,10000,8500,4250,21550,40000,62050,56300,42000,60700,55000,63900,83800,83625,53000,41000,30600,18000,20400,13250]},
  {s:'INDF',n:'Indofood Sukses Makmur',sec:'Consumer',b:1.0,y:0.03,p:[925,1350,1920,2675,930,3550,4875,4600,5850,6600,6750,5175,7925,7625,7450,7925,6850,6325,6725,6450,7700]},
  {s:'ADRO',n:'Adaro Energy',sec:'Coal mining',b:1.4,y:0.06,ipo:20080716,ipx:1100,pop:1.35,p:[null,null,null,null,580,1730,2550,1770,1590,1090,1040,515,1695,1860,1215,1555,1430,2250,3850,2380,2430]},
  {s:'AKRA',n:'AKR Corporindo',sec:'Energy distribution',b:1.0,y:0.04,p:[50,60,120,180,110,290,480,640,810,840,930,1400,1280,1270,860,760,630,820,1400,1475,1130]},
  {s:'AMRT',n:'Sumber Alfaria Trijaya',sec:'Retail (Alfamart)',b:0.7,y:0.01,ipo:20090115,ipx:40,pop:1.05,p:[null,null,null,null,null,50,90,150,230,400,470,520,550,610,750,905,800,1465,2650,2900,2850]},
  {s:'ANTM',n:'Aneka Tambang',sec:'Metals mining',b:1.5,y:0.03,p:[280,330,990,1950,520,1280,1620,1140,870,750,640,315,895,625,765,840,1935,2250,1985,1705,1525]},
  {s:'BBNI',n:'Bank Negara Indonesia',sec:'Banking',b:1.3,y:0.04,p:[575,545,935,805,340,1025,1975,1825,1925,1975,3050,2487,2762,4962,4400,3875,3087,3375,4612,5375,4350]},
  {s:'BMRI',n:'Bank Mandiri',sec:'Banking',b:1.2,y:0.045,p:[331,285,725,887,506,1125,1625,1687,2025,1962,2694,2312,2894,4000,3662,3875,3212,3512,4962,6050,5700]},
  {s:'BRIS',n:'Bank Syariah Indonesia',sec:'Islamic banking',b:1.3,y:0.01,ipo:20180509,ipx:400,pop:1.2,p:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,400,300,2250,1780,1290,1740,2730]},
  {s:'BRPT',n:'Barito Pacific',sec:'Petrochemicals',b:1.6,y:0.005,p:[120,100,150,330,50,110,120,90,60,50,55,40,260,450,380,880,960,790,755,1330,935]},
  {s:'CPIN',n:'Charoen Pokphand Indonesia',sec:'Poultry & feed',b:1.0,y:0.02,p:[60,80,120,160,70,400,1840,2150,3650,3375,3780,2600,3090,3000,7225,6500,6525,5950,5650,5025,4760]},
  {s:'CTRA',n:'Ciputra Development',sec:'Property',b:1.4,y:0.015,p:[160,200,300,450,120,290,330,400,650,750,1250,1250,1330,1185,1010,1040,985,970,940,1170,985]},
  {s:'EXCL',n:'XL Axiata',sec:'Telecom',b:1.0,y:0.02,ipo:20050929,ipx:1450,pop:1.02,p:[null,1500,1550,1750,1000,2200,4700,4850,5500,5200,4865,3650,2310,2960,1980,3150,2730,3170,2140,2000,2250]},
  {s:'ICBP',n:'Indofood CBP',sec:'Consumer',b:0.6,y:0.025,ipo:20101007,ipx:2700,pop:1.1,p:[null,null,null,null,null,null,2400,2650,3900,5100,6550,6738,8575,8900,10450,11150,9575,8700,10000,10575,11375]},
  {s:'INCO',n:'Vale Indonesia',sec:'Nickel mining',b:1.4,y:0.02,p:[1000,1200,2700,4000,1900,3700,4875,3175,2350,2650,3625,1635,2820,2890,3260,3640,5100,4680,7100,4310,3640]},
  {s:'INKP',n:'Indah Kiat Pulp & Paper',sec:'Pulp & paper',b:1.5,y:0.01,p:[700,600,950,2300,450,1600,1850,1000,900,1000,1150,1000,1030,5400,11550,7700,10600,7875,8725,8325,6600]},
  {s:'ITMG',n:'Indo Tambangraya Megah',sec:'Coal mining',b:1.3,y:0.09,ipo:20071218,ipx:14000,pop:1.05,p:[null,null,null,15000,7300,25000,50500,38650,41550,28500,15375,5725,16875,20700,20250,11475,13850,20400,39025,25650,26700]},
  {s:'JPFA',n:'Japfa Comfeed Indonesia',sec:'Poultry & feed',b:1.2,y:0.025,p:[300,250,250,400,120,600,650,850,1140,1520,880,480,1455,1300,2150,1535,1465,1720,1295,1180,1925]},
  {s:'KLBF',n:'Kalbe Farma',sec:'Pharmaceuticals',b:0.8,y:0.02,p:[55,70,125,125,41,160,320,340,1060,1250,1830,1320,1515,1690,1520,1620,1480,1615,2090,1610,1360]},
  {s:'MBMA',n:'Merdeka Battery Materials',sec:'Nickel & battery',b:1.5,y:0,ipo:20230418,ipx:795,pop:1.1,p:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,555,456]},
  {s:'MDKA',n:'Merdeka Copper Gold',sec:'Gold & copper mining',b:1.4,y:0,ipo:20150619,ipx:400,pop:1.07,p:[null,null,null,null,null,null,null,null,null,null,null,440,590,500,650,1000,2830,4050,4250,2710,1575]},
  {s:'MEDC',n:'Medco Energi Internasional',sec:'Oil & gas',b:1.4,y:0.02,p:[600,900,1000,1050,450,650,750,450,440,520,600,280,610,650,545,580,590,470,1015,1150,1100]},
  {s:'PGAS',n:'Perusahaan Gas Negara',sec:'Gas distribution',b:1.1,y:0.05,p:[400,600,1000,2100,860,3550,4425,3175,4600,4475,6000,2745,2700,1750,2120,2170,1655,1375,1760,1130,1590]},
  {s:'PTBA',n:'Bukit Asam',sec:'Coal mining',b:1.2,y:0.08,p:[180,220,500,1300,1250,3500,4400,3500,3050,2000,2500,800,2500,2460,4300,2660,2810,2710,3690,2440,2750]},
  {s:'SMGR',n:'Semen Indonesia',sec:'Cement',b:1.1,y:0.025,p:[900,1200,2200,4500,2200,6800,7800,9800,13500,12800,14500,9600,8800,9900,11500,12000,12425,7250,6575,6400,3280]},
  {s:'UNTR',n:'United Tractors',sec:'Heavy equipment & mining',b:1.2,y:0.05,p:[1800,2700,5800,10000,4600,15500,24600,26350,19700,19000,17350,16950,21250,35400,27350,21525,26600,22150,26075,22625,26775]},
];
// IDX30 constituents (Aug–Oct 2025 list); GGRM is kept as a former member.
const IDX30=new Set(['ADRO','AKRA','AMRT','ANTM','ASII','BBCA','BBNI','BBRI','BMRI','BRIS','BRPT','CPIN','CTRA','EXCL','ICBP','INCO','INDF','INKP','ITMG','JPFA','KLBF','MBMA','MDKA','MEDC','PGAS','PTBA','SMGR','TLKM','UNTR','UNVR']);
// The wider board: well-known names outside the IDX30 list, same approximate year-end closes.
// Kept in a second list with its own random stream so price paths in older saves do not change.
// ipx = offer price at the IPO (split-adjusted, approximate), pop = first-day move.
const STOCKS2=[
  {s:'AALI',n:'Astra Agro Lestari',sec:'Palm oil',b:1.2,y:0.04,p:[3100,4900,12600,28000,9800,22750,26200,21700,19700,25100,24250,15850,16775,13150,11825,14575,12325,9500,8025,7025,6200]},
  {s:'ACES',n:'Ace Hardware Indonesia',sec:'Retail',b:0.9,y:0.02,ipo:20071106,ipx:82,pop:1.1,p:[null,null,null,75,60,150,295,410,820,590,785,825,835,1155,1490,1495,1715,1280,496,720,790]},
  {s:'BBTN',n:'Bank Tabungan Negara',sec:'Banking',b:1.4,y:0.03,ipo:20091217,ipx:800,pop:1.05,p:[null,null,null,null,null,840,1640,1210,1450,870,1205,1295,1740,3570,2540,2120,1725,1730,1350,1250,1140]},
  {s:'BSDE',n:'Bumi Serpong Damai',sec:'Property',b:1.4,y:0.01,ipo:20080606,ipx:550,pop:1.02,p:[null,null,null,null,95,880,900,980,1110,1290,1805,1800,1755,1700,1255,1255,1225,1010,920,1080,945]},
  {s:'BUKA',n:'Bukalapak.com',sec:'Technology',b:1.6,y:0,ipo:20210806,ipx:850,pop:1.25,p:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,430,262,216,125]},
  {s:'BUMI',n:'Bumi Resources',sec:'Coal mining',b:1.9,y:0.005,p:[800,760,900,6000,910,2425,3025,2175,590,300,80,50,278,270,103,66,72,67,161,85,118]},
  {s:'GIAA',n:'Garuda Indonesia',sec:'Airlines',b:1.3,y:0,ipo:20110211,ipx:750,pop:0.83,p:[null,null,null,null,null,null,null,475,660,500,555,309,338,300,298,498,402,222,204,69,55]},
  {s:'GOTO',n:'GoTo Gojek Tokopedia',sec:'Technology',b:1.7,y:0,ipo:20220411,ipx:338,pop:1.13,p:[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,91,86,70]},
  {s:'HMSP',n:'HM Sampoerna',sec:'Tobacco',b:0.7,y:0.05,p:[266,356,388,572,324,416,1126,1560,2392,2496,2740,3760,3830,4730,3710,2100,1505,965,840,895,635]},
  {s:'JSMR',n:'Jasa Marga',sec:'Toll roads',b:1.0,y:0.02,ipo:20071112,ipx:1700,pop:1.2,p:[null,null,null,1900,910,1810,3425,4200,5450,4725,7050,5225,4320,6400,4280,5175,4630,3890,2980,4870,4330]},
  {s:'MNCN',n:'Media Nusantara Citra',sec:'Media',b:1.3,y:0.02,ipo:20070622,ipx:900,pop:1.03,p:[null,null,null,960,153,215,940,1310,2500,2625,2540,1855,1755,1285,690,1630,1140,900,740,386,280]},
  {s:'MYOR',n:'Mayora Indah',sec:'Consumer',b:0.8,y:0.015,p:[48,33,65,70,46,180,430,570,800,1040,836,1220,1645,2020,2620,2050,2710,2040,2500,2490,2780]},
  {s:'SIDO',n:'Sido Muncul',sec:'Pharmaceuticals',b:0.6,y:0.05,ipo:20131218,ipx:290,pop:1.2,p:[null,null,null,null,null,null,null,null,null,350,305,275,260,272,420,638,805,865,755,525,590]},
  {s:'TOWR',n:'Sarana Menara Nusantara',sec:'Telecom towers',b:0.8,y:0.02,ipo:20100308,ipx:210,pop:1.25,p:[null,null,null,null,null,null,230,204,456,550,830,950,716,800,690,805,960,1125,1100,990,655]},
];
for(const st of [...STOCKS,...STOCKS2]){ const f=st.p.find(v=>v!=null); st.p=st.p.map(v=>v==null?f:v); }
const listed=(sym,h)=>sym==='IHSG'||!STK[sym]?.ipo||keyH(h)>=STK[sym].ipo;
const STK=Object.fromEntries([...STOCKS,...STOCKS2].map(s=>[s.s,s]));
let SYMS=Object.keys(STK).sort();
function tick(p){ return p<200?1:p<500?2:p<2000?5:p<5000?10:25; }
const roundTick = p => { const t=tick(p); return Math.max(t, Math.round(p/t)*t); };

let MK=null; // series → Float64Array of daily closes
function buildMarket(seed){
  const rng=mulberry((seed>>>0)^0x9e3779b9), N=TD.length;
  const L=new Float64Array(N);
  const anc=IHSG_A.map(([k,v])=>[tdLE(k),Math.log(v)]);
  for(let a=0;a<anc.length-1;a++){
    const [i0,v0]=anc[a],[i1,v1]=anc[a+1], n=i1-i0; if(n<=0) continue;
    const w=[0]; for(let k=1;k<=n;k++) w.push(w[k-1]+gauss(rng)*0.0115);
    for(let k=0;k<=n;k++) L[i0+k]=v0+w[k]+(k/n)*((v1-v0)-w[n]);
  }
  const YE=[]; for(let y=2004;y<=2024;y++) YE.push(tdLE(y*10000+1231));
  const lin=(vals)=>{ const out=new Float64Array(N); for(let s=0;s<YE.length-1;s++){ const a=YE[s],b=YE[s+1]; for(let i=a;i<=b;i++) out[i]=vals[s]+(vals[s+1]-vals[s])*(i-a)/(b-a); } return out; };
  const yI=[]; for(let y=2004;y<=2024;y++) yI.push(Math.log(IHSG_A.find(a=>a[0]===y*10000+1231)[1]));
  const LinI=lin(yI);
  MK={IHSG:new Float64Array(N)};
  for(let i=0;i<N;i++) MK.IHSG[i]=Math.round(Math.exp(L[i])*100)/100;
  const gen=(st,rng)=>{
    const LinS=lin(st.p.map(Math.log)), idio=new Float64Array(N);
    for(let s=0;s<YE.length-1;s++){ const a=YE[s],b=YE[s+1],n=b-a; const w=[0]; for(let k=1;k<=n;k++) w.push(w[k-1]+gauss(rng)*0.014); for(let k=0;k<=n;k++) idio[a+k]=w[k]-(k/n)*w[n]; }
    // A listing starts from its offer price and first-day move, then drifts to the year-end close.
    if(st.ipo&&st.ipx){ const i0=ipoIdx(st), ye=YE.find(x=>x>i0); if(ye){ const a=Math.log(st.ipx*(st.pop||1)), b=LinS[ye]; for(let i=0;i<=ye;i++) LinS[i]=i<i0?Math.log(st.ipx):a+(b-a)*(i-i0)/(ye-i0); const d=st.b*(L[i0]-LinI[i0])+idio[i0], n=ye-i0; for(let i=i0;i<=ye;i++) LinS[i]-=d*(1-(i-i0)/n); } }
    const arr=new Float64Array(N);
    for(let i=0;i<N;i++) arr[i]=roundTick(Math.exp(LinS[i]+st.b*(L[i]-LinI[i])+idio[i]));
    MK[st.s]=arr;
  };
  for(const st of STOCKS) gen(st,rng);
  MK.Y10=yieldPath(rng);
  const rng2=mulberry((seed>>>0)^0x51ed270b);
  for(const st of STOCKS2) gen(st,rng2);
  syncTbk();
}
// First trading day on or after the listing date
function ipoIdx(st){ let i=tdLE(st.ipo); if(TD[i]<st.ipo) i=Math.min(TD.length-1,i+1); return i; }
function quote(sym,h){
  const arr=MK[sym], d=dOf(h), k=kOf(d), hr=d.getUTCHours(), i=tdLE(k);
  if(TD[i]===k && hr<16){
    if(hr<9) return arr[Math.max(0,i-1)];
    const f=(hr-8)/8, lp=Math.log(arr[Math.max(0,i-1)]), lc=Math.log(arr[i]);
    const v=Math.exp(lp+f*(lc-lp)+Math.sqrt(f*(1-f))*0.008*hg(i,hr,sym.charCodeAt(1)*31+sym.charCodeAt(2)));
    return sym==='IHSG'?Math.round(v*100)/100:roundTick(v);
  }
  return arr[i];
}
function prevClose(sym,h){ const i=tdLE(keyH(h)); return MK[sym][Math.max(0,i-1)]; }
function isOpen(h){ const d=dOf(h), k=kOf(d), hr=d.getUTCHours(); return TD[tdLE(k)]===k && hr>=9 && hr<16; }
function lastFullIdx(h){ const d=dOf(h), k=kOf(d), i=tdLE(k); return (TD[i]===k && d.getUTCHours()<16)? i-1 : i; }

