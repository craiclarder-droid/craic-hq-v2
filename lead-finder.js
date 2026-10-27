/* Free, opt-in wholesale business discovery using OpenStreetMap Overpass. */
(function(){
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const categories={"Farm shops":"shop=farm","Butchers":"shop=butcher","Delis":"shop=deli","Food shops":"shop=convenience","Greengrocers":"shop=greengrocer","Gift shops":"shop=gift","Garden centres":"shop=garden_centre","General stores":"shop=general"};
let results=[],busy=false;
function mount(){
 const root=document.getElementById("wSalesCompanion");if(!root||root.querySelector("#craicLeadFinder"))return;
 const section=document.createElement("details");section.className="card";section.id="craicLeadFinder";
 section.innerHTML='<summary><b>🔎 Find new wholesale leads (free)</b></summary><p class="muted small">Discover businesses using OpenStreetMap. Contact details may be missing. Review before adding to your existing call list.</p><div class="actions"><label>Business type<select id="clfCategory">'+Object.keys(categories).map(x=>'<option>'+esc(x)+'</option>').join("")+'</select></label><label>Town or area<input id="clfPlace" value="Paisley" placeholder="e.g. Ayr, Glasgow"></label><label>Radius<select id="clfRadius"><option value="5000">5 km</option><option value="15000" selected>15 km</option><option value="30000">30 km</option><option value="50000">50 km</option></select></label><label>Maximum results<select id="clfCount"><option>10</option><option>20</option><option selected>30</option><option>50</option></select></label></div><button type="button" id="clfSearch">Find leads</button><p class="muted small" id="clfStatus" aria-live="polite"></p><div id="clfResults"></div>';
 root.insertBefore(section,root.firstChild);
 section.querySelector("#clfSearch").onclick=search;
}
async function search(){
 if(busy)return;busy=true;
 const el=document.getElementById("craicLeadFinder"),status=el.querySelector("#clfStatus"),out=el.querySelector("#clfResults");
 const place=el.querySelector("#clfPlace").value.trim(),cat=el.querySelector("#clfCategory").value,radius=+el.querySelector("#clfRadius").value,count=+el.querySelector("#clfCount").value;
 results=[];out.innerHTML="";
 if(place.length<2){status.textContent="Enter a town or area.";busy=false;return}
 status.textContent="Looking up the area and businesses…";
 try{
 const geo=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q="+encodeURIComponent(place+", Scotland"),{headers:{"Accept":"application/json"}});
 if(!geo.ok)throw Error("Location search unavailable");
 const loc=(await geo.json())[0];if(!loc)throw Error("Area not found. Try a nearby town.");
 const [key,value]=categories[cat].split("=");
 const query='[out:json][timeout:25];(nwr["'+key+'"="'+value+'"](around:'+radius+','+Number(loc.lat)+','+Number(loc.lon)+'););out center '+Math.min(count*5,250)+';';
 const res=await fetch("https://overpass.kumi.systems/api/interpreter",{method:"POST",body:new URLSearchParams({data:query})});
 if(!res.ok)throw Error("Free map search is busy. Please try again later.");
 const data=await res.json(),known=new Set((Array.isArray(db.wholesaleStockists)?db.wholesaleStockists:[]).map(x=>norm(x.shopName)+"|"+norm(x.location)));
 const seen=new Set();
 results=(data.elements||[]).map(x=>{const t=x.tags||{};return {name:t.name||"",town:t["addr:city"]||t["addr:town"]||t["addr:village"]||place,phone:t.phone||t["contact:phone"]||"",website:t.website||t["contact:website"]||"",email:t.email||t["contact:email"]||"",category:cat,source:"OpenStreetMap "+x.type+"/"+x.id}}).filter(x=>{const k=norm(x.name)+"|"+norm(x.town);if(!x.name||known.has(k)||seen.has(k))return false;seen.add(k);return true}).slice(0,count);
 status.textContent=results.length+" potential new businesses found. Details come from volunteer-maintained map records; verify before calling.";
 render();
 }catch(err){status.textContent=err.message+" No existing leads have been changed."}finally{busy=false}
}
function render(){
 const out=document.getElementById("clfResults");if(!out)return;
 out.innerHTML=results.map((x,i)=>'<div class="card" data-clf="'+i+'"><b>'+esc(x.name)+'</b><p class="muted small">'+esc(x.town)+' · '+esc(x.category)+'</p><label>Phone<input data-field="phone" value="'+esc(x.phone)+'" placeholder="Add phone number later"></label><label>Contact name<input data-field="contact" placeholder="Who did you speak to?"></label><label>Notes<textarea data-field="notes" rows="2" placeholder="Research or call notes"></textarea></label><button type="button" data-add="'+i+'">Add to New Leads</button></div>').join("");
 out.querySelectorAll("[data-add]").forEach(btn=>btn.onclick=async()=>{const i=+btn.dataset.add,x=results[i],card=btn.closest("[data-clf]");if(!x||btn.disabled)return;const all=Array.isArray(db.wholesaleStockists)?db.wholesaleStockists:(db.wholesaleStockists=[]);if(all.some(a=>norm(a.shopName)===norm(x.name)&&norm(a.location)===norm(x.town))){btn.textContent="Already saved";btn.disabled=true;return}btn.disabled=true;btn.textContent="Saving…";const lead={id:uid("wh"),shopName:x.name,location:x.town,contactMethod:"Phone",contactDetails:card.querySelector('[data-field="phone"]').value.trim(),contactName:card.querySelector('[data-field="contact"]').value.trim(),notes:card.querySelector('[data-field="notes"]').value.trim(),status:"Prospect",salesCategory:x.category,salesProspectSource:"osm-finder",salesResearchSource:x.source,salesResearchWebsite:x.website,salesResearchEmail:x.email,wholesaleOrders:[]};all.push(lead);try{await save();btn.textContent="Added ✓";card.style.opacity=".7"}catch(e){all.splice(all.indexOf(lead),1);btn.disabled=false;btn.textContent="Retry save";alert("Could not save this lead. Check cloud sync.")}});
}
const observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{subtree:true,childList:true});mount();
})();