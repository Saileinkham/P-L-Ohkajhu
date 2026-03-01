/* OKJ Dashboard — App Logic
 * MGR and MONTHS are loaded by index.html via fetch() before this script runs
 * initDashboard() is called by index.html after all data is loaded
 */

/* ── global: tab switching ── */
/* ── tabs ── */
function showTab(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}

/* ── main app ── */
function initDashboard() {


/* ── month state ── */
let curMonth = "2026-01";
let RAW = MONTHS[curMonth].raw;
let DD  = MONTHS[curMonth].dd;
let IC  = MONTHS[curMonth].ic;

function switchMonth(key){
  if(!MONTHS[key]) return;
  curMonth = key;
  RAW = MONTHS[curMonth].raw;
  DD  = MONTHS[curMonth].dd;
  IC  = MONTHS[curMonth].ic;
  ACTIVE = [...RAW];
  // rebuild branch dropdowns
  rebuildBranchDropdowns();
  renderAll();
  renderIC();
}

function rebuildBranchDropdowns(){
  ['fBranch','cpA','cpB','dtSel','icBranch'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    const isCpB = id==='cpB';
    while(sel.options.length) sel.remove(0);
    if(id==='fBranch') sel.appendChild(new Option('ทุกสาขา','all'));
    RAW.forEach((b,i)=>{
      const lbl = `${b.code} — ${b.name}`;
      const val = (id==='cpA'||id==='cpB') ? i : b.code;
      sel.appendChild(new Option(lbl, val));
    });
    if(isCpB && sel.options.length>1) sel.selectedIndex=1;
  });
  resetFilter();
}

/* ── helpers ── */
const C={b:'#3b82f6',g:'#22c55e',r:'#ef4444',a:'#f59e0b',p:'#a855f7',t:'#06b6d4',o:'#f97316'};
const sum=(a,k)=>a.reduce((s,b)=>s+(+b[k]||0),0);
const avg=(a,k)=>a.length?+(sum(a,k)/a.length).toFixed(1):0;
const fM=v=>`฿${(v/1e6).toFixed(2)}M`;
const fMx=v=>v>=1e6?`฿${(v/1e6).toFixed(1)}M`:v>=1e3?`฿${(v/1e3).toFixed(0)}K`:`฿${Math.round(v)}`;
const cc=(v,lo,hi)=>v>=hi?'cg':v>=lo?'ca':'cr';
const pct=(v,s)=>s?+(v/s*100).toFixed(1):0;
const fi=v=>Number.isInteger(v)?v:'';

Chart.defaults.color='#5a6170'; Chart.defaults.borderColor='#e2e5eb';
Chart.defaults.font.family='Sarabun'; Chart.defaults.font.size=12;
Chart.register(ChartDataLabels);

/* ── manager lookup ── */
const BM={};
Object.entries(MGR).forEach(([m,cs])=>cs.forEach(c=>BM[c]=m));

/* ── filter state ── */
let ACTIVE=[...RAW];
const maxSales=Math.max(...RAW.map(b=>b.sales));

/* ── populate dropdowns ── */
// Populate month dropdown from MONTHS
(function(){
  const fMonth=document.getElementById('fMonth');
  while(fMonth.options.length) fMonth.remove(0);
  Object.keys(MONTHS).sort().forEach(k=>{
    const opt=new Option(MONTHS[k].label, k);
    if(k===curMonth) opt.selected=true;
    fMonth.appendChild(opt);
  });
})();

(function(){
  const fmSel=document.getElementById('fMgr');
  const fbSel=document.getElementById('fBranch');
  Object.keys(MGR).forEach(m=>fmSel.appendChild(new Option(m,m)));
  RAW.forEach(b=>fbSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));

  const cpA=document.getElementById('cpA'), cpB=document.getElementById('cpB');
  RAW.forEach((b,i)=>{cpA.appendChild(new Option(`${b.code} — ${b.name}`,i)); cpB.appendChild(new Option(`${b.code} — ${b.name}`,i));});
  cpB.selectedIndex=1;

  const dtSel=document.getElementById('dtSel');
  const dtZone=document.getElementById('dtZone');
  Object.keys(MGR).forEach(m=>dtZone.appendChild(new Option(m,m)));
  RAW.forEach(b=>dtSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));

  const mgZone=document.getElementById('mgZone');
  Object.keys(MGR).forEach(m=>mgZone.appendChild(new Option(m,m)));
})();

/* ── filter ── */
function applyFilter(){
  const mgr=document.getElementById('fMgr').value;
  const branchSel=document.getElementById('fBranch');
  // rebuild branch dropdown
  const curB=branchSel.value;
  while(branchSel.options.length>1) branchSel.remove(1);
  const pool=mgr==='all'?RAW:RAW.filter(b=>BM[b.code]===mgr);
  pool.forEach(b=>branchSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===curB)) branchSel.value=curB; else branchSel.value='all';
  const selB=branchSel.value;
  ACTIVE=RAW.filter(b=>{
    if(mgr!=='all'&&BM[b.code]!==mgr) return false;
    if(selB!=='all'&&b.code!==selB) return false;
    return true;
  });
  const el=document.getElementById('fSum');
  if(mgr==='all'&&selB==='all'){el.style.display='none';}
  else{el.style.display=''; el.textContent=(mgr!=='all'&&selB==='all')?`${mgr} · ${ACTIVE.length} สาขา`:selB;}
  renderAll();
}
function resetFilter(){
  document.getElementById('fMgr').value='all';
  const fb=document.getElementById('fBranch');
  while(fb.options.length>1) fb.remove(1);
  RAW.forEach(b=>fb.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  fb.value='all';
  ACTIVE=[...RAW];
  document.getElementById('fSum').style.display='none';
  renderAll();
}
function renderAll(){renderKPI();renderCharts();renderRank();renderMgr();renderMgZone();}

/* ── KPI ── */
function kCard(lbl,val,sub,chip,ct,color){
  return `<div class="kpi"><div class="kpib" style="background:${color}"></div><div class="kpil">${lbl}</div><div class="kpiv">${val}</div><div class="kpis">${sub}</div><span class="kchip ${chip}">${ct}</span></div>`;
}
function insEl(color,txt){return `<div class="ins"><div class="idot" style="background:${color}"></div><span>${txt}</span></div>`;}

function renderKPI(){
  const a=ACTIVE, s=sum(a,'sales')||1;
  const tS=sum(a,'sales'),tGP=sum(a,'gp1'),tOp=sum(a,'op_profit'),tNet=sum(a,'net_profit');
  const tCOG=sum(a,'cog'),tCOL=sum(a,'col'),tSA=sum(a,'sa');
  const tRent=sum(a,'rent'),tElec=sum(a,'elec'),tWater=sum(a,'water');
  const p=v=>(v/s*100).toFixed(1)+'%';
  document.getElementById('kMain').innerHTML=[
    kCard('Total Revenue',`฿${(tS/1e6).toFixed(2)}M`,tS.toLocaleString('en'),'cb',a.length+' สาขา',C.b),
    kCard('Gross Profit',`฿${(tGP/1e6).toFixed(2)}M`,tGP.toLocaleString('en'),'cg','GP% '+p(tGP),C.g),
    kCard('Operating Profit',`฿${(tOp/1e6).toFixed(2)}M`,tOp.toLocaleString('en'),'cb','Op% '+p(tOp),C.t),
    kCard('Net Profit',`฿${(tNet/1e6).toFixed(2)}M`,tNet.toLocaleString('en'),tNet/s>.2?'cg':tNet/s>.1?'ca':'cr','NP% '+p(tNet),C.p),
    kCard('COG',`฿${(tCOG/1e6).toFixed(2)}M`,tCOG.toLocaleString('en'),'cr','COG% '+p(tCOG),C.r),
    kCard('Labour (COL)',`฿${(tCOL/1e6).toFixed(2)}M`,tCOL.toLocaleString('en'),'ca','COL% '+p(tCOL),C.o),
    kCard('S&A Expenses',`฿${(tSA/1e6).toFixed(2)}M`,tSA.toLocaleString('en'),'ca','S&A% '+p(tSA),C.a),
    kCard('Avg Sales/Branch',`฿${(tS/a.length/1e6).toFixed(2)}M`,a.length+' สาขา','ct','avg/branch',C.t),
  ].join('');
  document.getElementById('kUtil').innerHTML=[
    kCard('ค่าเช่าและค่าส่วนกลาง',`฿${(tRent/1e6).toFixed(2)}M`,tRent.toLocaleString('en'),'ca','Rent% '+p(tRent),C.a),
    kCard('ค่าไฟฟ้า',`฿${(tElec/1e6).toFixed(2)}M`,tElec.toLocaleString('en'),'ca','Elec% '+p(tElec),C.o),
    kCard('ค่าน้ำประปา',`฿${(tWater/1e6).toFixed(2)}M`,tWater.toLocaleString('en'),'cb','Water% '+p(tWater),C.b),
  ].join('');
  const byNet=[...a].sort((x,y)=>y.net_pct-x.net_pct);
  const bySales=[...a].sort((x,y)=>y.sales-x.sales);
  const byRent=[...a].sort((x,y)=>y.rent_pct-x.rent_pct);
  const byElec=[...a].sort((x,y)=>y.elec_pct-x.elec_pct);
  document.getElementById('kInsight').innerHTML=[
    insEl(C.g,`Best Sales: <strong>${bySales[0]?.name} ${fM(bySales[0]?.sales||0)}</strong>`),
    insEl(C.g,`Best Net%: <strong>${byNet[0]?.name} ${byNet[0]?.net_pct}%</strong>`),
    insEl(C.r,`Net Loss: <strong>${a.filter(b=>b.net_profit<0).map(b=>b.name).join(', ')||'ไม่มี'}</strong>`),
    insEl(C.a,`ค่าเช่าสูงสุด: <strong>${byRent[0]?.name} ${byRent[0]?.rent_pct}%</strong>`),
    insEl(C.o,`ค่าไฟสูงสุด: <strong>${byElec[0]?.name} ${byElec[0]?.elec_pct}%</strong>`),
  ].join('');
}

/* ── charts ── */
const CH={};
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
function nc(id,cfg){dc(id);CH[id]=new Chart(document.getElementById(id),cfg);return CH[id];}

function renderCharts(){
  const a=ACTIVE;
  const tS=sum(a,'sales'),tCOG=sum(a,'cog'),tGP=sum(a,'gp1'),tCOL=sum(a,'col'),tSA=sum(a,'sa'),tOp=sum(a,'op_profit'),tNet=sum(a,'net_profit');

  /* waterfall */
  nc('cWF',{type:'bar',data:{
    labels:['Revenue','COG','Gross Profit','COL','S&A','Op Profit','Net Profit'],
    datasets:[{data:[tS/1e6,-tCOG/1e6,tGP/1e6,-tCOL/1e6,-tSA/1e6,tOp/1e6,tNet/1e6].map(v=>+v.toFixed(1)),
      backgroundColor:[C.b,C.r,C.g,C.o,C.a,C.t,C.p],borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},
        datalabels:{color:'#fff',font:{weight:'700',size:10},formatter:v=>`฿${Math.abs(v)}M`,anchor:'center',align:'center'},
        tooltip:{callbacks:{label:c=>`฿${c.raw}M`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`฿${v}M`}}}}});

  /* donut */
  const s=tS||1,np=tNet/s*100,cogp=tCOG/s*100,colp=tCOL/s*100,sap=tSA/s*100,oth=Math.max(0,100-np-cogp-colp-sap);
  nc('cDnt',{type:'doughnut',data:{
    labels:[`Net ${np.toFixed(1)}%`,`COG ${cogp.toFixed(1)}%`,`COL ${colp.toFixed(1)}%`,`S&A ${sap.toFixed(1)}%`,`อื่นๆ ${oth.toFixed(1)}%`],
    datasets:[{data:[np,cogp,colp,sap,oth].map(v=>+v.toFixed(1)),backgroundColor:[C.p,C.r,C.o,C.a,C.t],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{datalabels:{display:false},legend:{position:'right',labels:{padding:12,font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw}%`}}}}});

  /* top sales */
  const ts10=[...a].sort((x,y)=>y.sales-x.sales).slice(0,10);
  nc('cTS',{type:'bar',data:{labels:ts10.map(b=>b.name),datasets:[{data:ts10.map(b=>+(b.sales/1e6).toFixed(2)),backgroundColor:C.b,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:55}},
      plugins:{legend:{display:false},
        datalabels:{color:'#2563eb',font:{weight:'700',size:9},formatter:v=>`฿${v}M`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`฿${c.raw}M`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`฿${v}M`:''}},y:{grid:{display:false}}}}});

  /* top net */
  const tn10=[...a].filter(b=>b.net_pct>0).sort((x,y)=>y.net_pct-x.net_pct).slice(0,10);
  nc('cTN',{type:'bar',data:{labels:tn10.map(b=>b.name),datasets:[{data:tn10.map(b=>b.net_pct),backgroundColor:C.g,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:45}},
      plugins:{legend:{display:false},
        datalabels:{color:'#16a34a',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`${c.raw}%`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`${v}%`:''}},y:{grid:{display:false}}}}});

  /* GP branch */
  const gpS=[...a].sort((x,y)=>y.gp_pct-x.gp_pct), gpAvg=avg(a,'gp_pct');
  nc('cGP',{type:'bar',data:{labels:gpS.map(b=>b.name),datasets:[
    {label:'GP%',data:gpS.map(b=>b.gp_pct),backgroundColor:gpS.map(b=>b.gp_pct>=65?C.g:b.gp_pct>=62?C.b:C.r),borderRadius:3},
    {label:`Avg ${gpAvg}%`,data:gpS.map(()=>gpAvg),type:'line',borderColor:C.a,borderDash:[4,3],borderWidth:2,pointRadius:0,fill:false,datalabels:{display:false}}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},
      plugins:{legend:{labels:{font:{size:11}}},
        datalabels:{display:ctx=>ctx.datasetIndex===0,color:ctx=>{const v=ctx.dataset.data[ctx.dataIndex];return v>=65?'#16a34a':v>=62?'#2563eb':'#dc2626';},font:{weight:'700',size:8},formatter:v=>`${v}%`,anchor:'end',align:'top',offset:1},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{min:45,max:73,ticks:{callback:v=>`${v}%`}}}}});

  /* utility stacked */
  const us=[...a].sort((x,y)=>y.sales-x.sales);
  nc('cUt',{type:'bar',data:{labels:us.map(b=>b.name),datasets:[
    {label:'ค่าเช่า%',data:us.map(b=>b.rent_pct),backgroundColor:C.a},
    {label:'ค่าไฟ%',data:us.map(b=>b.elec_pct),backgroundColor:C.o},
    {label:'ค่าน้ำ%',data:us.map(b=>b.water_pct),backgroundColor:C.b}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>=2,color:'#fff',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'center',align:'center'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{stacked:true,ticks:{callback:v=>`${v}%`}}}}});

  /* cost stacked */
  nc('cSt',{type:'bar',data:{labels:us.map(b=>b.name),datasets:[
    {label:'COG%',data:us.map(b=>b.cog_pct),backgroundColor:C.r},
    {label:'COL%',data:us.map(b=>b.col_pct),backgroundColor:C.o},
    {label:'S&A%',data:us.map(b=>b.sa_pct),backgroundColor:C.a},
    {label:'Net%',data:us.map(b=>Math.max(0,b.net_pct)),backgroundColor:C.g}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>=2,color:'#fff',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'center',align:'center'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{stacked:true,ticks:{callback:v=>`${v}%`}}}}});

  /* net dist */
  const bk={'<0%':0,'0–10%':0,'10–20%':0,'20–30%':0,'>30%':0};
  a.forEach(b=>{if(b.net_pct<0)bk['<0%']++;else if(b.net_pct<10)bk['0–10%']++;else if(b.net_pct<20)bk['10–20%']++;else if(b.net_pct<30)bk['20–30%']++;else bk['>30%']++;});
  nc('cND',{type:'bar',data:{labels:Object.keys(bk),datasets:[{data:Object.values(bk),backgroundColor:[C.r,C.o,C.a,C.b,C.g],borderRadius:7}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},
      plugins:{legend:{display:false},datalabels:{color:'#374151',font:{weight:'700',size:12},formatter:v=>`${v} สาขา`,anchor:'end',align:'top',offset:2},
        tooltip:{callbacks:{label:c=>`${c.raw} สาขา`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{stepSize:1},max:Math.max(...Object.values(bk))+4}}}});

  /* top/bot */
  const s5=[...a].sort((x,y)=>y.net_pct-x.net_pct), t5=s5.slice(0,5), b5=[...s5].slice(-5).reverse();
  nc('cTB',{type:'bar',data:{labels:[...t5.map(b=>b.name),...b5.map(b=>b.name)],
    datasets:[{data:[...t5.map(b=>b.net_pct),...b5.map(b=>b.net_pct)],backgroundColor:[...t5.map(()=>C.g),...b5.map(b=>b.net_pct<0?C.r:C.o)],borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:45}},
      plugins:{legend:{display:false},datalabels:{color:ctx=>{const v=ctx.dataset.data[ctx.dataIndex];return v>=20?'#16a34a':v>=0?'#d97706':'#dc2626';},font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`NP%: ${c.raw}%`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`${v}%`:''}},y:{grid:{display:false}}}}});
}

/* ── ranking table ── */
let rkCol='sales', rkDir='desc';
function rkSort(col){if(rkCol===col)rkDir=rkDir==='desc'?'asc':'desc';else{rkCol=col;rkDir='desc';}document.getElementById('sCol').value=rkCol;document.getElementById('sDir').value=rkDir;renderRank();}
function renderRank(){
  const col=document.getElementById('sCol').value, dir=document.getElementById('sDir').value;
  const flt=document.getElementById('sFlt').value, q=document.getElementById('sQ').value.toLowerCase();
  rkCol=col; rkDir=dir;
  let d=[...ACTIVE];
  if(flt==='profit') d=d.filter(b=>b.net_profit>0);
  if(flt==='loss')   d=d.filter(b=>b.net_profit<=0);
  if(q) d=d.filter(b=>b.name.toLowerCase().includes(q)||b.code.toLowerCase().includes(q));
  d.sort((a,b)=>dir==='desc'?b[col]-a[col]:a[col]-b[col]);
  document.getElementById('rkBody').innerHTML=d.map((b,i)=>{
    const bw=Math.round(b.sales/maxSales*100), rk=i===0?'r1':i===1?'r2':i===2?'r3':'rnn';
    return `<tr>
      <td><div class="rnum ${rk}">${i+1}</div></td>
      <td><div class="tname">${b.name}</div><div class="tcode">${b.code}</div></td>
      <td><span class="chip cb" style="font-size:.67rem">${BM[b.code]||'—'}</span></td>
      <td class="tmono"><div class="brow">${fMx(b.sales)}<div class="mbg"><div class="mb" style="width:${bw}%;background:${b.net_profit>0?C.g:C.r}"></div></div></div></td>
      <td><span class="chip ${cc(b.gp_pct,62,65)}">${b.gp_pct}%</span></td>
      <td><span class="chip ${cc(b.op_profit_pct,20,30)}">${b.op_profit_pct}%</span></td>
      <td><span class="chip ${b.net_pct<0?'cr':cc(b.net_pct,15,25)}">${b.net_pct}%</span></td>
      <td><span class="chip ${b.cog_pct<=35?'cg':b.cog_pct<=39?'ca':'cr'}">${b.cog_pct}%</span></td>
      <td><span class="chip ${b.col_pct<=16?'cg':b.col_pct<=21?'ca':'cr'}">${b.col_pct}%</span></td>
      <td><span class="chip ${b.sa_pct<=14?'cg':b.sa_pct<=20?'ca':'cr'}">${b.sa_pct}%</span></td>
      <td><span class="chip ${b.rent_pct<=8?'cg':b.rent_pct<=15?'ca':'cr'}">${b.rent_pct}%</span></td>
      <td><span class="chip ${b.elec_pct<=3?'cg':b.elec_pct<=6?'ca':'cr'}">${b.elec_pct}%</span></td>
    </tr>`;
  }).join('');
}

/* ── compare ── */
let cRd=null, cBr=null;
function renderCmp(){
  const a=RAW[+document.getElementById('cpA').value], b=RAW[+document.getElementById('cpB').value];
  const tpl=(list)=>`<div class="mrow" style="font-weight:700;border-bottom:2px solid var(--bd)"><div class="mlbl">รายการ</div><div class="mval a">${a.name}</div><div class="mval b">${b.name}</div></div>${list.map(m=>`<div class="mrow"><div class="mlbl">${m.n}</div><div class="mval a">${m.va}</div><div class="mval b">${m.vb}</div></div>`).join('')}`;
  document.getElementById('cpL').innerHTML=tpl([
    {n:'ยอดขาย',va:fM(a.sales),vb:fM(b.sales)},{n:'Gross Profit',va:fM(a.gp1),vb:fM(b.gp1)},{n:'GP%',va:`${a.gp_pct}%`,vb:`${b.gp_pct}%`},
    {n:'Op Profit',va:fM(a.op_profit),vb:fM(b.op_profit)},{n:'Op%',va:`${a.op_profit_pct}%`,vb:`${b.op_profit_pct}%`},
    {n:'ค่าเช่า',va:fMx(a.rent),vb:fMx(b.rent)},{n:'ค่าเช่า%',va:`${a.rent_pct}%`,vb:`${b.rent_pct}%`}]);
  document.getElementById('cpR').innerHTML=tpl([
    {n:'Net Profit',va:fM(a.net_profit),vb:fM(b.net_profit)},{n:'Net%',va:`${a.net_pct}%`,vb:`${b.net_pct}%`},
    {n:'COG%',va:`${a.cog_pct}%`,vb:`${b.cog_pct}%`},{n:'COL%',va:`${a.col_pct}%`,vb:`${b.col_pct}%`},
    {n:'S&A%',va:`${a.sa_pct}%`,vb:`${b.sa_pct}%`},{n:'ค่าไฟ',va:fMx(a.elec),vb:fMx(b.elec)},{n:'ค่าไฟ%',va:`${a.elec_pct}%`,vb:`${b.elec_pct}%`}]);
  if(cRd)cRd.destroy();
  cRd=new Chart(document.getElementById('cRd'),{type:'radar',data:{labels:['GP%','Op%','NP%','ยอดขาย','แรงงาน'],datasets:[
    {label:a.name,data:[a.gp_pct,a.op_profit_pct,a.net_pct,a.sales/RAW[0].sales*100,100-a.col_pct*3],borderColor:C.b,backgroundColor:C.b+'22',borderWidth:2,pointRadius:4},
    {label:b.name,data:[b.gp_pct,b.op_profit_pct,b.net_pct,b.sales/RAW[0].sales*100,100-b.col_pct*3],borderColor:C.t,backgroundColor:C.t+'22',borderWidth:2,pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:false}},scales:{r:{ticks:{display:false},pointLabels:{font:{size:10}}}}}});
  if(cBr)cBr.destroy();
  cBr=new Chart(document.getElementById('cBr'),{type:'bar',data:{labels:['COG%','COL%','S&A%','GP%','Net%','ค่าเช่า%','ค่าไฟ%'],datasets:[
    {label:a.name,data:[a.cog_pct,a.col_pct,a.sa_pct,a.gp_pct,a.net_pct,a.rent_pct,a.elec_pct],backgroundColor:C.b,borderRadius:4},
    {label:b.name,data:[b.cog_pct,b.col_pct,b.sa_pct,b.gp_pct,b.net_pct,b.rent_pct,b.elec_pct],backgroundColor:C.t,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{color:'#374151',font:{weight:'700',size:8},formatter:v=>`${v}%`,anchor:'end',align:'top',offset:1},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`${v}%`}}}}});
}

/* ── detail ── */
function dtZoneChange(){
  const z=document.getElementById('dtZone').value;
  const sel=document.getElementById('dtSel');
  const cur=sel.value;
  while(sel.options.length) sel.remove(0);
  const pool=z==='all'?RAW:RAW.filter(b=>MGR[z]?.includes(b.code));
  pool.forEach(b=>sel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===cur)) sel.value=cur;
  renderDt();
}

const SCOL={sales:'#22c55e',cog:'#ef4444',other_cog:'#f97316',col:'#a855f7',sa:'#f59e0b',net:'#3b82f6'};
const SLBL={sales:'📦 Sales & Revenue',cog:'🔴 COG (Food Cost)',other_cog:'🟠 Other COG',col:'🟣 Labour (COL)',sa:'🟡 S&A Expenses',net:'🔵 Net Profit'};
function renderDt(){
  const code=document.getElementById('dtSel').value, d=DD[code];
  if(!d) return;
  const b=RAW.find(x=>x.code===code);
  document.getElementById('dtBadges').innerHTML=[
    `<span class="dlbadge" style="background:#f0fdf4;color:#16a34a">Sales ${fM(b.sales)}</span>`,
    `<span class="dlbadge" style="background:#eff4ff;color:#2563eb">GP% ${b.gp_pct}%</span>`,
    `<span class="dlbadge" style="background:#fdf4ff;color:#7c3aed">COL% ${b.col_pct}%</span>`,
    `<span class="dlbadge" style="background:#fffbeb;color:#d97706">S&A% ${b.sa_pct}%</span>`,
    `<span class="dlbadge" style="background:#fffbeb;color:#d97706">ค่าเช่า% ${b.rent_pct}%</span>`,
    `<span class="dlbadge" style="background:#fff7ed;color:#ea580c">ค่าไฟ% ${b.elec_pct}%</span>`,
    `<span class="dlbadge" style="background:${b.net_pct>=20?'#f0fdf4':'#fef2f2'};color:${b.net_pct>=20?'#16a34a':'#dc2626'}">Net% ${b.net_pct}%</span>`,
    `<span class="dlbadge" style="background:#f1f5f9;color:#64748b">เขต: ${BM[b.code]||'—'}</span>`,
  ].join('');
  const mxV=Math.max(...d.rows.map(r=>Math.abs(r.val)))||1;
  let html='', curS='';
  d.rows.forEach(r=>{
    if(r.section!==curS){
      curS=r.section;
      const col=SCOL[r.section]||'#64748b', lbl=SLBL[r.section]||r.section;
      html+=`<tr><td colspan="4" style="padding:6px 13px;font-size:.66rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${col};background:#f8fafc;border-top:2px solid ${col}40;border-bottom:1px solid var(--bd)">${lbl}</td></tr>`;
    }
    const bw=Math.round(Math.abs(r.val)/mxV*120);
    const col=SCOL[r.section]||'#64748b';
    const fv=r.val===0?'—':(r.val<0?'-':'')+'฿'+Math.abs(r.val).toLocaleString('en');
    const fp=r.pct===0?'—':(r.pct>0?'+':'')+r.pct+'%';
    const indent=r.type==='sub'||r.type==='adj'?'padding-left:26px':'padding-left:13px';
    const rs=r.type==='result'?'background:#f8fafc;font-weight:700;border-top:1px solid #cbd5e1':r.type==='header'?'background:#f1f5f9;font-weight:700':'';
    const it=r.type==='adj'?'color:#6b7280;font-style:italic':'';
    html+=`<tr style="border-bottom:1px solid #f0f2f5;${rs}">
      <td style="${indent};${it}">${r.type==='adj'?'↳ ':''}${r.label}</td>
      <td class="tmono" style="text-align:right;color:${r.val<0?'#dc2626':r.type==='result'?'#1a1d23':'#374151'}">${fv}</td>
      <td class="tmono" style="text-align:right;color:${r.val>0?'#16a34a':r.val<0?'#dc2626':'#9aa0ad'};font-weight:${r.val!==0?600:400}">${fp}</td>
      <td style="padding:7px 13px"><div style="height:6px;border-radius:3px;background:${col};width:${bw}px;max-width:120px;opacity:${r.type==='result'?.85:.4}"></div></td>
    </tr>`;
  });
  document.getElementById('dtBody').innerHTML=html;
}

/* ── managers ── */
function mgrStats(codes){
  const brs=RAW.filter(b=>codes.includes(b.code));
  if(!brs.length) return null;
  const s=sum(brs,'sales')||1;
  return {n:brs.length,sales:s,net:sum(brs,'net_profit'),op:sum(brs,'op_profit'),
    gp_pct:+(sum(brs,'gp1')/s*100).toFixed(1), op_profit_pct:+(sum(brs,'op_profit')/s*100).toFixed(1),
    net_pct:+(sum(brs,'net_profit')/s*100).toFixed(1), cog_pct:+(sum(brs,'cog')/s*100).toFixed(1),
    col_pct:+(sum(brs,'col')/s*100).toFixed(1), sa_pct:+(sum(brs,'sa')/s*100).toFixed(1),
    rent_pct:+(sum(brs,'rent')/s*100).toFixed(1), elec_pct:+(sum(brs,'elec')/s*100).toFixed(1)};
}
function renderMgr(){
  const sk=document.getElementById('mgSort').value, sd=document.getElementById('mgDir').value;
  const list=Object.entries(MGR).map(([name,codes])=>({name,codes,...mgrStats(codes)}));
  list.sort((a,b)=>sd==='desc'?b[sk]-a[sk]:a[sk]-b[sk]);
  document.getElementById('mgCards').innerHTML=list.map((m,i)=>{
    const rc=['#d97706','#64748b','#b45309'][i]||'#9aa0ad';
    const rb=['#fef3c7','#f1f5f9','#fef2f2'][i]||'#f8f9fb';
    return `<div class="mgr-card" style="border-top:3px solid ${m.net_pct>=20?C.g:m.net_pct>=10?C.a:C.r}">
      <div class="mgr-name"><span class="mgr-rank" style="background:${rb};color:${rc}">#${i+1}</span>${m.name}<span style="font-size:.7rem;color:#9aa0ad;font-weight:400">${m.n} สาขา</span></div>
      <div style="font-size:.8rem;margin-bottom:7px"><span style="color:var(--t2)">Sales: </span><strong>${fM(m.sales)}</strong>&nbsp;&nbsp;<span style="color:var(--t2)">Net: </span><strong style="color:${m.net_pct>=20?C.g:C.r}">${m.net_pct}%</strong></div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;font-size:.7rem">
        <span class="kchip ${cc(m.gp_pct,62,65)}">GP ${m.gp_pct}%</span>
        <span class="kchip ${cc(m.op_profit_pct,20,30)}">Op ${m.op_profit_pct}%</span>
        <span class="kchip ${m.rent_pct<=8?'cg':m.rent_pct<=15?'ca':'cr'}">เช่า ${m.rent_pct}%</span>
        <span class="kchip ${m.elec_pct<=3?'cg':m.elec_pct<=6?'ca':'cr'}">ไฟ ${m.elec_pct}%</span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('mgBody').innerHTML=list.map((m,i)=>`<tr>
    <td><div class="rnum ${i===0?'r1':i===1?'r2':i===2?'r3':'rnn'}">${i+1}</div></td>
    <td><strong>${m.name}</strong></td>
    <td class="tmono" style="font-size:.7rem">${m.codes.join(', ')}</td>
    <td class="tmono">${fM(m.sales)}</td>
    <td><span class="chip ${cc(m.gp_pct,62,65)}">${m.gp_pct}%</span></td>
    <td><span class="chip ${cc(m.op_profit_pct,20,30)}">${m.op_profit_pct}%</span></td>
    <td><span class="chip ${m.net_pct<0?'cr':cc(m.net_pct,15,25)}">${m.net_pct}%</span></td>
    <td><span class="chip ${m.cog_pct<=35?'cg':m.cog_pct<=39?'ca':'cr'}">${m.cog_pct}%</span></td>
    <td><span class="chip ${m.col_pct<=16?'cg':m.col_pct<=21?'ca':'cr'}">${m.col_pct}%</span></td>
    <td><span class="chip ${m.sa_pct<=14?'cg':m.sa_pct<=20?'ca':'cr'}">${m.sa_pct}%</span></td>
    <td><span class="chip ${m.rent_pct<=8?'cg':m.rent_pct<=15?'ca':'cr'}">${m.rent_pct}%</span></td>
    <td><span class="chip ${m.elec_pct<=3?'cg':m.elec_pct<=6?'ca':'cr'}">${m.elec_pct}%</span></td>
  </tr>`).join('');
}
function mgSortBy(col){const el=document.getElementById('mgSort'),de=document.getElementById('mgDir');if(el.value===col)de.value=de.value==='desc'?'asc':'desc';else{el.value=col;de.value='desc';}renderMgr();}

function renderMgZone(){
  const z=document.getElementById('mgZone').value, sk=document.getElementById('mgZoneSort').value;
  const brs=[...RAW.filter(b=>MGR[z]?.includes(b.code))].sort((a,b)=>b[sk]-a[sk]);
  document.getElementById('mgZoneTable').innerHTML=`<table><thead><tr>
    <th>#</th><th>สาขา</th><th>Sales</th><th>GP%</th><th>Op%</th><th>Net%</th><th>COG%</th><th>COL%</th><th>S&A%</th><th>ค่าเช่า%</th><th>ค่าไฟ%</th>
  </tr></thead><tbody>${brs.map((b,i)=>`<tr>
    <td><div class="rnum ${i===0?'r1':i===1?'r2':i===2?'r3':'rnn'}">${i+1}</div></td>
    <td><div class="tname">${b.name}</div><div class="tcode">${b.code}</div></td>
    <td class="tmono">${fMx(b.sales)}</td>
    <td><span class="chip ${cc(b.gp_pct,62,65)}">${b.gp_pct}%</span></td>
    <td><span class="chip ${cc(b.op_profit_pct,20,30)}">${b.op_profit_pct}%</span></td>
    <td><span class="chip ${b.net_pct<0?'cr':cc(b.net_pct,15,25)}">${b.net_pct}%</span></td>
    <td><span class="chip ${b.cog_pct<=35?'cg':b.cog_pct<=39?'ca':'cr'}">${b.cog_pct}%</span></td>
    <td><span class="chip ${b.col_pct<=16?'cg':b.col_pct<=21?'ca':'cr'}">${b.col_pct}%</span></td>
    <td><span class="chip ${b.sa_pct<=14?'cg':b.sa_pct<=20?'ca':'cr'}">${b.sa_pct}%</span></td>
    <td><span class="chip ${b.rent_pct<=8?'cg':b.rent_pct<=15?'ca':'cr'}">${b.rent_pct}%</span></td>
    <td><span class="chip ${b.elec_pct<=3?'cg':b.elec_pct<=6?'ca':'cr'}">${b.elec_pct}%</span></td>
  </tr>`).join('')}</tbody></table>`;
}


/* ── item cost ── */
(function(){
  const mgr=document.getElementById('mgZone');
  const icZ=document.getElementById('icZone');
  const icB=document.getElementById('icBranch');
  Object.keys(MGR).forEach(m=>icZ.appendChild(new Option(m,m)));
  RAW.forEach(b=>icB.appendChild(new Option(`${b.code} — ${b.name}`, b.code)));
})();

function icZoneChange(){
  const z=document.getElementById('icZone').value;
  const sel=document.getElementById('icBranch');
  const cur=sel.value;
  while(sel.options.length) sel.remove(0);
  const pool=z==='all'?RAW:RAW.filter(b=>MGR[z]?.includes(b.code));
  pool.forEach(b=>sel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===cur)) sel.value=cur;
  renderIC();
}

let icPieChart=null, icBarChart=null, icSortCol='cost', icSortDir='desc';
function icSort(col){
  if(icSortCol===col) icSortDir=icSortDir==='desc'?'asc':'desc';
  else{icSortCol=col; icSortDir=(col==='desc'||col==='cat')?'asc':'desc';}
  renderICTable();
}

function setStation(val,btn){
  const container=document.getElementById('icStationChips');
  container.dataset.active=val;
  container.querySelectorAll('.stchip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderICTable();
}

function renderIC(){
  const code=document.getElementById('icBranch').value;
  const d=IC[code];
  if(!d) return;
  const s=d.sales||1;
  const sm=d.summary;

  // KPI badges
  const cats=[['F&B','#22c55e','#f0fdf4'],['Packaging','#3b82f6','#eff4ff'],['Non-food','#f59e0b','#fffbeb'],['Other','#9aa0ad','#f1f5f9']];
  document.getElementById('icKPI').innerHTML=cats.map(([cat,color,bg])=>{
    const v=sm[cat]||{amt:0,pct:0};
    return `<div class="kpi"><div class="kpib" style="background:${color}"></div>
      <div class="kpil">${cat}</div>
      <div class="kpiv" style="font-size:1.2rem">฿${(v.amt/1e3).toFixed(0)}K</div>
      <div class="kpis">฿${v.amt.toLocaleString('en')}</div>
      <span class="kchip" style="background:${bg};color:${color}">${v.pct}% of Sales</span>
    </div>`;
  }).join('');

  // Donut
  const catOrder=['F&B','Packaging','Non-food','Other'];
  const catColors=['#22c55e','#3b82f6','#f59e0b','#9aa0ad'];
  if(icPieChart) icPieChart.destroy();
  icPieChart=new Chart(document.getElementById('icPie'),{
    type:'doughnut',
    data:{
      labels:catOrder.map(c=>`${c} ${(sm[c]?.pct||0)}%`),
      datasets:[{data:catOrder.map(c=>sm[c]?.amt||0),backgroundColor:catColors,borderWidth:2,borderColor:'#fff'}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      plugins:{datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,
        color:'#fff',font:{weight:'700',size:11},
        formatter:(v,ctx)=>{const tot=ctx.dataset.data.reduce((a,b)=>a+b,0); return tot?`${(v/tot*100).toFixed(1)}%`:'';}},
        legend:{position:'right',labels:{padding:12,font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:c=>`฿${c.raw.toLocaleString('en')} (${(c.raw/s*100).toFixed(2)}% of Sales)`}}}}
  });

  // Top 10 bar
  const top10=[...d.items].slice(0,10);
  document.getElementById('icTop10Sub').textContent=`Top 10 รายการ · ${d.items.length} รายการทั้งหมด`;
  if(icBarChart) icBarChart.destroy();
  const bColors={'F&B':'#22c55e','Packaging':'#3b82f6','Non-food':'#f59e0b','Other':'#9aa0ad'};
  icBarChart=new Chart(document.getElementById('icBar'),{
    type:'bar',
    data:{
      labels:top10.map(it=>it[1].substring(0,28)),
      datasets:[{
        data:top10.map(it=>it[3]),
        backgroundColor:top10.map(it=>bColors[it[2]]||'#9aa0ad'),
        borderRadius:4
      }]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:65}},
      plugins:{legend:{display:false},
        datalabels:{color:ctx=>bColors[top10[ctx.dataIndex]?.[2]]||'#374151',font:{weight:'700',size:9},
          formatter:v=>`฿${(v/1e3).toFixed(0)}K`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`฿${c.raw.toLocaleString('en')} (${(c.raw/s*100).toFixed(2)}% Sales)`}}},
      scales:{x:{ticks:{callback:v=>v>=1e3?`฿${(v/1e3).toFixed(0)}K`:''}},y:{ticks:{font:{size:9}},grid:{display:false}}}}
  });

  // Populate station filter chips
  const stContainer=document.getElementById('icStationChips');
  const stations=[...new Set(d.items.map(it=>it[6]).filter(Boolean))].sort();
  const activeSt=stContainer.dataset.active||'all';
  stContainer.innerHTML=`<button class="stchip ${activeSt==='all'?'active':''}" onclick="setStation('all',this)">ทั้งหมด</button>`
    +stations.map(s=>`<button class="stchip ${activeSt===s?'active':''}" onclick="setStation('${s.replace(/'/g,"\\'")}',this)">${s}</button>`).join('');
  renderICTable();
}

function renderICTable(){
  const code=document.getElementById('icBranch').value;
  const d=IC[code];
  if(!d) return;
  const s=d.sales||1;
  const cat=document.getElementById('icCat').value;
  const q=document.getElementById('icQ').value.toLowerCase();
  const bColors={'F&B':'cg','Packaging':'cb','Non-food':'ca','Other':'ct'};

  let items=[...d.items];
  if(cat!=='all') items=items.filter(it=>it[2]===cat);
  const stChips=document.getElementById('icStationChips');
  const st=stChips?stChips.dataset.active||'all':'all';
  if(st!=='all') items=items.filter(it=>it[6]===st);
  if(q) items=items.filter(it=>it[0].toLowerCase().includes(q)||it[1].toLowerCase().includes(q)||( it[6]&&it[6].toLowerCase().includes(q)));

  // Sort
  items.sort((a,b)=>{
    let va,vb;
    if(icSortCol==='cost'||icSortCol==='pct'){va=a[3];vb=b[3];}
    else if(icSortCol==='qty'){va=a[4]||0;vb=b[4]||0;}
    else if(icSortCol==='uc'){va=a[5]||0;vb=b[5]||0;}
    else if(icSortCol==='cat'){va=a[2];vb=b[2];}
    else if(icSortCol==='station'){va=a[6]||'';vb=b[6]||'';}
    else {va=a[1];vb=b[1];}
    if(typeof va==='string') return icSortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
    return icSortDir==='asc'?va-vb:vb-va;
  });

  document.getElementById('icCount').textContent=`${items.length} รายการ`;
  const maxCost=items.length?items[0][3]:1;
  document.getElementById('icBody').innerHTML=items.map((it,i)=>{
    const pct=(it[3]/s*100).toFixed(2);
    const bw=Math.round(it[3]/maxCost*100);
    const fmtQty=v=>v>=1000?`${(v/1000).toFixed(1)}K`:v%1===0?v.toLocaleString('en'):`${v.toFixed(2)}`;
    return `<tr>
      <td style="color:var(--t3);font-size:.72rem">${i+1}</td>
      <td><div style="font-size:.82rem;font-weight:500">${it[1]}</div><div style="font-size:.68rem;color:var(--t3);font-family:monospace">${it[0]}</div></td>
      <td><span class="chip ${bColors[it[2]]||'ct'}" style="font-size:.69rem">${it[2]}</span></td>
      <td style="font-size:.74rem;color:var(--t2)">${it[6]||'—'}</td>
      <td class="tmono" style="text-align:right;color:var(--t2)">${it[4]?fmtQty(it[4]):'—'}</td>
      <td class="tmono" style="text-align:right;color:var(--t2)">${it[5]?'฿'+it[5].toLocaleString('en'):'—'}</td>
      <td class="tmono" style="text-align:right;color:#1a1d23;font-weight:600">฿${it[3].toLocaleString('en')}</td>
      <td class="tmono" style="text-align:right;color:${it[2]==='F&B'?'#16a34a':it[2]==='Packaging'?'#2563eb':'#d97706'};font-weight:600">${pct}%</td>
      <td style="padding:8px 11px"><div style="height:6px;border-radius:3px;background:${{'F&B':'#22c55e','Packaging':'#3b82f6','Non-food':'#f59e0b','Other':'#9aa0ad'}[it[2]]||'#9aa0ad'};width:${bw}%;max-width:100px;opacity:.6"></div></td>
    </tr>`;
  }).join('');
}


/* ── monthly compare ── */
(function(){
  const mxZ=document.getElementById('mxZone');
  const mxB=document.getElementById('mxBranch');
  Object.keys(MGR).forEach(m=>mxZ.appendChild(new Option(m,m)));
  // Use first month's RAW to populate branches
  const firstRaw = MONTHS[Object.keys(MONTHS)[0]].raw;
  firstRaw.forEach(b=>mxB.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
})();

function mxZoneChange(){
  const z=document.getElementById('mxZone').value;
  const sel=document.getElementById('mxBranch');
  const cur=sel.value;
  const firstRaw=MONTHS[Object.keys(MONTHS)[0]].raw;
  while(sel.options.length) sel.remove(0);
  const pool=z==='all'?firstRaw:firstRaw.filter(b=>MGR[z]?.includes(b.code));
  pool.forEach(b=>sel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===cur)) sel.value=cur;
  renderMXBranch();
}

function renderMX(){
  const mode=document.getElementById('mxMode').value;
  document.getElementById('mxBranchPanel').style.display=mode==='branch'?'':'none';
  document.getElementById('mxKPIPanel').style.display=mode==='kpi'?'':'none';
  if(mode==='branch') renderMXBranch();
  else renderMXKPI();
}

let mxBrCh=null, mxBrAllCh=null, mxKpiSalesCh=null, mxKpiNetCh=null;

function renderMXBranch(){
  const code=document.getElementById('mxBranch').value;
  const metric=document.getElementById('mxMetric').value;
  const months=Object.keys(MONTHS).sort();
  if(!months.length) return;

  const labels=months.map(k=>MONTHS[k].label);
  const metricLabels={sales:'ยอดขาย',gp_pct:'GP%',net_pct:'Net%',op_profit_pct:'Op%',
    cog_pct:'COG%',col_pct:'COL%',sa_pct:'S&A%',rent_pct:'ค่าเช่า%',elec_pct:'ค่าไฟ%'};
  const isPct=metric!=='sales';

  // Get branch data per month
  const getData=m=>MONTHS[m].raw.find(b=>b.code===code);
  const values=months.map(m=>{const b=getData(m); return b?+(b[metric]).toFixed(isPct?1:0):null;});
  const branchName=getData(months[0])?.name||code;

  document.getElementById('mxBrTitle').textContent=`${branchName} — ${metricLabels[metric]} รายเดือน`;
  document.getElementById('mxBrSub').textContent=months.length+' เดือน';

  if(mxBrCh) mxBrCh.destroy();
  mxBrCh=new Chart(document.getElementById('mxBrChart'),{
    type:'bar',
    data:{labels,datasets:[{
      label:metricLabels[metric],
      data:values,
      backgroundColor:months.map((_,i)=>i===months.indexOf(curMonth)?C.b:C.b+'88'),
      borderRadius:6
    }]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},
        datalabels:{color:'#374151',font:{weight:'700',size:10},
          formatter:v=>v===null?'':isPct?`${v}%`:`฿${(v/1e6).toFixed(2)}M`,anchor:'end',align:'top',offset:2},
        tooltip:{callbacks:{label:c=>isPct?`${c.raw}%`:`฿${(c.raw/1e6).toFixed(2)}M`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>isPct?`${v}%`:`฿${(v/1e6).toFixed(1)}M`}}}}
  });

  // All metrics radar/bar
  const allMetrics=['gp_pct','net_pct','cog_pct','col_pct','sa_pct','rent_pct'];
  const allLabels=['GP%','Net%','COG%','COL%','S&A%','ค่าเช่า%'];
  const colors=[C.b,C.g,C.t,C.p,C.o,C.a,C.r];
  const datasets=months.map((m,i)=>{
    const b=MONTHS[m].raw.find(x=>x.code===code);
    return {label:MONTHS[m].label,
      data:allMetrics.map(k=>b?+b[k].toFixed(1):null),
      backgroundColor:colors[i]+'33',borderColor:colors[i],borderWidth:2,pointRadius:3};
  });

  document.getElementById('mxBrAllSub').textContent=branchName+' · '+months.length+' เดือน';
  if(mxBrAllCh) mxBrAllCh.destroy();
  mxBrAllCh=new Chart(document.getElementById('mxBrAllChart'),{
    type:'radar',data:{labels:allLabels,datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:10}}},datalabels:{display:false}},
      scales:{r:{ticks:{display:false,backdropColor:'transparent'},pointLabels:{font:{size:10}}}}}
  });

  // Table
  const metrics=['sales','gp_pct','op_profit_pct','net_pct','cog_pct','col_pct','sa_pct','rent_pct','elec_pct'];
  const mLabels=['Sales','GP%','Op%','Net%','COG%','COL%','S&A%','ค่าเช่า%','ค่าไฟ%'];
  document.getElementById('mxTHead').innerHTML='<th>Metric</th>'+months.map(m=>`<th>${MONTHS[m].label}</th>`).join('');
  document.getElementById('mxTBody').innerHTML=metrics.map((mk,ri)=>{
    const isPctRow=mk!=='sales';
    const vals=months.map(m=>{const b=MONTHS[m].raw.find(x=>x.code===code); return b?b[mk]:null;});
    const cells=vals.map((v,ci)=>{
      if(v===null) return '<td style="color:var(--t3)">—</td>';
      const disp=isPctRow?`${v.toFixed(1)}%`:`฿${(v/1e6).toFixed(2)}M`;
      // color change vs prev month
      const prev=ci>0?vals[ci-1]:null;
      let color='';
      if(prev!==null&&v!==null){
        const delta=v-prev;
        const good=mk==='sales'||mk==='gp_pct'||mk==='net_pct'||mk==='op_profit_pct';
        color=delta===0?'':((good&&delta>0)||(!good&&delta<0))?'color:#16a34a':'color:#dc2626';
        const arrow=delta>0?'▲':'▼';
        const chg=isPctRow?`${Math.abs(delta).toFixed(1)}%`:`฿${(Math.abs(delta)/1e6).toFixed(2)}M`;
        return `<td class="tmono" style="${color}">${disp} <span style="font-size:.68rem">${arrow}${chg}</span></td>`;
      }
      return `<td class="tmono">${disp}</td>`;
    }).join('');
    return `<tr><td style="font-weight:600;font-size:.8rem">${mLabels[ri]}</td>${cells}</tr>`;
  }).join('');
}

function renderMXKPI(){
  const months=Object.keys(MONTHS).sort();
  const labels=months.map(k=>MONTHS[k].label);
  const totalSales=months.map(m=>+(MONTHS[m].raw.reduce((s,b)=>s+b.sales,0)/1e6).toFixed(2));
  const avgNet=months.map(m=>{
    const r=MONTHS[m].raw; const s=r.reduce((a,b)=>a+b.sales,0)||1;
    return +(r.reduce((a,b)=>a+b.net_profit,0)/s*100).toFixed(1);
  });

  if(mxKpiSalesCh) mxKpiSalesCh.destroy();
  mxKpiSalesCh=new Chart(document.getElementById('mxKpiSales'),{
    type:'bar',data:{labels,datasets:[{label:'Sales (฿M)',data:totalSales,backgroundColor:C.b+'cc',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},datalabels:{color:'#2563eb',font:{weight:'700',size:11},formatter:v=>`฿${v}M`,anchor:'end',align:'top',offset:2}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`฿${v}M`}}}}
  });
  if(mxKpiNetCh) mxKpiNetCh.destroy();
  mxKpiNetCh=new Chart(document.getElementById('mxKpiNet'),{
    type:'line',data:{labels,datasets:[{label:'Net% เฉลี่ย',data:avgNet,borderColor:C.p,backgroundColor:C.p+'22',borderWidth:2.5,pointRadius:5,fill:true,tension:.3}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},datalabels:{color:C.p,font:{weight:'700',size:11},formatter:v=>`${v}%`,anchor:'top',align:'top',offset:4}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`${v}%`}}}}
  });

  // KPI comparison cards per month
  document.getElementById('mxKpiCards').innerHTML=months.map(m=>{
    const r=MONTHS[m].raw, s=r.reduce((a,b)=>a+b.sales,0)||1;
    const net=r.reduce((a,b)=>a+b.net_profit,0)/s*100;
    const gp=r.reduce((a,b)=>a+b.gp1,0)/s*100;
    return `<div class="kpi"><div class="kpib" style="background:${C.b}"></div>
      <div class="kpil">${MONTHS[m].label}</div>
      <div class="kpiv">฿${(s/1e6).toFixed(1)}M</div>
      <div class="kpis">${r.length} สาขา</div>
      <span class="kchip ${net>=20?'cg':net>=10?'ca':'cr'}">Net ${net.toFixed(1)}%</span>
      <span class="kchip cb" style="margin-left:4px">GP ${gp.toFixed(1)}%</span>
    </div>`;
  }).join('');
}


/* ── INIT ── */
renderKPI();
renderCharts();
renderRank();
renderCmp();
renderDt();
renderMgr();
renderMgZone();
renderIC();
renderMXKPI();



} // end initDashboard
