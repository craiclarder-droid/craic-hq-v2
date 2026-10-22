/* Craic HQ Wholesale Manager — additive; existing production and stock untouched. */
(function(){
"use strict";
const cols=["shopName","location","contactName","contactMethod","contactDetails","firstContactDate","samplesGiven","dateSamplesGiven","firstOrderDate","lastOrderDate","orderFrequency","avgOrderSize","bestSeller","lastContactDate","nextFollowUpDate","status","monthlyValue","notes"];
const heads=["Shop Name","Location","Contact Name","Contact Method","Contact Details","First Contact Date","Samples Given","Date Samples Given","First Order Date","Last Order Date","Order Frequency","Avg Order Size","Best Seller","Last Contact Date","Next Follow-Up Date","Status","Monthly Value (£)","Notes"];
const dates=["firstContactDate","dateSamplesGiven","firstOrderDate","lastOrderDate","lastContactDate","nextFollowUpDate"];
const states=["Prospect","Contacted","Interested","Active","Dormant","Cold"];
function records(){if(!Array.isArray(db.wholesaleStockists))db.wholesaleStockists=[];return db.wholesaleStockists}
function iso(s){s=String(s||"").trim();const m=s.match(/^(\d\d)\/(\d\d)\/(\d{4})$/);return m?m[3]+"-"+m[2]+"-"+m[1]:s}
function cash(n){return "£"+Number(n||0).toFixed(2)}
function orders(x){return Array.isArray(x.wholesaleOrders)?x.wholesaleOrders:[]}
function revenue(x){return orders(x).reduce((n,o)=>n+Number(o.amount||0),0)}
function last(x){return orders(x).map(o=>o.date).filter(Boolean).sort().slice(-1)[0]||x.lastOrderDate||""}
function parseCSV(s){const rows=[];let row=[],v="",q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c}else if(c==='"')q=true;else if(c===","){row.push(v);v=""}else if(c==="\n"){row.push(v);rows.push(row);row=[];v=""}else if(c!=="\r")v+=c}if(q)throw Error("Unclosed quote");if(v||row.length){row.push(v);rows.push(row)}return rows}
function csv(s){return '"'+String(s??"").replace(/"/g,'""')+'"'}
function wholesaleView(){
const all=records(),due=all.filter(x=>x.nextFollowUpDate&&iso(x.nextFollowUpDate)<=today()&&x.status!=="Cold");
app.innerHTML='<section class="card"><h2>Wholesale Manager</h2><p class="muted">Stockists, orders and follow-ups — saved in your existing Craic HQ backup and cloud record.</p><div class="grid"><div><div class="muted">Stockists</div><div class="kpi">'+all.length+'</div></div><div><div class="muted">Active</div><div class="kpi">'+all.filter(x=>x.status==="Active").length+'</div></div><div><div class="muted">Follow-ups due</div><div class="kpi">'+due.length+'</div></div><div><div class="muted">Logged sales</div><div class="kpi">'+cash(all.reduce((n,x)=>n+revenue(x),0))+'</div></div></div><div class="actions"><button id="wAdd">+ Add stockist</button><button id="wImport" class="secondary">Import spreadsheet CSV</button><button id="wExport" class="secondary">Export CSV</button></div><p class="muted small">Sales totals count orders logged here only, not historical estimates.</p></section>'+
'<section class="card"><h3>Follow-ups due</h3>'+(due.sort((a,b)=>iso(a.nextFollowUpDate).localeCompare(iso(b.nextFollowUpDate))).slice(0,12).map(x=>'<div class="actions" style="align-items:center"><button class="secondary wOpen" data-id="'+esc(x.id)+'">'+esc(x.shopName)+'</button><span class="muted">'+esc(x.nextFollowUpDate)+'</span></div>').join("")||'<p class="muted">No overdue follow-ups.</p>')+'</section>'+
'<section class="card"><h3>Stockists</h3><div class="row"><label>Search<input id="wSearch" placeholder="Shop, town or contact"></label><label>Status<select id="wStatus"><option value="">All</option>'+states.map(s=>'<option>'+s+'</option>').join("")+'</select></label></div><div style="overflow-x:auto"><table><thead><tr><th>Shop</th><th>Status</th><th>Last order</th><th>Next follow-up</th><th>Sales logged</th><th></th></tr></thead><tbody id="wRows"></tbody></table></div></section><section class="card" id="wEditor" style="display:none"></section>';
document.getElementById("wAdd").onclick=()=>edit("");
document.getElementById("wImport").onclick=importCSV;
document.getElementById("wExport").onclick=exportCSV;
document.getElementById("wSearch").oninput=rows;
document.getElementById("wStatus").onchange=rows;
app.querySelectorAll(".wOpen").forEach(b=>b.onclick=()=>edit(b.dataset.id));
rows();
}
function rows(){
const q=document.getElementById("wSearch").value.toLowerCase(),status=document.getElementById("wStatus").value;
const matches=records().filter(x=>(!status||x.status===status)&&[x.shopName,x.location,x.contactName].join(" ").toLowerCase().includes(q)).sort((a,b)=>a.shopName.localeCompare(b.shopName));
document.getElementById("wRows").innerHTML=matches.map(x=>'<tr><td><strong>'+esc(x.shopName)+'</strong><div class="muted">'+esc(x.location||"")+'</div></td><td>'+esc(x.status)+'</td><td>'+esc(last(x))+'</td><td>'+esc(x.nextFollowUpDate||"")+'</td><td>'+cash(revenue(x))+'</td><td><button class="secondary wRow" data-id="'+esc(x.id)+'">Open</button></td></tr>').join("")||'<tr><td colspan="6">No stockists match.</td></tr>';
document.querySelectorAll(".wRow").forEach(b=>b.onclick=()=>edit(b.dataset.id));
}
function edit(id){
const x=records().find(x=>x.id===id)||{status:"Prospect",wholesaleOrders:[]},existing=Boolean(id);
const fields=cols.map((k,i)=>'<label>'+heads[i]+(k==="notes"?'<textarea name="'+k+'">'+esc(x[k]||"")+'</textarea>':k==="status"?'<select name="status">'+states.map(s=>'<option '+((x.status||"Prospect")===s?"selected":"")+'>'+s+'</option>').join("")+'</select>':'<input name="'+k+'" '+(dates.includes(k)?'type="date"':'type="text"')+' value="'+esc(dates.includes(k)?iso(x[k]):x[k]||"")+'" '+(k==="shopName"?"required":"")+'>')+'</label>').join("");
const e=document.getElementById("wEditor");e.style.display="";
e.innerHTML='<h3>'+(existing?"Edit stockist":"Add stockist")+'</h3><form id="wForm"><div class="row">'+fields+'</div><div class="actions"><button>Save stockist</button><button type="button" class="secondary" id="wCancel">Cancel</button>'+(existing?'<button type="button" class="danger" id="wDelete">Delete</button>':'')+'</div></form>'+
(existing?'<hr><h3>Order history</h3><p class="muted">Recording a wholesale sale here does not deduct stock or create a production order.</p><form id="wOrder"><div class="row"><label>Date<input type="date" name="date" value="'+today()+'" required></label><label>Pouches<input type="number" name="qty" min="0" step="1" required></label><label>Order value (£)<input type="number" name="amount" min="0" step=".01" required></label><label>Blends / reference<input name="notes"></label></div><button>Add order</button></form><div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Pouches</th><th>Value</th><th>Notes</th><th></th></tr></thead><tbody>'+orders(x).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(o=>'<tr><td>'+esc(o.date)+'</td><td>'+esc(o.qty)+'</td><td>'+cash(o.amount)+'</td><td>'+esc(o.notes)+'</td><td><button class="secondary wDelOrder" data-id="'+esc(o.id)+'">Remove</button></td></tr>').join("")+'</tbody></table></div>':'');
e.scrollIntoView({behavior:"smooth",block:"start"});
document.getElementById("wCancel").onclick=()=>e.style.display="none";
document.getElementById("wForm").onsubmit=async event=>{event.preventDefault();const f=new FormData(event.currentTarget),next={...x,id:x.id||uid("wh")};cols.forEach(k=>next[k]=String(f.get(k)||"").trim());if(!next.shopName)return alert("Shop name required");if(!existing&&records().some(y=>y.shopName.toLowerCase()===next.shopName.toLowerCase()))return alert("Stockist already exists");if(existing)Object.assign(x,next);else records().push(next);await save();wholesaleView()};
if(existing){
document.getElementById("wDelete").onclick=async()=>{if(!confirm("Delete "+x.shopName+" and its orders?"))return;db.wholesaleStockists=records().filter(y=>y.id!==x.id);await save();wholesaleView()};
document.getElementById("wOrder").onsubmit=async event=>{event.preventDefault();const f=new FormData(event.currentTarget);x.wholesaleOrders=orders(x);x.wholesaleOrders.push({id:uid("wo"),date:String(f.get("date")),qty:Number(f.get("qty")),amount:Number(f.get("amount")),notes:String(f.get("notes")||"")});x.lastOrderDate=last(x);if(!x.firstOrderDate)x.firstOrderDate=x.lastOrderDate;await save();wholesaleView();edit(x.id)};
e.querySelectorAll(".wDelOrder").forEach(b=>b.onclick=async()=>{if(!confirm("Remove this order?"))return;x.wholesaleOrders=orders(x).filter(o=>o.id!==b.dataset.id);await save();wholesaleView();edit(x.id)});
}}
function exportCSV(){const lines=[heads.map(csv).join(","),...records().map(x=>cols.map(k=>csv(x[k]||"")).join(","))];const url=URL.createObjectURL(new Blob([lines.join("\r\n")],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="craic-stockists.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importCSV(){
const e=document.getElementById("wEditor");e.style.display="";
e.innerHTML='<h3>Import stockist spreadsheet</h3><p>Export your sheet as CSV. Existing shops are skipped, never overwritten. Order history stays untouched.</p><input id="wFile" type="file" accept=".csv,text/csv"><p id="wPreview" class="muted"></p><div class="actions"><button id="wConfirm" disabled>Import new stockists</button><button class="secondary" id="wBack">Cancel</button></div>';
e.scrollIntoView({behavior:"smooth"});let candidates=[];
document.getElementById("wBack").onclick=()=>e.style.display="none";
document.getElementById("wFile").onchange=async event=>{try{const file=event.target.files[0];if(!file)return;const data=parseCSV((await file.text()).replace(/^\uFEFF/,""));const headers=data.shift().map(h=>h.trim().toLowerCase());const keys=headers.map(h=>{const i=heads.findIndex(t=>t.toLowerCase()===h);return i>=0?cols[i]:cols.find(k=>k.toLowerCase()===h)||""});if(!keys.includes("shopName"))throw Error("Missing Shop Name column");
const known=new Set(records().map(x=>x.shopName.trim().toLowerCase()));
candidates=data.map(r=>{const x={id:uid("wh"),status:"Prospect",wholesaleOrders:[]};keys.forEach((k,i)=>{if(cols.includes(k))x[k]=dates.includes(k)?iso(r[i]):String(r[i]||"").trim()});if(!states.includes(x.status))x.status="Prospect";return x}).filter(x=>{const name=String(x.shopName||"").trim().toLowerCase();if(!name||known.has(name))return false;known.add(name);return true});
document.getElementById("wPreview").textContent=candidates.length+" new stockists ready. Existing names skipped.";document.getElementById("wConfirm").disabled=!candidates.length;
}catch(err){document.getElementById("wPreview").textContent="Error: "+err.message;document.getElementById("wConfirm").disabled=true}};
document.getElementById("wConfirm").onclick=async()=>{const n=candidates.length;records().push(...candidates);await save();wholesaleView();alert(n+" stockists imported")};
}
window.wholesaleView=wholesaleView;
})();