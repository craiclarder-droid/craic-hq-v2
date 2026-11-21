/* Read-only production analytics; uses existing productionRuns, never mutates saved records. */
(function(){
"use strict";
const original=reportsView;
const ranges=[30,90,180,365,0];
let selected=1,target=2100;
function isoDaysAgo(n){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-n+1);return d.toISOString().slice(0,10);}
function analytics(){
 const root=document.getElementById("productionAnalytics");if(!root)return;
 const days=ranges[selected],start=days?isoDaysAgo(days):"0000-00-00";
 const runs=(db.productionRuns||[]).filter(r=>!r.opening&&r.completedBy!=="Opening Balance"&&r.date>=start&&Number(r.qty)>0);
 const totals=new Map();let sum=0;
 runs.forEach(r=>{const n=Number(r.qty);totals.set(r.blendId,(totals.get(r.blendId)||0)+n);sum+=n;});
 const ordered=(db.blends||[]).map(b=>({name:b.name,id:b.id,qty:totals.get(b.id)||0})).sort((a,b)=>b.qty-a.qty);
 const max=Math.max(1,...ordered.map(x=>x.qty));
 const labels=["30 days","90 days","6 months","12 months","All time"];
 const chunks=ordered.map(x=>({name:x.name,qty:x.qty,share:sum?x.qty/sum:0,plan:sum?Math.round((target*x.qty/sum)/5)*5:0}));
 const monthMap=new Map();
 runs.forEach(r=>{const k=String(r.date).slice(0,7);monthMap.set(k,(monthMap.get(k)||0)+Number(r.qty));});
 const months=[...monthMap].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
 const monthMax=Math.max(1,...months.map(x=>x[1]));
 root.innerHTML='<h2>Production Analytics</h2><p>Actual completed production batches only. Opening finished stock is excluded.</p>'+
 '<label for="productionRange">Time range: <strong>'+labels[selected]+'</strong></label>'+
 '<input id="productionRange" type="range" min="0" max="4" step="1" value="'+selected+'" style="width:100%">'+
 '<div style="display:flex;justify-content:space-between;font-size:12px"><span>30d</span><span>90d</span><span>6m</span><span>12m</span><span>All</span></div>'+
 '<div class="metric-row"><span>Total pouches made</span><b>'+fmt(sum)+'</b></div>'+
 '<div class="metric-row"><span>Production batches</span><b>'+fmt(runs.length)+'</b></div>'+
 '<h3>Production by blend</h3>'+
 (sum?chunks.map(x=>'<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;gap:10px"><span>'+esc(x.name)+'</span><b>'+fmt(x.qty)+' ('+(x.share*100).toFixed(1)+'%)</b></div><div style="height:12px;background:#d9d9d9;border-radius:8px;overflow:hidden"><div style="height:100%;width:'+(100*x.qty/max)+'%;background:#4b947b"></div></div></div>').join(""):'<p>No completed production batches in this period.</p>')+
 '<h3>Production over time</h3>'+
 (months.length?months.map(([month,n])=>'<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="min-width:65px;font-size:12px">'+esc(month)+'</span><div style="flex:1;background:#ddd;height:13px;border-radius:6px;overflow:hidden"><div style="height:100%;background:#4b947b;width:'+(100*n/monthMax)+'%"></div></div><b style="min-width:40px;text-align:right">'+fmt(n)+'</b></div>').join(""):'<p>No production recorded in this range.</p>')+
 '<h3>Apply production mix to stock target</h3><p>Planning estimate based on what was made, not what sold. Adjust using sales and existing stock before ordering.</p>'+
 '<label for="productionTarget">Target pouches</label><input type="number" id="productionTarget" min="1" step="1" value="'+target+'">'+
 (sum?'<table><tr><th>Blend</th><th>Suggested pouches</th></tr>'+chunks.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+fmt(x.plan)+'</td></tr>').join("")+'</table><p>Rounded to multiples of 5; total may differ slightly from target.</p>':'<p>Make some production batches before calculating a mix.</p>');
 root.querySelector("#productionRange").addEventListener("input",e=>{selected=Number(e.target.value);analytics();});
 root.querySelector("#productionTarget").addEventListener("change",e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>0)target=n;analytics();});
}
reportsView=function(){original();const root=document.getElementById("app");if(!root)return;const section=document.createElement("section");section.className="card";section.id="productionAnalytics";const first=root.querySelector("section.card");if(first)first.insertAdjacentElement("afterend",section);else root.prepend(section);analytics();};
})();