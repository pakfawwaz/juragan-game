'use strict';
/* ============================================================
   BUSINESSES (prices in Jan-2005 rupiah; scaled by CPI or a world-price index)
   ============================================================ */
const BIZ={
  warung:{n:'Warung Kelontong',kind:'retail',where:'any',open:[6,22],margin:0.12,blurb:'Neighbourhood general store. Daily sales, thin margin, steady demand. Busy in Ramadan.',
    lv:[{l:'Warung',setup:12e6,staff:1,rev:550e3,opex:750e3},{l:'Toko kelontong',setup:45e6,staff:2,rev:1.6e6,opex:1.9e6},{l:'Minimarket',setup:250e6,staff:6,rev:6.5e6,opex:7e6}]},
  kuliner:{n:'Rumah Makan',kind:'retail',where:'any',open:[9,21],margin:0.25,blurb:'Local cooking. Every regency eats; famous regional cuisines draw more.',
    lv:[{l:'Warung makan',setup:20e6,staff:2,rev:450e3,opex:1.2e6},{l:'Rumah makan',setup:90e6,staff:5,rev:1.6e6,opex:4e6},{l:'Restoran',setup:400e6,staff:14,rev:5.5e6,opex:14e6}]},
  konveksi:{n:'Konveksi',kind:'retail',where:'any',open:[8,17],margin:0.25,blurb:'Garment workshop sewing uniforms and ready-to-wear for wholesalers.',
    lv:[{l:'6 sewing machines',setup:30e6,staff:4,rev:520e3,opex:1.2e6},{l:'Workshop, 25 machines',setup:150e6,staff:14,rev:2.2e6,opex:4.5e6},{l:'Garment plant',setup:900e6,staff:60,rev:10e6,opex:20e6}]},
  batik:{n:'Usaha Batik',kind:'retail',where:'any',open:[8,17],margin:0.35,blurb:'Batik cap and tulis workshop with a showroom. Sells best in the old batik towns.',
    lv:[{l:'Batik cap workshop',setup:25e6,staff:3,rev:380e3,opex:1e6},{l:'Workshop and showroom',setup:120e6,staff:8,rev:1.5e6,opex:4e6},{l:'Batik house, exporting',setup:500e6,staff:25,rev:5.2e6,opex:12e6}]},
  mebel:{n:'Mebel Kayu',kind:'retail',where:'any',open:[8,17],margin:0.3,blurb:'Teak and mahogany furniture for local buyers and exporters. Strongest in the carving towns.',
    lv:[{l:'Carpentry shed',setup:30e6,staff:3,rev:400e3,opex:1e6},{l:'Furniture workshop',setup:150e6,staff:10,rev:1.8e6,opex:4e6},{l:'Export factory',setup:700e6,staff:35,rev:7e6,opex:14e6}]},
  wisata:{n:'Penginapan & Wisata',kind:'retail',where:'any',open:[0,24],margin:0.5,blurb:'Rooms for travellers anywhere; in tourist regencies, tours and resorts. Rich margins, hit hard by any shock.',
    lv:[{l:'Homestay, 4 rooms',setup:60e6,staff:2,rev:400e3,opex:1.5e6},{l:'Guesthouse, 16 rooms',setup:300e6,staff:8,rev:1.8e6,opex:6e6},{l:'Boutique resort',setup:1.5e9,staff:30,rev:8e6,opex:30e6}]},
  logistik:{n:'Jasa Angkutan',kind:'retail',where:'any',open:[6,22],margin:0.3,blurb:'Trucks and heavy equipment. Busiest near ports, mines and plantations.',
    lv:[{l:'2 pickup trucks',setup:120e6,staff:2,rev:900e3,opex:2e6},{l:'Truck fleet',setup:600e6,staff:8,rev:4e6,opex:9e6},{l:'Heavy equipment rental',setup:3e9,staff:20,rev:18e6,opex:40e6}]},
  lele:{n:'Kolam Lele',kind:'cycle',where:'any',cycle:90,price:9000,e:0.84,vol:0.08,fail:0.06,prod:'catfish',blurb:'Catfish ponds. Harvest every 90 days. Low risk, modest margin.',
    lv:[{l:'4 tarpaulin ponds',setup:15e6,staff:1,input:7e6,yield:1400,opex:150e3},{l:'12 tarpaulin ponds',setup:40e6,staff:2,input:20e6,yield:4200,opex:400e3},{l:'30 concrete ponds',setup:130e6,staff:4,input:50e6,yield:10500,opex:1.1e6}]},
  ayam:{n:'Ternak Ayam Broiler',kind:'cycle',where:'any',cycle:45,price:8800,e:0.77,vol:0.14,fail:0.04,prod:'live broiler',blurb:'Broiler chicken coops. 45-day cycles, volatile live-bird price.',
    lv:[{l:'Coop, 2.000 birds',setup:35e6,staff:1,input:22e6,yield:3300,opex:300e3},{l:'Coop, 5.000 birds',setup:85e6,staff:2,input:55e6,yield:8250,opex:700e3},{l:'Closed house, 15.000',setup:320e6,staff:4,input:165e6,yield:25500,opex:2.2e6}]},
  cabai:{n:'Kebun Cabai',kind:'cycle',where:'rural',land:true,cycle:120,price:9000,e:1.27,vol:0.3,fail:0.12,prod:'red chilli',season:[1.6,1.4,1.0,0.8,0.7,0.7,0.8,0.9,1.0,1.1,1.3,1.7],blurb:'Red chilli plots. Prices swing hard with the rainy season.',
    lv:[{l:'0,25 ha plot',setup:6e6,staff:1,input:6.5e6,yield:1500,opex:100e3},{l:'1 ha plot',setup:22e6,staff:3,input:25e6,yield:6000,opex:350e3},{l:'5 ha estate',setup:95e6,staff:10,input:120e6,yield:30000,opex:1.5e6}]},
  padi:{n:'Sawah Padi',kind:'cycle',where:'rural',land:true,cycle:120,price:1500,e:1.35,vol:0.05,fail:0.05,prod:'unhulled rice (GKP)',season:[1.05,1,0.92,0.92,0.97,1,1.02,1.03,1.04,1.05,1.06,1.06],blurb:'Leased rice fields. Two to three harvests a year. Thin but very stable.',
    lv:[{l:'1 ha (leased)',setup:7e6,staff:1,input:5e6,yield:5500,opex:80e3},{l:'5 ha',setup:32e6,staff:3,input:24e6,yield:27500,opex:350e3},{l:'20 ha',setup:120e6,staff:8,input:95e6,yield:110000,opex:1.2e6}]},
  jagung:{n:'Ladang Jagung',kind:'cycle',where:'rural',land:true,cycle:100,price:1100,e:1.2,vol:0.1,fail:0.07,prod:'dried corn',blurb:'Feed corn for the mills. Cheap to start.',
    lv:[{l:'1 ha',setup:5e6,staff:1,input:4e6,yield:5000,opex:60e3},{l:'5 ha',setup:22e6,staff:3,input:19e6,yield:25000,opex:250e3},{l:'25 ha',setup:100e6,staff:10,input:90e6,yield:130000,opex:1e6}]},
  bawang:{n:'Bawang Merah',kind:'cycle',where:'rural',land:true,cycle:70,price:7000,e:1.2,vol:0.3,fail:0.1,prod:'shallots',season:[1.3,1.4,1.2,1.0,0.8,0.8,0.8,0.9,1.0,1.1,1.2,1.3],blurb:'Shallot beds. Fast cycles, wild price swings.',
    lv:[{l:'0,5 ha',setup:8e6,staff:2,input:20e6,yield:5000,opex:150e3},{l:'2 ha',setup:30e6,staff:6,input:78e6,yield:20000,opex:500e3},{l:'8 ha',setup:110e6,staff:20,input:300e6,yield:80000,opex:1.6e6}]},
  tembakau:{n:'Kebun Tembakau',kind:'cycle',where:'spec',land:true,cycle:120,price:18000,e:1.0,vol:0.2,fail:0.1,prod:'cured tobacco leaf',season:[0.9,0.9,0.9,0.9,1,1,1.05,1.1,1.1,1.05,0.95,0.9],blurb:'Tobacco for the kretek makers. Best prices in the dry season.',
    lv:[{l:'1 ha',setup:8e6,staff:2,input:12e6,yield:900,opex:100e3},{l:'5 ha',setup:35e6,staff:8,input:58e6,yield:4500,opex:400e3},{l:'20 ha with curing barns',setup:150e6,staff:25,input:230e6,yield:18000,opex:1.5e6}]},
  sawit:{n:'Kebun Sawit',kind:'cycle',where:'spec',cycle:30,price:650,vol:0.1,fail:0.02,prod:'fresh fruit bunches (TBS)',blurb:'Mature oil palm, harvested every month. Price follows world CPO.',
    lv:[{l:'2 ha smallholding',setup:60e6,staff:1,input:0.8e6,yield:3000,opex:80e3},{l:'10 ha',setup:280e6,staff:3,input:3.8e6,yield:15000,opex:300e3},{l:'50 ha estate',setup:1.3e9,staff:12,input:18e6,yield:78000,opex:1.5e6}]},
  karet:{n:'Kebun Karet',kind:'cycle',where:'spec',cycle:30,price:7000,vol:0.1,fail:0.02,prod:'rubber slabs (bokar)',blurb:'Rubber tapping, sold monthly. Boomed to 2011, slumped after.',
    lv:[{l:'2 ha',setup:30e6,staff:1,input:0.4e6,yield:250,opex:60e3},{l:'10 ha',setup:140e6,staff:4,input:1.8e6,yield:1300,opex:250e3},{l:'50 ha',setup:650e6,staff:15,input:8e6,yield:6500,opex:1e6}]},
  kopi:{n:'Kebun Kopi',kind:'cycle',where:'spec',cycle:180,price:15000,vol:0.12,fail:0.08,prod:'green coffee beans',blurb:'Highland coffee, two pickings a year. Prices climb through the 2010s and spike in 2024.',
    lv:[{l:'1 ha',setup:25e6,staff:1,input:3e6,yield:450,opex:80e3},{l:'5 ha',setup:110e6,staff:4,input:14e6,yield:2250,opex:350e3},{l:'25 ha with wet mill',setup:600e6,staff:15,input:65e6,yield:12000,opex:1.5e6}]},
  kakao:{n:'Kebun Kakao',kind:'cycle',where:'spec',cycle:120,price:9000,vol:0.12,fail:0.1,prod:'dried cocoa beans',blurb:'Sulawesi and Papua cocoa. Pests are common; 2024 prices go through the roof.',
    lv:[{l:'1 ha',setup:20e6,staff:1,input:2e6,yield:260,opex:60e3},{l:'5 ha',setup:90e6,staff:4,input:9.5e6,yield:1300,opex:250e3},{l:'25 ha',setup:420e6,staff:14,input:45e6,yield:6600,opex:1.1e6}]},
  cengkeh:{n:'Cengkeh & Pala',kind:'cycle',where:'spec',cycle:180,price:35000,e:1.0,vol:0.25,fail:0.1,prod:'dried cloves and nutmeg',blurb:'The old spice islands. Small volumes, high prices.',
    lv:[{l:'1 ha',setup:30e6,staff:1,input:2.5e6,yield:220,opex:60e3},{l:'5 ha',setup:140e6,staff:4,input:12e6,yield:1100,opex:250e3},{l:'20 ha',setup:550e6,staff:12,input:48e6,yield:4500,opex:900e3}]},
  udang:{n:'Tambak Udang',kind:'cycle',where:'spec',cycle:100,price:35000,e:0.9,vol:0.12,fail:0.18,prod:'vannamei shrimp',blurb:'Intensive shrimp ponds for export. Big money, and disease can wipe out a cycle.',
    lv:[{l:'1 pond',setup:80e6,staff:2,input:45e6,yield:2000,opex:600e3},{l:'4 ponds',setup:300e6,staff:6,input:170e6,yield:8000,opex:2e6},{l:'12 ponds',setup:900e6,staff:16,input:500e6,yield:24000,opex:5.5e6}]},
  bandeng:{n:'Tambak Bandeng',kind:'cycle',where:'spec',cycle:120,price:9000,e:0.9,vol:0.08,fail:0.06,prod:'milkfish',blurb:'Brackish milkfish ponds on the coast. Steady.',
    lv:[{l:'1 ha',setup:25e6,staff:1,input:8e6,yield:1500,opex:100e3},{l:'5 ha',setup:110e6,staff:3,input:38e6,yield:7500,opex:400e3},{l:'20 ha',setup:420e6,staff:8,input:150e6,yield:30000,opex:1.4e6}]},
  rumput:{n:'Rumput Laut',kind:'cycle',where:'spec',cycle:45,price:4500,e:0.9,vol:0.2,fail:0.1,prod:'dried seaweed (cottonii)',blurb:'Seaweed lines in clear shallow water. Cheap, labour-heavy, quick.',
    lv:[{l:'1 ha of lines',setup:6e6,staff:2,input:3e6,yield:1200,opex:50e3},{l:'5 ha',setup:28e6,staff:6,input:14e6,yield:6000,opex:200e3},{l:'20 ha with drying floor',setup:110e6,staff:18,input:55e6,yield:24000,opex:700e3}]},
  sapi:{n:'Penggemukan Sapi',kind:'cycle',where:'rural',cycle:120,price:22000,e:1.25,vol:0.06,fail:0.03,prod:'live cattle',blurb:'Buy feeder cattle, fatten them for four months, sell by live weight.',
    lv:[{l:'5 head',setup:20e6,staff:1,input:35e6,yield:2000,opex:150e3},{l:'20 head',setup:70e6,staff:3,input:140e6,yield:8000,opex:500e3},{l:'100 head feedlot',setup:320e6,staff:10,input:700e6,yield:40000,opex:2e6}]},
  tangkap:{n:'Kapal Ikan',kind:'cycle',where:'spec',cycle:15,price:10000,e:0.9,vol:0.15,fail:0.08,prod:'fresh fish',blurb:'Fishing boats on two-week trips. Bad weather means a poor catch.',
    lv:[{l:'5 GT boat',setup:80e6,staff:4,input:6e6,yield:1000,opex:300e3},{l:'20 GT boat',setup:400e6,staff:10,input:25e6,yield:4500,opex:1.2e6},{l:'3 boats, 30 GT',setup:1.8e9,staff:36,input:110e6,yield:20000,opex:5e6}]},
  agen_lpg:{n:'Agen Gas LPG',kind:'retail',where:'any',tier:1,from:20070508,fromWhy:'the kerosene-to-LPG conversion programme starts in May 2007',open:[7,19],margin:0.09,blurb:'Pertamina LPG distribution, from a neighbourhood pangkalan to a regional agent and filling plant. Huge volume, thin margin.',
    lv:[{l:'Pangkalan LPG',setup:40e6,staff:2,rev:1.5e6,opex:0.8e6},{l:'Agen LPG (Pertamina)',setup:600e6,staff:8,rev:15e6,opex:8e6},{l:'SPPBE filling plant',setup:6e9,staff:30,rev:90e6,opex:40e6}]},
  spbu:{n:'Pom Bensin (SPBU)',kind:'retail',where:'any',tier:1,open:[5,23],margin:0.055,blurb:'A Pertamina franchise station. The margin per litre is fixed and small, the litres are many. Fewer competitors in remote regencies.',
    lv:[{l:'SPBU Mini (modular)',setup:400e6,staff:4,rev:15e6,opex:4e6},{l:'SPBU, 4 dispensers',setup:3e9,staff:14,rev:70e6,opex:15e6},{l:'SPBU with minimarket',setup:6e9,staff:28,rev:150e6,opex:30e6}]},
  konsultan_ti:{n:'Konsultan TI',kind:'retail',where:'any',tier:1,wage:3.5,open:[8,18],margin:0.65,blurb:'Software development and IT services for companies and government. Expensive people, rich margins, wants a big-city client base. Can serve your group as its IT vendor.',
    lv:[{l:'Studio, 3 developers',setup:60e6,staff:3,rev:0.9e6,opex:1.5e6},{l:'Software house, 12',setup:400e6,staff:12,rev:4e6,opex:6e6},{l:'IT consultancy, 50',setup:2.5e9,staff:50,rev:18e6,opex:25e6}]},
  alihdaya:{n:'Alih Daya (Outsourcing)',kind:'retail',where:'any',tier:1,open:[8,17],margin:0.2,blurb:'Places security guards, cleaners, drivers and admin staff with client companies. Can also serve your own group as its outsourcing vendor.',
    lv:[{l:'Agency, 30 placed',setup:50e6,staff:2,rev:1.2e6,opex:1e6},{l:'Agency, 150 placed',setup:300e6,staff:8,rev:6e6,opex:4e6},{l:'National firm, 800 placed',setup:2e9,staff:30,rev:30e6,opex:18e6}]},
  bpr:{n:'BPR (Bank Perkreditan Rakyat)',kind:'retail',where:'any',tier:2,pt:true,ptWhy:'UU 7/1992 on Banking',depr:0.15,wage:2,open:[8,16],margin:0.45,blurb:'A rural bank lending to traders and farmers. Steady interest income, but bad loans come in waves. Strong finance and risk teams keep them down.',
    lv:[{l:'BPR, 1 office',setup:5e9,staff:12,rev:8e6,opex:25e6},{l:'BPR, 4 branches',setup:15e9,staff:35,rev:26e6,opex:70e6},{l:'BPR network, 15 branches',setup:60e9,staff:120,rev:110e6,opex:280e6}]},
  batubara:{n:'Tambang Batu Bara',kind:'cycle',where:'spec',tier:2,wage:1.8,cycle:30,usd:'batubara',take:0.6,unit:'ton',vol:0.08,fail:0.03,prod:'thermal coal',blurb:'An IUP coal concession. Sold monthly at world prices in dollars: a fortune in 2008, 2011 and 2022, losses when the price slumps.',
    lv:[{l:'Small pit (IUP)',setup:25e9,staff:60,input:4.8e9,yield:20000,opex:300e6},{l:'1 Mt a year',setup:120e9,staff:250,input:20e9,yield:85000,opex:1.2e9},{l:'Large concession',setup:600e9,staff:1200,input:95e9,yield:420000,opex:5e9}]},
  minyak:{n:'Sumur Minyak (KSO)',kind:'cycle',where:'spec',tier:2,wage:2,cycle:30,usd:'minyak',take:0.5,unit:'barrel',vol:0.06,fail:0.04,prod:'crude oil',blurb:'An operating cooperation (KSO) with Pertamina on old wells. Paid at the dollar oil price after the state share.',
    lv:[{l:'KSO, old wells',setup:30e9,staff:40,input:0.9e9,yield:6000,opex:250e6},{l:'Marginal field',setup:150e9,staff:150,input:4.5e9,yield:30000,opex:1e9},{l:'Block share, offshore',setup:700e9,staff:500,input:21e9,yield:140000,opex:4.5e9}]},
  gas:{n:'Lapangan Gas',kind:'cycle',where:'spec',tier:2,wage:2,cycle:30,usd:'gas',take:0.5,unit:'MMBTU',vol:0.04,fail:0.03,prod:'natural gas',blurb:'A gas field selling to PLN, fertiliser plants and industry on long contracts. Steadier than oil.',
    lv:[{l:'Small field',setup:40e9,staff:40,input:1.5e9,yield:150000,opex:300e6},{l:'Field with processing plant',setup:180e9,staff:150,input:6.5e9,yield:650000,opex:1.2e9},{l:'Large block share',setup:800e9,staff:500,input:30e9,yield:3000000,opex:5e9}]},
};
// Nominal price index vs 2005 for world-priced crops (approximate farm-gate levels).
const HISTP={
  sawit:{2005:1,2006:1.1,2007:1.9,2008:2.0,2009:1.5,2010:2.0,2011:2.3,2012:2.1,2013:2.0,2014:2.2,2015:1.7,2016:2.1,2017:2.2,2018:1.8,2019:1.8,2020:2.4,2021:3.6,2022:3.4,2023:3.3,2024:3.8},
  karet:{2005:1,2006:1.4,2007:1.4,2008:1.3,2009:1.0,2010:1.6,2011:1.9,2012:1.3,2013:1.1,2014:0.8,2015:0.65,2016:0.7,2017:0.8,2018:0.6,2019:0.65,2020:0.7,2021:0.85,2022:0.75,2023:0.7,2024:0.85},
  kopi:{2005:1,2006:1.2,2007:1.35,2008:1.4,2009:1.3,2010:1.5,2011:2.0,2012:1.9,2013:1.7,2014:1.9,2015:1.9,2016:2.0,2017:2.1,2018:2.0,2019:2.0,2020:2.0,2021:2.3,2022:2.7,2023:3.0,2024:4.2},
  kakao:{2005:1,2006:1,2007:1.2,2008:1.6,2009:1.9,2010:2.1,2011:1.9,2012:1.8,2013:2.0,2014:3.0,2015:3.3,2016:3.3,2017:2.5,2018:2.5,2019:2.6,2020:2.7,2021:2.7,2022:2.8,2023:3.4,2024:8.0},
};
function histIdx(t,h){ const T=HISTP[t], yf=clamp(yfrac(h)-0.5,2005,2024), y=Math.floor(yf), f=yf-y; return T[y]+(T[Math.min(2024,y+1)]-T[y])*f; }
const landAdj = reg => 0.6+0.4*REG[reg].land;
function commodityPrice(t,h){
  const b=BIZ[t], m=dOf(h).getUTCMonth(), k=keyH(h);
  if(b.usd) return tblAt(USDP[b.usd],h)*usd(h)*b.take;
  let p=b.price*(HISTP[t]?histIdx(t,h):Math.pow(cpi(h),b.e))*(b.season?b.season[m]:1);
  if(t==='ayam' && k>=20200401 && k<=20200630) p*=0.75;
  if(t==='udang' && k>=20200401 && k<=20200731) p*=0.8;
  return p;
}
function covidRetail(h){ const k=keyH(h); return (k>=20200315&&k<=20200531)?0.7 : (k>20200531&&k<=20201231)?0.85 : (k>=20210703&&k<=20210831)?0.8 : 1; }
function shockF(t,reg,h){
  if(t==='wisata'){ const k=keyH(h); if(k>=20200315&&k<=20201231) return 0.25; if(k>=20210101&&k<=20211231) return 0.45; if(k>=20220101&&k<=20220630) return 0.75;
    if(REG[reg].prov==='Bali'&&k>=20051001&&k<=20060430) return 0.6; return 1; }
  if(t==='logistik') return 1;
  return covidRetail(h);
}
function seasonRetail(h){ const y=yearOf(h); if(!LEBK[y]) return 1; const L0=hK(LEBK[y]); if(h>=L0-30*24 && h<L0) return 1.22; if(h>=L0 && h<L0+4*24) return 0.55; return dOf(h).getUTCMonth()===11?1.05:1; }
function staffF(u){ const req=BIZ[u.t].lv[u.lv].staff; if(u.w<=0) return 0; return u.w>=req?Math.min(1.08,1+0.03*(u.w-req)):u.w/req; }
function moraleF(u,h){ const r=u.sal/uWage(u,h); return r<1?0.7+0.3*r:Math.min(1.1,1+0.2*(r-1)); }
const SPEC_BONUS=1.25;
const wStep=u=>Math.max(1,Math.round(BIZ[u.t].lv[u.lv].staff/10));
const isSpec=(t,reg)=>REG[reg].spec.includes(t);
const specF=u=>isSpec(u.t,u.reg)?SPEC_BONUS:1;
function allowed(t,reg){ const w=BIZ[t].where; return w==='any'||isSpec(t,reg)||(w==='rural'&&REG[reg].type!=='M'); }
function whyNot(t){ const w=BIZ[t].where; return w==='rural'?'Needs farmland: not in metro cities':'Only where the resource is: a regional specialty'; }
// World prices in US dollars for the extractive businesses (annual averages, approximate).
const USDP={
  batubara:{2005:36,2006:36,2007:45,2008:80,2009:55,2010:70,2011:85,2012:72,2013:60,2014:55,2015:45,2016:45,2017:60,2018:65,2019:50,2020:40,2021:85,2022:180,2023:110,2024:85},
  minyak:{2005:54,2006:64,2007:70,2008:97,2009:61,2010:79,2011:111,2012:113,2013:106,2014:96,2015:50,2016:40,2017:51,2018:67,2019:62,2020:40,2021:68,2022:97,2023:78,2024:78},
  gas:{2005:3,2006:3.5,2007:4,2008:5.5,2009:4.5,2010:5,2011:6,2012:7,2013:8,2014:8.5,2015:7,2016:6,2017:6.5,2018:7,2019:7,2020:6,2021:6,2022:7,2023:7,2024:7},
};
function tblAt(T,h){ const yf=clamp(yfrac(h)-0.5,2005,2024), y=Math.floor(yf), f=yf-y; return T[y]+(T[Math.min(2024,y+1)]-T[y])*f; }
const uWage=(u,h)=>umr(u.reg,h)*(BIZ[u.t].wage||1);
const unitOf=b=>b.unit||'kg';
// How well a shop or service sells in a regency: every regency can host it, the local market decides how well.
function retailMult(t,reg){
  const r=REG[reg], up=(r.boost||[]).includes(t), T=r.type;
  switch(t){
    case 'wisata': return up?1.5:T==='M'?1:T==='K'?0.8:0.55;
    case 'batik': case 'mebel': return up?1.4:0.75;
    case 'konveksi': return up?1.35:T==='M'?1:0.8;
    case 'kuliner': return up?1.3:1;
    case 'logistik': return up?1.35:0.8;
    case 'konsultan_ti': return T==='M'?1.25:T==='K'?0.9:T==='B'?0.55:0.4;
    case 'spbu': return T==='R'?1.15:T==='M'?0.95:1;
    case 'agen_lpg': return T==='M'?0.9:1.05;
    case 'alihdaya': return T==='M'?1.3:T==='K'?1:0.6;
    case 'bpr': return T==='M'?0.9:1.1;
  }
  return 1;
}
const unitBoost=u=>BIZ[u.t].kind==='retail'?retailMult(u.t,u.reg):specF(u);
function boostChip(t,reg){
  const b=BIZ[t];
  if(b.kind!=='retail') return isSpec(t,reg)?'<span class="chip good">Specialty +25%</span>':'';
  const m=retailMult(t,reg); if(Math.abs(m-1)<0.01) return '';
  return `<span class="chip ${m>1?'good':'warn'}">Local demand ×${m.toFixed(2).replace('.',',')}</span>`;
}
function specChips(r){
  const a=r.spec.filter(k=>BIZ[k]).map(k=>`<span class="chip good">${BIZ[k].n}</span>`), b=(r.boost||[]).filter(k=>BIZ[k]).map(k=>`<span class="chip acc">${BIZ[k].n} ↑</span>`);
  return [...a,...b].join(' ')||'<span class="muted">no particular specialty</span>';
}
const TIER_N=['','Medium business','Large business'];
function bizGate(c,t){
  const b=BIZ[t];
  if(b.from&&keyH(S.h)<b.from) return `${b.n} only becomes possible from ${fkey(b.from)}${b.fromWhy?': '+b.fromWhy:''}.`;
  if(b.pt&&c.form!=='PT') return `${b.n} must be owned by a full PT (${b.ptWhy}). ${coName(c)} is a ${FORMS[c.form].n}.`;
  if((b.tier||0)>(c.level||0)) return `${b.n} is a ${TIER_N[b.tier].toLowerCase()}: it needs a Usaha ${LEVELS[b.tier].n} or bigger to win the licences and bank financing. ${coName(c)} is a Usaha ${SZ(c).n}. ${nextLevelText(c)}`;
  return null;
}


/* ---------- Monitoring and the board */
function monCostR(c,reg){ const o=officeFor(c,reg); return 120e3*cpi(S.h)*(1+o.d/150)*(1-0.35*officeSkill(c,o)/100)*(1-0.25*fnScore(c,'ops')/100); }
function leakR(c,reg){ const o=officeFor(c,reg); return Math.min(0.3,0.02+o.d/6000)*(1-0.85*officeSkill(c,o)/100)*(1-0.5*fnScore(c,'ops')/100); }
const monCost=(c,u)=>monCostR(c,u.reg), leak=(c,u)=>leakR(c,u.reg);
function onBoard(c,who,role){ return (c.board||[]).some(b=>b.who===who&&(!role||b.role===role)); }
function playerSkill(){ let seats=0,units=0; for(const c of S.C) if(onBoard(c,'P','dir')){ seats++; units+=c.units.length; } return Math.round(72*Math.pow(Math.min(1,4/Math.max(1,units)),0.35)/Math.sqrt(Math.max(1,seats))); }
const skillOf=(b,c)=>b.who==='P'?Math.round(playerSkill()*attnF(c)):b.skill;
function mgmt(c){ const d=(c.board||[]).filter(b=>b.role==='dir').map(b=>skillOf(b,c)).sort((a,b)=>b-a); if(!d.length) return 15; return Math.min(100,d[0]+0.15*d.slice(1).reduce((s,x)=>s+x,0)+10*jobQ(c,'strategy')); }
function gov(c){ const k=(c.board||[]).filter(b=>b.role==='kom').map(b=>b.who==='P'?70:b.skill); return Math.min(100,(k.length?Math.max(...k):0)+20*jobQ(c,'cs')); }
const mgmtF=c=>0.85+0.25*mgmt(c)/100;
function compliant(c){ if(c.form!=='PT'&&c.form!=='PTP') return true; return onBoardRole(c,'dir')&&(c.form==='PTP'||onBoardRole(c,'kom')); }
const onBoardRole=(c,role)=>(c.board||[]).some(b=>b.role===role);
function titleOf(c,b){
  if(c.form==='UD') return b.who==='P'?'Pemilik':'Manajer';
  if(c.form==='CV') return b.who==='P'?'Sekutu aktif':'Manajer';
  const same=c.board.filter(x=>x.role===b.role), i=same.indexOf(b);
  if(b.role==='dir'){ const ceo=same.find(x=>x.fn==='ceo')||same[0]; if(b===ceo) return 'Direktur Utama'; if((c.level||0)>=1&&FN[b.fn]&&b.fn!=='ceo') return FN[b.fn].t; return 'Direktur'; }
  return same.length>1&&i===0?'Komisaris Utama':'Komisaris';
}
const refBand=v=>v>=80?['Clean record','good']:v>=60?['Mixed references','acc']:['Doubtful references','bad'];
const MALE=['Budi','Agus','Hendra','Andi','Wahyu','Yusuf','Joko','Teguh','Bambang','Irfan','Rudi','Dimas','Hasan','Made','Fajar','Yohanes'], FEM=['Siti','Dewi','Rina','Fitri','Ratna','Lestari','Maya','Sri','Nurul','Indah','Ayu','Putri','Sinta','Ketut'], FIRST=[...MALE,...FEM];
const LAST=['Santoso','Wijaya','Hidayat','Siregar','Nasution','Saputra','Kusuma','Lubis','Pratama','Rahman','Simanjuntak','Wibowo','Gunawan','Halim','Tanjung','Sembiring','Pattiradjawane','Manurung','Harahap','Setiawan'];
const REL=[['Paman','Your uncle',MALE],['Bibi','Your aunt',FEM],['Sepupu','Your cousin',FIRST],['Kakak','Your older sibling',FIRST],['Adik','Your younger sibling',FIRST],['Ipar','Your in-law',FIRST]];
function defaultBoard(c){
  const b=[{id:nid('B'),who:'P',role:'dir',src:'self',skill:0,integ:100,sal:0,since:S.h}];
  if(c.form==='PT') b.push({id:nid('B'),who:'X',role:'kom',src:'fam',name:'Ibu '+FEM[(parseInt(c.id.slice(1))*7)%FEM.length],bg:'Your mother, the family shareholder',skill:40,integ:90,sal:0,mkt:0,since:S.h});
  return b;
}

