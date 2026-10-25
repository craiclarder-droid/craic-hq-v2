(function(){
"use strict";
function batchSum(bid){return db.productionRuns.filter(r=>r.blendId===bid).reduce((n,r)=>n+Math.max(0,Number(r.remaining)||0),0)}
function mismatch(){return db.stock.filter(s=>Math.abs(batchSum(s.blendId)-Number(s.qty||0))>0.0001)}
function reconcilePanel(){
const issues=mismatch();const lastTake=(db.finishedStocktakes||[]).slice(-1)[0];
const card='<section class="card"><h2>Batch Traceability Check</h2><p class="muted">Physical stock totals are the source of truth. Historical batch remaining figures may be wrong because sales were not recorded. Do not guess which batch a pouch belongs to.</p>'+
(issues.length?'<div class="notice"><b>Batch balances need reconciliation for '+issues.length+' blends.</b> Enter the actual number of pouches physically present from each batch. The total must match your stocktake. Production history is preserved.</div>':'<p class="good">All finished batch balances match current stock totals.</p>')+
issues.map(s=>{const runs=db.productionRuns.filter(r=>r.blendId===s.blendId);return '<details><summary><b>'+esc(blend(s.blendId)?.name||s.blendId)+'</b> · physical '+s.qty+' · batch records '+batchSum(s.blendId)+'</summary><p>Count by printed batch code. If you cannot identify the batch codes, leave this unresolved; do not allocate stock arbitrarily.</p><table><tr><th>Batch</th><th>Made</th><th>Current recorded</th><th>Actual remaining</th></tr>'+runs.map(r=>'<tr><td>'+esc(r.batchCode)+'</td><td>'+Number(r.qty||0)+'</td><td>'+Number(r.remaining||0)+'</td><td><input type="number" min="0" max="'+Number(r.qty||0)+'" step="1" id="br-'+r.id+'" value="'+Number(r.remaining||0)+'"></td></tr>').join('')+'</table><button onclick="reconcileFinishedBatches(\''+s.blendId+'\')">Confirm batch counts</button></details>'}).join('')+
'<p class="muted">Last physical stocktake: '+(lastTake?esc(lastTake.date.slice(0,10)):'none')+'. Batch reconciliation is separate from the stocktake so old production and HACCP records stay intact.</p></section>';
app.insertAdjacentHTML("beforeend",card);
const opening=[...app.querySelectorAll("section.card")].find(el=>el.querySelector("h2")?.textContent==="Add Opening Finished Stock");if(opening)opening.style.display="none";
}
const oldStock=stockView;
stockView=function(){oldStock();reconcilePanel()};
window.reconcileFinishedBatches=function(bid){
const runs=db.productionRuns.filter(r=>r.blendId===bid),updates=[];let sum=0;
for(const r of runs){const el=document.getElementById("br-"+r.id);if(!el)return alert("Missing batch input.");const value=Number(el.value);if(el.value.trim()===""||!Number.isInteger(value)||value<0||value>Number(r.qty||0))return alert("Enter a valid physical count for each batch.");updates.push({r,value});sum+=value}
const physical=Number(stock(bid)?.qty||0);if(sum!==physical)return alert("Batch counts total "+sum+" but physical stock is "+physical+". Please identify all batch codes or leave unresolved. Nothing saved.");
if(!confirm("Confirm physical batch quantities for "+blend(bid).name+"? This updates remaining balances, NOT original production quantities."))return;
for(const x of updates){const before=Number(x.r.remaining||0);x.r.remaining=x.value;db.movements.push({id:uid("MOV"),date:today(),type:"FINISHED BATCH RECONCILIATION",blendId:bid,batchCode:x.r.batchCode,qty:x.value-before,notes:"Physical batch count; previous "+before+"; actual "+x.value})}
db.finishedBatchReconciliations=db.finishedBatchReconciliations||[];db.finishedBatchReconciliations.push({id:uid("FBR"),date:new Date().toISOString(),blendId:bid,counts:updates.map(x=>({batchId:x.r.id,qty:x.value}))});logActivity("Batch balances reconciled",blend(bid).name+" "+sum+" pouches");save();render();
};
const oldOrders=ordersView;
ordersView=function(){oldOrders();const issues=mismatch();if(issues.length){app.insertAdjacentHTML("afterbegin",'<section class="card"><div class="notice"><b>Batch reconciliation required.</b> Some finished-batch balances disagree with physical stock. Complete batch counts under Finished Stock before using batch-based order deduction for affected blends.</div></section>')}};
const originalOrder=window.completeOrder;
window.completeOrder=function(){const el=document.getElementById("oBatch"),run=db.productionRuns.find(r=>r.id===el?.value);if(run&&mismatch().some(s=>s.blendId===run.blendId))return alert("Batch stock is not reconciled for "+blend(run.blendId).name+". Go to Finished Stock and confirm the physical counts by batch before completing an order.");return originalOrder()};
const oldDashboard=dashboard;
dashboard=function(){oldDashboard();const issues=mismatch();if(issues.length)app.insertAdjacentHTML("beforeend",'<section class="card"><p><b>Traceability check:</b> '+issues.length+' blend(s) have batch balances that do not match current finished stock. Review under Finished Stock.</p></section>')};
})();