/* Craic HQ grouped navigation. All original feature buttons retained. */
(function(){
"use strict";
const nav=document.getElementById("nav"),menu=document.getElementById("menuBtn"),app=document.getElementById("app");
if(!nav||!menu||!app)return;
const groups=[
 ["Home",[["dashboard","Overview"]]],
 ["Stock & Purchasing",[["stock","Finished Stock"],["resources","Ingredients & Packaging"],["deliveries","Deliveries"]]],
 ["Production",[["planner","Quick Restock"],["production","Production Runs"],["blends","Blend Manager"],["recipes","Master Recipes"]]],
 ["Sales & Customers",[["orders","Orders"],["customers","Customers"],["wholesale","Wholesale"]]],
 ["Food Safety",[["haccp","HACCP"],["traceability","Traceability"]]],
 ["Business",[["costing","Costing"],["reports","Reports"],["settings","Settings"],["backup","Backup"]]]
];
const originals=new Map(Array.from(nav.querySelectorAll("button[data-view]")).map(b=>[b.dataset.view,b]));
nav.replaceChildren();
nav.classList.add("craic-group-nav");
nav.setAttribute("aria-label","All Craic HQ sections");
for(const [name,items] of groups){
 const section=document.createElement("details");section.className="craic-nav-group";
 const summary=document.createElement("summary");summary.textContent=name;section.append(summary);
 const contents=document.createElement("div");contents.className="craic-nav-items";
 for(const [id,label] of items){const b=originals.get(id);if(!b)continue;b.textContent=label;contents.append(b)}
 section.append(contents);nav.append(section);
}
const quick=document.createElement("div");quick.className="craic-quick-nav";
quick.setAttribute("aria-label","Quick access");
for(const [id,label] of [["dashboard","Home"],["stock","Stock"],["planner","Restock"],["production","Production"],["wholesale","Wholesale"],["haccp","HACCP"]]){
 const b=document.createElement("button");b.type="button";b.textContent=label;b.dataset.go=id;quick.append(b);
}
nav.before(quick);
menu.textContent="All sections";menu.setAttribute("aria-controls","nav");menu.setAttribute("aria-expanded","false");
function close(){nav.classList.remove("craic-nav-open");menu.setAttribute("aria-expanded","false")}
menu.onclick=()=>{const open=nav.classList.toggle("craic-nav-open");menu.setAttribute("aria-expanded",String(open));if(open)nav.scrollIntoView({block:"nearest"})};
quick.onclick=e=>{const b=e.target.closest("button[data-go]");if(!b)return;const target=originals.get(b.dataset.go);if(target){target.click();close();window.scrollTo({top:0,behavior:"smooth"})}};
nav.addEventListener("click",e=>{if(e.target.closest("button[data-view]")){close();window.scrollTo({top:0,behavior:"smooth"})}});
function highlight(){const current=typeof currentView==="string"?currentView:"dashboard";quick.querySelectorAll("button").forEach(b=>{const active=b.dataset.go===current;b.classList.toggle("active",active);b.setAttribute("aria-current",active?"page":"false")});for(const details of nav.querySelectorAll("details")){const active=!!details.querySelector('button[data-view="'+current+'"]');details.classList.toggle("has-active",active)}}
const oldRender=window.render;if(typeof oldRender==="function"){window.render=function(){const value=oldRender.apply(this,arguments);highlight();return value}}
highlight();
const cloudWatcher=new MutationObserver(()=>{const el=document.getElementById("craicCloudStatus");if(el&&!el.dataset.compact){el.dataset.compact="1";el.title="Tap for full cloud status";el.setAttribute("role","status");el.addEventListener("click",()=>el.classList.toggle("expanded"))}});
cloudWatcher.observe(document.body,{childList:true});
})();