(function(){
"use strict";
function init(){if(!Array.isArray(db.finishedStocktakes))db.finishedStocktakes=[]}
function last(){init();return db.finishedStocktakes[db.finishedStocktakes.length-1]||null}
function renderTake(){
init();
const previous=last();
const fields=activeBlends().map(b=>'<div><label>'+esc(b.name)+'</label><input type="number" min="0" step="1" id="fst-'+b.id+'" value="'+Math.max(0,Number(stock(b.id)?.qty||0))+'"></div>').join("");
const panel='<section class="card"><h2>Physical Finished Stocktake</h2><p>Count every finished pouch on your shelves and enter the actual quantity. This replaces the current finished-stock balances; it does not change ingredient stock, recipes, production logs or HACCP records.</p><p class="muted">Last physical count: '+(previous?esc(previous.date):'Not yet recorded')+'. Sales and samples are not automatically deducted between counts, so figures become estimates after stock leaves the business.</p><div class="grid">'+fields+'</div><label>Notes (optional)</label><input id="fstNotes" placeholder="e.g. Sunday count after Paisley market"><div class="actions"><button onclick="fstSave()">Save physical stocktake</button></div></section>';
app.insertAdjacentHTML("afterbegin",panel);
}
const old=stockView;
stockView=function(){old();renderTake();const opening=[...app.querySelectorAll("section.card")].find(el=>el.querySelector("h2")?.textContent==="Add Opening Finished Stock");if(opening)opening.style.display="none";const legacy=app.querySelectorAll("table tr");for(const tr of legacy){if(tr.cells?.[0]?.textContent?.trim()==="Test")tr.style.display="none"}const note=document.createElement("section");note.className="card";note.innerHTML="<h2>Batch traceability</h2><p>Physical stock has been reconciled, but historical finished-batch remaining figures still reflect unrecorded sales. Do not use those remaining figures as physical stock or assume a particular batch is still available. Original production and HACCP records are preserved.</p>";app.appendChild(note)};
window.fstSave=function(){
init();const counts={},changes=[];for(const b of activeBlends()){const input=document.getElementById("fst-"+b.id);if(!input||input.value.trim()===""||!Number.isInteger(Number(input.value))||Number(input.value)<0)return alert("Enter a whole-number physical count for every blend.");const actual=Number(input.value),before=Number(stock(b.id)?.qty||0);counts[b.id]=actual;changes.push({blendId:b.id,before,actual,difference:actual-before})}
const detail=changes.map(x=>blend(x.blendId).name+": "+x.before+" → "+x.actual).join("\n");
if(!confirm("Confirm these physical counts?\n\n"+detail+"\n\nExisting production and HACCP records will be preserved."))return;
const entry={id:uid("FST"),date:new Date().toISOString(),notes:document.getElementById("fstNotes").value.trim(),changes};
for(const change of changes){stock(change.blendId).qty=change.actual;db.movements.push({id:uid("MOV"),date:today(),type:"FINISHED STOCKTAKE ADJUSTMENT",blendId:change.blendId,resourceId:"",qty:change.difference,notes:"Physical finished stock reconciliation "+entry.id+"; previous "+change.before+"; actual "+change.actual})}
db.finishedStocktakes.push(entry);logActivity("Finished stocktake",changes.map(x=>blend(x.blendId).name+" "+x.actual).join(", "));save();render();
};
const originalDashboard=dashboard;
dashboard=function(){originalDashboard();const take=last();const box=[...document.querySelectorAll("#app .card .muted")].find(el=>el.textContent.includes("Current finished stock (estimated)"));if(box){box.textContent=take?"Current finished stock (estimate) · last counted "+take.date.slice(0,10):"Current finished stock (estimate) · no physical count yet"}};
})();