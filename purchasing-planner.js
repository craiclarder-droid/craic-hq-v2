(function(){
"use strict";
function init(){if(!Array.isArray(db.plannerEvents))db.plannerEvents=[];if(!Array.isArray(db.plannerIncoming))db.plannerIncoming=[];}
function num(v){return Math.max(0,Number(v)||0)}
function id(){return "PP-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
function qtyMap(obj){const out={};activeBlends().forEach(b=>out[b.id]=num(obj?.[b.id]));return out}
function forecast(){const out=qtyMap({});db.plannerEvents.filter(e=>e.status!=="Cancelled").forEach(e=>{for(const b of activeBlends())out[b.id]+=num(e.quantities?.[b.id])});return out}
function proposed(){const demand=forecast(),out={};activeBlends().forEach(b=>{const available=num(stock(b.id)?.qty),reserve=num(db.plannerReserve?.[b.id]);out[b.id]=Math.max(0,Math.ceil(demand[b.id]+reserve-available))});return out}
function incoming(rid){return db.plannerIncoming.filter(x=>x.resourceId===rid&&x.status==="Ordered").reduce((n,x)=>n+num(x.qty),0)}
function needs(quantities){const result={};for(const b of activeBlends()){const count=num(quantities[b.id]);for(const [rid,per] of Object.entries(db.recipes[b.id]||{}))result[rid]=(result[rid]||0)+count*num(per);for(const pkg of packagingRequiredForPouches(count))result[pkg.resourceId]=(result[pkg.resourceId]||0)+num(pkg.qty)}return result}
function formatQ(n){return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}
function plannerExtras(){
init();const f=forecast(),suggest=proposed(),plan=currentPlan(),planQ={};if(plan)for(const i of plan.items)if(i.status!=="Cancelled"&&i.status!=="Completed")planQ[i.blendId]=(planQ[i.blendId]||0)+num(i.plannedQty);
const req=needs(planQ),list=Object.entries(req).map(([rid,needed])=>{const r=resource(rid),have=num(r?.qty),onOrder=incoming(rid);return {rid,r,needed,have,onOrder,short:Math.max(0,needed-have-onOrder),ready:Math.max(0,needed-have)}});
const currency=n=>"£"+n.toFixed(2);
const estimated=list.reduce((sum,x)=>sum+x.short*num(x.r?.costPerUnit),0);
const eventRows=db.plannerEvents.map(e=>'<tr><td>'+esc(e.name)+'</td><td>'+esc(e.date||"")+'</td><td>'+esc(e.type)+'</td><td>'+activeBlends().filter(b=>num(e.quantities?.[b.id])).map(b=>esc(b.name)+": "+num(e.quantities[b.id])).join(", ")+'</td><td><button class="secondary" onclick="ppRemoveEvent(\''+e.id+'\')">Remove</button></td></tr>').join("");
const incomingRows=db.plannerIncoming.map(x=>'<tr><td>'+esc(resource(x.resourceId)?.name||x.resourceId)+'</td><td>'+formatQ(x.qty)+' '+esc(resource(x.resourceId)?.unit||"")+'</td><td>'+esc(x.expected||"")+'</td><td>'+esc(x.status)+'</td><td><button class="secondary" onclick="ppRemoveIncoming(\''+x.id+'\')">Remove</button></td></tr>').join("");
const html=`
<section class="card"><h2>Upcoming Markets & Commitments</h2><p class="muted">Forecast quantities by blend. These are estimates, not guaranteed sales. Wholesale Manager currently stores historical order totals, not blend-by-blend outstanding commitments, so add upcoming wholesale commitments here until that link is available.</p>
<label>Event / customer</label><input id="ppName" placeholder="e.g. Paisley Saturday / Bickets order">
<div class="row"><div><label>Type</label><select id="ppType"><option>Market forecast</option><option>Wholesale commitment</option><option>Other commitment</option></select></div><div><label>Date</label><input id="ppDate" type="date" value="${today()}"></div></div>
<div class="grid">${activeBlends().map(b=>'<div><label>'+esc(b.name)+' pouches</label><input id="ppe-'+b.id+'" type="number" min="0" step="1" value="0"></div>').join("")}</div>
<button onclick="ppAddEvent()">Add upcoming commitment</button>
${db.plannerEvents.length?'<table><tr><th>Event</th><th>Date</th><th>Type</th><th>Blend quantities</th><th></th></tr>'+eventRows+'</table>':"<p>No upcoming commitments entered.</p>"}
</section>
<section class="card"><h2>Suggested Production</h2><p class="muted">Based on upcoming demand + your minimum reserve − finished stock. Adjust the reserve to suit how much stock you want left after commitments. Suggestions do not change inventory.</p>
<table><tr><th>Blend</th><th>In stock</th><th>Upcoming</th><th>Reserve</th><th>Make</th></tr>
${activeBlends().map(b=>'<tr><td>'+esc(b.name)+'</td><td>'+num(stock(b.id)?.qty)+'</td><td>'+f[b.id]+'</td><td><input id="ppr-'+b.id+'" type="number" min="0" step="1" value="'+num(db.plannerReserve?.[b.id])+'"></td><td><b>'+suggest[b.id]+'</b></td></tr>').join("")}</table>
<div class="actions"><button onclick="ppSaveReserves()">Save reserve levels</button><button class="secondary" onclick="ppApplySuggested()">Put suggested quantities in production plan</button></div>
<p class="muted">After applying, review and save the existing production plan above. Your batch records are not created until you actually produce.</p></section>
<section class="card"><h2>Ingredients Already Ordered</h2><p class="muted">Only physical deliveries update ingredient stock. Items recorded here are incoming, never available for today's production. Once received through Deliveries, remove the corresponding incoming record to avoid double counting.</p>
<div class="row"><div><label>Resource</label><select id="ppIncomingResource">${options(activeResources(),"id","name")}</select></div><div><label>Quantity (resource unit)</label><input id="ppIncomingQty" type="number" min="0" step="0.01"></div><div><label>Expected arrival</label><input id="ppIncomingDate" type="date"></div></div>
<button onclick="ppAddIncoming()">Record incoming order</button>
${db.plannerIncoming.length?'<table><tr><th>Item</th><th>Qty</th><th>Due</th><th>Status</th><th></th></tr>'+incomingRows+'</table>':"<p>No incoming ingredient or packaging orders recorded.</p>"}
</section>
<section class="card"><h2>Purchasing List for Saved Production Plan</h2><p class="muted">Requirements combine every unfinished blend in the saved plan. Incoming orders reduce the amount to purchase, but do not make production possible until delivered.</p>
${plan?'<p><b>Estimated additional ingredient/packaging cost:</b> '+currency(estimated)+'</p><p class="muted">This estimate uses the cost per unit entered in Ingredients & Packaging, not supplier pack prices or minimum order quantities.</p><table><tr><th>Item</th><th>Needed</th><th>Physical</th><th>On order</th><th>Buy</th></tr>'+list.map(x=>'<tr><td>'+esc(x.r?.name||x.rid)+'</td><td>'+formatQ(x.needed)+'</td><td>'+formatQ(x.have)+'</td><td>'+formatQ(x.onOrder)+'</td><td class="'+(x.short?'bad':'good')+'">'+formatQ(x.short)+' '+esc(x.r?.unit||"")+'</td></tr>').join("")+'</table><button onclick="ppCopyShopping()">Copy shopping list</button>':'<p>Save a production plan above to calculate what you need to purchase.</p>'}
</section>`;
app.insertAdjacentHTML("beforeend",html);
}
const original=plannerView;
plannerView=function(){original();plannerExtras()};
window.ppAddEvent=function(){init();const name=document.getElementById("ppName").value.trim();if(!name)return alert("Enter an event or customer name.");const quantities={};activeBlends().forEach(b=>quantities[b.id]=Math.floor(num(document.getElementById("ppe-"+b.id).value)));if(!Object.values(quantities).some(Boolean))return alert("Enter expected quantities for at least one blend.");db.plannerEvents.push({id:id(),name,type:document.getElementById("ppType").value,date:document.getElementById("ppDate").value,quantities,status:"Upcoming"});save();render()};
window.ppRemoveEvent=function(x){if(!confirm("Remove this commitment?"))return;db.plannerEvents=db.plannerEvents.filter(e=>e.id!==x);save();render()};
window.ppSaveReserves=function(){db.plannerReserve=db.plannerReserve||{};activeBlends().forEach(b=>db.plannerReserve[b.id]=Math.floor(num(document.getElementById("ppr-"+b.id).value)));save();render()};
window.ppApplySuggested=function(){const suggest=proposed();activeBlends().forEach(b=>{const el=document.getElementById("pq-"+b.id);if(el)el.value=suggest[b.id]});document.getElementById("planName").scrollIntoView({behavior:"smooth"});alert("Suggested quantities entered above. Review them, then press Save / Update Plan.");};
window.ppAddIncoming=function(){init();const qty=num(document.getElementById("ppIncomingQty").value);if(!qty)return alert("Enter a quantity.");db.plannerIncoming.push({id:id(),resourceId:document.getElementById("ppIncomingResource").value,qty,expected:document.getElementById("ppIncomingDate").value,status:"Ordered"});save();render()};
window.ppRemoveIncoming=function(x){if(!confirm("Remove this incoming order? If received, make sure it was recorded under Deliveries."))return;db.plannerIncoming=db.plannerIncoming.filter(e=>e.id!==x);save();render()};
window.ppCopyShopping=function(){const p=currentPlan();if(!p)return;const q={};p.items.filter(i=>i.status!=="Cancelled"&&i.status!=="Completed").forEach(i=>q[i.blendId]=(q[i.blendId]||0)+num(i.plannedQty));const rows=Object.entries(needs(q)).map(([rid,n])=>{const r=resource(rid),short=Math.max(0,n-num(r?.qty)-incoming(rid));return short>0?(r?.name||rid)+": "+formatQ(short)+" "+(r?.unit||""):""}).filter(Boolean);const value=rows.length?rows.join("\n"):"No additional purchases required.";if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>alert("Shopping list copied.")).catch(()=>prompt("Copy shopping list:",value));else prompt("Copy shopping list:",value)};
})();