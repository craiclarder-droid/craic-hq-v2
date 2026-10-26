/* Craic HQ mobile usability improvements: navigation, shortcuts, and non-blocking cloud status. */
(function(){
"use strict";
const names={dashboard:"Home",stock:"Finished Stock",planner:"Quick Restock",resources:"Ingredients",blends:"Blends",recipes:"Recipes",production:"Production",orders:"Orders",customers:"Customers",wholesale:"Wholesale",deliveries:"Deliveries",costing:"Costing",reports:"Reports",traceability:"Traceability",haccp:"HACCP",settings:"Settings",backup:"Backup"};
const primary=["dashboard","stock","planner","production","wholesale"];
const nav=document.getElementById("nav"),menu=document.getElementById("menuBtn");
if(!nav||!menu)return;
nav.setAttribute("aria-label","Craic HQ sections");
for(const b of nav.querySelectorAll("button[data-view]")){const k=b.dataset.view;if(names[k])b.textContent=names[k];}
menu.setAttribute("aria-label","Show or hide all sections");menu.setAttribute("aria-expanded","false");
const mobile=window.matchMedia("(max-width:700px)");
function updateMenu(){if(!mobile.matches){nav.classList.remove("craic-menu-open");return}const open=nav.classList.contains("craic-menu-open");menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"Close":"☰";}
menu.addEventListener("click",()=>requestAnimationFrame(updateMenu));
const shortcut=document.createElement("div");shortcut.id="craicShortcuts";shortcut.className="craic-shortcuts";shortcut.setAttribute("aria-label","Quick navigation");
shortcut.innerHTML=primary.map(k=>'<button type="button" data-go="'+k+'">'+names[k]+'</button>').join("");
nav.after(shortcut);
shortcut.addEventListener("click",e=>{const b=e.target.closest("button[data-go]");if(!b)return;const target=nav.querySelector('button[data-view="'+b.dataset.go+'"]');if(target)target.click();nav.classList.remove("craic-menu-open");updateMenu();window.scrollTo({top:0,behavior:"smooth"})});
function refresh(){const active=typeof currentView==="string"?currentView:"dashboard";shortcut.querySelectorAll("button").forEach(b=>{const yes=b.dataset.go===active;b.classList.toggle("active",yes);b.setAttribute("aria-current",yes?"page":"false")});const label=document.getElementById("craicSectionTitle");if(label)label.textContent=names[active]||active;}
const originalRender=window.render;if(typeof originalRender==="function"){window.render=function(){const result=originalRender.apply(this,arguments);refresh();return result}}
nav.addEventListener("click",e=>{if(e.target.closest("button[data-view]")){nav.classList.remove("craic-menu-open");setTimeout(()=>{refresh();updateMenu();},0)}});
const hint=document.createElement("div");hint.id="craicSectionTitle";hint.className="craic-section-label";document.getElementById("app").before(hint);
refresh();updateMenu();
const status=document.getElementById("craicCloudStatus");
if(status){status.addEventListener("click",()=>{status.classList.toggle("craic-cloud-expanded")});}
const observer=new MutationObserver(()=>{const el=document.getElementById("craicCloudStatus");if(el&&!el.dataset.craicEnhanced){el.dataset.craicEnhanced="1";el.setAttribute("role","status");el.setAttribute("aria-live","polite");el.setAttribute("title","Tap to expand cloud status");el.addEventListener("click",()=>el.classList.toggle("craic-cloud-expanded"));}});
observer.observe(document.body,{childList:true,subtree:false});
})();