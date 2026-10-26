/* Mobile-friendly Wholesale tabs. Presentation only: no wholesale records changed. */
(function(){
"use strict";
let selected="existing";
const labels=[["existing","Existing Stockists"],["leads","New Leads"],["followups","Follow-ups"],["scripts","Scripts & Messages"]];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setup(){
 const root=document.getElementById("app"),sales=document.getElementById("wSalesCompanion");
 if(!root||!sales)return;
 const sections=Array.from(root.children).filter(x=>x.tagName==="SECTION"&&x!==sales);
 if(sections.length<3)return;
 // Existing Wholesale Manager, Follow-ups due, Stockists.
 const [manager,followups,stockists,editor]=sections;
 const nav=document.createElement("section");nav.className="card";nav.id="whTabs";
 nav.innerHTML='<h2>Wholesale</h2><div class="actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'+labels.map(([id,label])=>'<button type="button" class="secondary whTab" data-tab="'+id+'" style="font-size:14px;padding:12px 6px;white-space:normal">'+escape(label)+'</button>').join("")+'</div>';
 root.insertBefore(nav,manager);
 const existing=document.createElement("div"),leads=document.createElement("div"),due=document.createElement("div"),scripts=document.createElement("div");
 existing.id="whExisting";leads.id="whLeads";due.id="whDue";scripts.id="whScripts";
 root.insertBefore(existing,nav.nextSibling);root.insertBefore(leads,existing.nextSibling);root.insertBefore(due,leads.nextSibling);root.insertBefore(scripts,due.nextSibling);
 existing.append(manager,stockists);if(editor)existing.append(editor);leads.append(sales);due.append(followups);
 // The existing app does not track all sales. Remove misleading £0 KPI.
 const grid=manager.querySelector(".grid");
 if(grid)Array.from(grid.children).forEach(x=>{if(/Logged sales/i.test(x.textContent))x.remove()});
 const legacy=manager.querySelector("p.muted.small");if(legacy&&/Sales totals/.test(legacy.textContent))legacy.remove();
 // New lead calls live in Sales Companion. Script/message controls are accessible in their own tab.
 const scriptPanel=document.createElement("section");scriptPanel.className="card";
 scriptPanel.innerHTML='<h3>Call scripts and ready-to-send messages</h3><p class="muted">Open a script below. Copy the message into email, WhatsApp or Instagram.</p><div class="actions"><button id="whOpenCheat">Call cheat sheet</button><button id="whOpenMessages" class="secondary">Email & messages</button></div><div id="whScriptContent"></div>';
 scripts.append(scriptPanel);
 const salesSearch=sales.querySelector("#salesSearch"),cards=sales.querySelector("#salesCards");
 const searchHint=document.createElement("p");searchHint.className="muted small";searchHint.textContent="Tap a shop to call, record the outcome and set a follow-up. No sales figures needed.";sales.querySelector("h3").after(searchHint);
 function filterLeads(){ /* Lead filters are handled by Sales Companion. */ }
 function activate(tab){
 selected=tab;existing.style.display=tab==="existing"?"":"none";leads.style.display=tab==="leads"?"":"none";due.style.display=tab==="followups"?"":"none";scripts.style.display=tab==="scripts"?"":"none";
 nav.querySelectorAll(".whTab").forEach(b=>{const active=b.dataset.tab===tab;b.className=active?"whTab":"secondary whTab";b.style.fontWeight=active?"700":"400";b.setAttribute("aria-pressed",String(active))});
 if(tab==="leads")filterLeads();
 if(tab==="followups"){const records=Array.isArray(db.wholesaleStockists)?db.wholesaleStockists:[];const today=new Date().toISOString().slice(0,10);const dueRecords=records.filter(x=>x.nextFollowUpDate&&x.nextFollowUpDate<=today&&x.status!=="Cold").sort((a,b)=>xDate(a).localeCompare(xDate(b)));let extra=due.querySelector("#whDueCards");if(!extra){extra=document.createElement("section");extra.id="whDueCards";extra.className="card";due.append(extra)}extra.innerHTML="<h3>Quick follow-up queue</h3>"+(dueRecords.length?dueRecords.map(x=>"<div class=\"actions\"><strong>"+escape(x.shopName)+"</strong> · "+escape(x.nextFollowUpDate)+"</div>").join(""):"<p class=\"muted\">No follow-ups due. Set a date on a lead after contacting them.</p>")}
 function xDate(x){return x.nextFollowUpDate||""}
 }
 nav.querySelectorAll(".whTab").forEach(b=>b.onclick=()=>activate(b.dataset.tab));
 // A full-record button re-renders Wholesale: switch to the editor tab before opening.
 sales.addEventListener("click",event=>{if(event.target.closest(".salesOpen")){selected="existing";}});
 if(salesSearch)salesSearch.addEventListener("input",()=>setTimeout(filterLeads,0));
 const observer=new MutationObserver(()=>{if(selected==="leads")filterLeads()});
 if(cards)observer.observe(cards,{childList:true});
 document.getElementById("whOpenCheat").onclick=()=>{document.getElementById("salesCheat").click();const target=document.getElementById("whScriptContent");target.replaceChildren(...Array.from(sales.querySelector("#salesExtras").children))};
 document.getElementById("whOpenMessages").onclick=()=>{document.getElementById("salesMessages").click();const target=document.getElementById("whScriptContent");target.innerHTML="";const source=sales.querySelector("#salesExtras");target.append(...Array.from(source.children));};
 activate(selected);
}
const previous=window.wholesaleView;if(typeof previous!=="function")return;
window.wholesaleView=function(){previous();setup()};
})();