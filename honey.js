/* Craic HQ 1.1.6 - Honey patch
   Additive only: preserves all existing Craic HQ data structures and records.
*/
(function(){
  const honeyKeys={
    honeyApiaries:[],
    honeyHives:[],
    beeTreatments:[],
    honeyExtractions:[],
    honeyVessels:[],
    honeyPackingRuns:[],
    honeyDispatches:[]
  };

  function ensureHoneyDb(){
    let changed=false;
    for(const [key,fallback] of Object.entries(honeyKeys)){
      if(!Array.isArray(db[key])){db[key]=clone(fallback);changed=true;}
    }
    if(changed)save();
  }

  function apiary(id){return db.honeyApiaries.find(x=>x.id===id)}
  function hive(id){return db.honeyHives.find(x=>x.id===id)}
  function extraction(id){return db.honeyExtractions.find(x=>x.id===id)}
  function vessel(id){return db.honeyVessels.find(x=>x.id===id)}
  function packingRun(id){return db.honeyPackingRuns.find(x=>x.id===id)}
  function boolLabel(v){return v===true?"Yes":v===false?"No":"-"}
  function checked(id){return document.getElementById(id)?.checked===true}
  function val(id){return document.getElementById(id)?.value??""}
  function num(id){return Number(val(id)||0)}
  function selectedValues(name){return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value)}
  function honeyBatchCode(prefix,date,arr){
    const d=new Date((date||today())+"T12:00:00");
    const base=`${prefix}-${String(d.getDate()).padStart(2,"0")}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getFullYear()).slice(-2)}`;
    const count=(arr||[]).filter(r=>r.batchCode===base||String(r.batchCode||"").startsWith(base+"-")).length;
    return count?`${base}-${count+1}`:base;
  }
  function hiveTreatmentWarnings(hiveId,onDate){
    const warnings=[];
    const date=onDate||today();
    const relevant=db.beeTreatments.filter(t=>t.hiveId===hiveId && (!t.startDate || t.startDate<=date));
    for(const t of relevant){
      if(t.restrictionFollowed!==true)warnings.push(`${t.product||"Treatment"}: manufacturer harvest restrictions not confirmed`);
      if(t.harvestFrom && t.harvestFrom>date)warnings.push(`${t.product||"Treatment"}: recorded harvest-from date is ${t.harvestFrom}`);
      if(t.supersPresent===true)warnings.push(`${t.product||"Treatment"}: honey supers were recorded as present during treatment`);
    }
    return warnings;
  }
  function latestMoisture(v){
    const readings=v?.moistureReadings||[];
    return readings.length?readings[readings.length-1]:null;
  }
  function treatmentStatusHtml(hiveId,onDate){
    const warnings=hiveTreatmentWarnings(hiveId,onDate);
    return warnings.length?`<span class="badge bad">CHECK</span><div class="small">${warnings.map(esc).join("<br>")}</div>`:`<span class="badge good">Recorded checks OK</span>`;
  }

  ensureHoneyDb();

  // Add Honey navigation without disturbing the existing index navigation.
  const navEl=document.getElementById("nav");
  if(navEl && !navEl.querySelector('[data-view="honey"]')){
    const btn=document.createElement("button");
    btn.dataset.view="honey";
    btn.textContent="Honey";
    btn.onclick=()=>nav("honey");
    const haccpBtn=navEl.querySelector('[data-view="haccp"]');
    navEl.insertBefore(btn,haccpBtn||null);
  }

  const baseRender=render;
  render=function(){
    ensureHoneyDb();
    if(currentView==="honey") return honeyView();
    return baseRender();
  };

  const baseDashboard=dashboard;
  dashboard=function(){
    baseDashboard();
    const openKg=db.honeyVessels.filter(v=>v.status!=="Packed").reduce((s,v)=>s+Number(v.weightKg||0),0);
    const jars=db.honeyPackingRuns.reduce((s,r)=>s+Number(r.remainingJars??r.jarCount??0),0);
    app.insertAdjacentHTML("afterbegin",`<div class="grid">
      <section class="card"><div class="muted">Honey vessels</div><div class="kpi">${db.honeyVessels.length}</div></section>
      <section class="card"><div class="muted">Honey awaiting / in vessels</div><div class="kpi">${fmt(openKg)} kg</div></section>
      <section class="card"><div class="muted">Honey jars available</div><div class="kpi">${fmt(jars)}</div></section>
    </div>`);
  };

  const baseHaccpView=haccpView;
  haccpView=function(){
    baseHaccpView();
    const sel=document.getElementById("hType");
    if(sel && ![...sel.options].some(o=>o.value==="Honey Cleaning")){
      ["Honey Cleaning","Honey Production"].forEach(t=>{const o=document.createElement("option");o.textContent=t;o.value=t;sel.appendChild(o)});
    }
  };

  const baseBackupView=backupView;
  backupView=function(){
    baseBackupView();
    app.innerHTML=app.innerHTML.replace("1.1.5 HACCP Linking","1.1.6 Honey");
    const card=app.querySelector(".card");
    if(card)card.insertAdjacentHTML("beforeend",`<p>${db.honeyExtractions.length} honey extractions · ${db.honeyVessels.length} honey vessels · ${db.honeyPackingRuns.length} honey packing batches · ${db.beeTreatments.length} bee treatment records</p>`);
  };

  const baseTraceabilityView=traceabilityView;
  traceabilityView=function(){
    baseTraceabilityView();
    app.insertAdjacentHTML("beforeend",`<section class="card"><h2>Honey Traceability Search</h2>
      <label>Honey batch, vessel, apiary, colony, treatment or recipient</label>
      <input id="honeyTraceSearch" placeholder="e.g. HNY-010926 or Bucket 1">
      <button onclick="runHoneyTrace()">Search honey</button></section><div id="honeyTraceResults"></div>`);
  };

  window.runHoneyTrace=()=>{
    const q=val("honeyTraceSearch").toLowerCase().trim();
    if(!q)return alert("Enter something to search for.");
    const matches=db.honeyPackingRuns.filter(p=>{
      const vs=(p.vesselIds||[]).map(id=>vessel(id)).filter(Boolean);
      const exts=vs.map(v=>extraction(v.extractionId)).filter(Boolean);
      const hives=[...new Set(exts.flatMap(e=>e.hiveIds||[]))].map(id=>hive(id)).filter(Boolean);
      const apis=[...new Set(exts.map(e=>apiary(e.apiaryId)?.name||""))];
      const treatments=hives.flatMap(h=>db.beeTreatments.filter(t=>t.hiveId===h.id).map(t=>t.product||""));
      const dispatches=db.honeyDispatches.filter(d=>d.packingRunId===p.id).map(d=>d.customer||"");
      const text=[p.batchCode,p.date,p.country,p.bbe,...vs.map(v=>v.code),...hives.map(h=>h.name),...apis,...treatments,...dispatches].join(" ").toLowerCase();
      return text.includes(q);
    });
    document.getElementById("honeyTraceResults").innerHTML=matches.map(honeyTraceCard).join("")||'<section class="card">No matching honey traceability record.</section>';
  };

  function honeyTraceCard(p){
    const vs=(p.vesselIds||[]).map(id=>vessel(id)).filter(Boolean);
    const exts=[...new Map(vs.map(v=>[v.extractionId,extraction(v.extractionId)]).filter(x=>x[1])).values()];
    const hiveIds=[...new Set(exts.flatMap(e=>e.hiveIds||[]))];
    const hs=hiveIds.map(id=>hive(id)).filter(Boolean);
    const outs=db.honeyDispatches.filter(d=>d.packingRunId===p.id);
    return `<section class="card"><h3>${esc(p.batchCode)}</h3>
      <p><b>Packed:</b> ${esc(p.date)} · <b>Operator:</b> ${esc(p.operator||"")} · <b>Jar:</b> ${fmt(p.jarSizeG)}g · <b>Produced:</b> ${fmt(p.jarCount)} · <b>Remaining:</b> ${fmt(p.remainingJars??p.jarCount)}</p>
      <p><b>BBE:</b> ${esc(p.bbe||"")} · <b>Origin:</b> ${esc(p.country||"")}</p>
      <h4>Vessels</h4><table><tr><th>Vessel</th><th>Extraction</th><th>Weight</th><th>Latest moisture</th></tr>${vs.map(v=>{const m=latestMoisture(v);const e=extraction(v.extractionId);return `<tr><td>${esc(v.code)}</td><td>${esc(e?.batchCode||"")}</td><td>${fmt(v.weightKg)} kg</td><td>${m?fmt(m.value)+"% ("+esc(m.date)+")":"-"}</td></tr>`}).join("")}</table>
      <h4>Source colonies & treatment check</h4><table><tr><th>Apiary</th><th>Colony</th><th>Treatment check at extraction</th></tr>${hs.map(h=>{const dates=exts.filter(e=>(e.hiveIds||[]).includes(h.id)).map(e=>e.date).sort();const d=dates[0]||p.date;return `<tr><td>${esc(apiary(h.apiaryId)?.name||"")}</td><td>${esc(h.name)}</td><td>${treatmentStatusHtml(h.id,d)}</td></tr>`}).join("")}</table>
      <h4>Recipients supplied</h4>${outs.length?`<table><tr><th>Date</th><th>Recipient</th><th>Jars</th><th>Notes</th></tr>${outs.map(d=>`<tr><td>${esc(d.date)}</td><td>${esc(d.customer)}</td><td>${fmt(d.qty)}</td><td>${esc(d.notes||"")}</td></tr>`).join("")}</table>`:"<p>None recorded.</p>"}
    </section>`;
  }

  function honeyView(){
    ensureHoneyDb();
    const activeApiaries=db.honeyApiaries.filter(a=>a.active!==false);
    const activeHives=db.honeyHives.filter(h=>h.active!==false);
    const openVessels=db.honeyVessels.filter(v=>v.status!=="Packed");
    app.innerHTML=`
      <div class="grid">
        <section class="card"><div class="muted">Apiaries</div><div class="kpi">${activeApiaries.length}</div></section>
        <section class="card"><div class="muted">Colonies</div><div class="kpi">${activeHives.length}</div></section>
        <section class="card"><div class="muted">Extraction batches</div><div class="kpi">${db.honeyExtractions.length}</div></section>
        <section class="card"><div class="muted">Packing batches</div><div class="kpi">${db.honeyPackingRuns.length}</div></section>
      </div>
      <section class="card"><h2>Honey</h2><div class="notice">Traceability chain: colony + treatments → extraction → vessel/moisture → packing batch → recipient. Existing Craic HQ spice data is kept separate and unchanged.</div></section>
      ${apiarySection(activeApiaries)}
      ${hiveSection(activeApiaries)}
      ${treatmentSection(activeHives)}
      ${extractionSection(activeApiaries,activeHives)}
      ${vesselSection()}
      ${packingSection(openVessels)}
      ${dispatchSection()}
      ${cleaningSection()}
      ${historySection()}
    `;
  }

  function apiarySection(activeApiaries){
    return `<section class="card"><h2>1. Apiaries</h2>
      <div class="row"><div><label>Apiary name</label><input id="haName" placeholder="e.g. Whitehouse"></div><div><label>Location / area</label><input id="haLocation" placeholder="optional"></div></div>
      <label>Notes</label><textarea id="haNotes"></textarea><button onclick="addHoneyApiary()">Add apiary</button>
      ${db.honeyApiaries.length?`<table><tr><th>Apiary</th><th>Location</th><th>Status</th></tr>${db.honeyApiaries.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.location||"")}</td><td><button class="secondary" onclick="toggleHoneyApiary('${a.id}')">${a.active===false?"Restore":"Archive"}</button></td></tr>`).join("")}</table>`:""}
    </section>`;
  }

  function hiveSection(activeApiaries){
    return `<section class="card"><h2>2. Colonies / Hives</h2>
      ${activeApiaries.length?`<div class="row"><div><label>Apiary</label><select id="hhApiary">${activeApiaries.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div><div><label>Colony / hive name</label><input id="hhName" placeholder="e.g. Hive 1"></div></div>
      <label>Notes</label><textarea id="hhNotes"></textarea><button onclick="addHoneyHive()">Add colony</button>`:'<div class="notice">Add an apiary first.</div>'}
      ${db.honeyHives.length?`<table><tr><th>Apiary</th><th>Colony</th><th>Notes</th><th>Status</th></tr>${db.honeyHives.map(h=>`<tr><td>${esc(apiary(h.apiaryId)?.name||"")}</td><td>${esc(h.name)}</td><td>${esc(h.notes||"")}</td><td><button class="secondary" onclick="toggleHoneyHive('${h.id}')">${h.active===false?"Restore":"Archive"}</button></td></tr>`).join("")}</table>`:""}
    </section>`;
  }

  function treatmentSection(activeHives){
    return `<section class="card"><h2>3. Bee Treatment Log</h2>
      ${activeHives.length?`<div class="row"><div><label>Colony</label><select id="htHive">${activeHives.map(h=>`<option value="${h.id}">${esc(apiary(h.apiaryId)?.name||"")} · ${esc(h.name)}</option>`).join("")}</select></div><div><label>Treatment / product</label><input id="htProduct" placeholder="e.g. Apivar"></div><div><label>Dose / application</label><input id="htDose"></div></div>
      <div class="row"><div><label>Started</label><input id="htStart" type="date" value="${today()}"></div><div><label>Finished / removed</label><input id="htEnd" type="date"></div><div><label>Safe / eligible for honey harvest from</label><input id="htHarvest" type="date"></div></div>
      <div class="row"><div><label>Honey supers present during treatment?</label><select id="htSupers"><option value="no">No</option><option value="yes">Yes</option></select></div><div><label>Manufacturer harvest / withdrawal restrictions followed?</label><select id="htRestriction"><option value="yes">Yes</option><option value="no">No</option></select></div></div>
      <label>Notes</label><textarea id="htNotes"></textarea><button onclick="addBeeTreatment()">Save treatment</button>`:'<div class="notice">Add a colony first.</div>'}
      ${db.beeTreatments.length?`<table><tr><th>Colony</th><th>Treatment</th><th>Dates</th><th>Supers present</th><th>Restrictions followed</th><th>Harvest from</th></tr>${db.beeTreatments.slice().reverse().map(t=>`<tr><td>${esc(apiary(hive(t.hiveId)?.apiaryId)?.name||"")} · ${esc(hive(t.hiveId)?.name||"")}</td><td>${esc(t.product||"")}<div class="small">${esc(t.dose||"")}</div></td><td>${esc(t.startDate||"")} → ${esc(t.endDate||"")}</td><td>${boolLabel(t.supersPresent)}</td><td>${boolLabel(t.restrictionFollowed)}</td><td>${esc(t.harvestFrom||"")}</td></tr>`).join("")}</table>`:""}
    </section>`;
  }

  function extractionSection(activeApiaries,activeHives){
    return `<section class="card"><h2>4. New Honey Extraction</h2>
      ${activeApiaries.length&&activeHives.length?`<div class="row"><div><label>Date</label><input id="heDate" type="date" value="${today()}"></div><div><label>Apiary</label><select id="heApiary">${activeApiaries.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div><div><label>Supers</label><input id="heSupers" type="number" min="0" step="1"></div><div><label>Frames (optional)</label><input id="heFrames" type="number" min="0" step="1"></div></div>
      <label>Colonies included</label><div class="batch-choice">${activeHives.map(h=>`<label><input style="width:auto" type="checkbox" name="heHives" value="${h.id}"> ${esc(apiary(h.apiaryId)?.name||"")} · ${esc(h.name)}</label>`).join("")}</div>
      <h4>Pre-production checks</h4><div class="batch-choice">
        ${checkHtml("heArea","Extraction area clean")}${checkHtml("heExtractor","Extractor clean / suitable")}${checkHtml("heTools","Uncapping tools clean")}${checkHtml("heStrainers","Strainers clean")}${checkHtml("heContainers","Settling containers / buckets clean")}${checkHtml("heFramesOk","Frames visually acceptable / no obvious contamination or fermentation")}
      </div>
      <div class="row"><div><label>Condition check</label><select id="heCondition"><option value="pass">Pass</option><option value="fail">Fail / hold</option></select></div><div><label>Operator</label><input id="heOperator" value="${esc(db.settings?.defaultOperator||"James")}"></div></div>
      <label>Notes / corrective action</label><textarea id="heNotes"></textarea><button onclick="addHoneyExtraction()">Save extraction batch</button>`:'<div class="notice">Add an apiary and colonies first.</div>'}
    </section>`;
  }

  function vesselSection(){
    const exts=db.honeyExtractions.slice().reverse();
    return `<section class="card"><h2>5. Honey Vessels / Buckets</h2>
      ${exts.length?`<div class="row"><div><label>Extraction batch</label><select id="hvExtraction">${exts.map(e=>`<option value="${e.id}">${esc(e.batchCode)} · ${esc(apiary(e.apiaryId)?.name||"")}</option>`).join("")}</select></div><div><label>Vessel ID</label><input id="hvCode" placeholder="e.g. Bucket 1"></div><div><label>Honey in vessel (kg)</label><input id="hvWeight" type="number" step="0.01" min="0"></div><div><label>Initial moisture %</label><input id="hvMoisture" type="number" step="0.1" min="0" max="100"></div></div>
      <label>Notes</label><textarea id="hvNotes"></textarea><button onclick="addHoneyVessel()">Add vessel</button>`:'<div class="notice">Save an extraction batch first.</div>'}
      ${db.honeyVessels.length?`<table><tr><th>Vessel</th><th>Extraction</th><th>Weight</th><th>Moisture readings</th><th>Status</th><th></th></tr>${db.honeyVessels.slice().reverse().map(v=>`<tr><td><b>${esc(v.code)}</b></td><td>${esc(extraction(v.extractionId)?.batchCode||"")}</td><td>${fmt(v.weightKg)} kg</td><td>${(v.moistureReadings||[]).map(m=>`${fmt(m.value)}% · ${esc(m.date)}`).join("<br>")||"-"}</td><td>${esc(v.status||"Settling")}</td><td><button class="secondary" onclick="addMoistureReading('${v.id}')">Add moisture</button></td></tr>`).join("")}</table>`:""}
    </section>`;
  }

  function packingSection(openVessels){
    return `<section class="card"><h2>6. Jarring / Packing Batch</h2>
      ${openVessels.length?`<div class="row"><div><label>Date jarred</label><input id="hpDate" type="date" value="${today()}"></div><div><label>Jar size (g)</label><input id="hpJarSize" type="number" value="340" min="1"></div><div><label>Number of jars</label><input id="hpJarCount" type="number" min="1"></div><div><label>Total packed weight (kg)</label><input id="hpWeight" type="number" step="0.01" min="0"></div></div>
      <label>Vessels used</label><div class="batch-choice">${openVessels.map(v=>{const m=latestMoisture(v);return `<label><input style="width:auto" type="checkbox" name="hpVessels" value="${v.id}"> ${esc(v.code)} · ${fmt(v.weightKg)} kg${m?` · latest ${fmt(m.value)}%`:""}</label>`}).join("")}</div>
      <div class="row"><div><label>Best before</label><input id="hpBbe" type="date"></div><div><label>Country of origin / harvest</label><input id="hpCountry" value="Scotland"></div><div><label>Final moisture % (optional)</label><input id="hpMoisture" type="number" step="0.1" min="0" max="100"></div><div><label>Operator</label><input id="hpOperator" value="${esc(db.settings?.defaultOperator||"James")}"></div></div>
      <h4>Packing / release checks</h4><div class="batch-choice">${checkHtml("hpJars","Jars and lids checked")}${checkHtml("hpWeights","Fill weights checked")}${checkHtml("hpClosed","Jars closed correctly")}${checkHtml("hpLabel","Correct honey label applied")}${checkHtml("hpBatch","Batch / lot code applied")}${checkHtml("hpBbeCheck","Best before applied")}${checkHtml("hpOrigin","Origin declaration checked")}</div>
      <label>Notes / corrective action</label><textarea id="hpNotes"></textarea><button onclick="addHoneyPackingRun()">Save packing batch</button>`:'<div class="notice">Add at least one unpacked vessel first.</div>'}
    </section>`;
  }

  function dispatchSection(){
    const runs=db.honeyPackingRuns.filter(r=>Number(r.remainingJars??r.jarCount??0)>0).slice().reverse();
    return `<section class="card"><h2>7. Honey Dispatch / Customer Traceability</h2>
      ${runs.length?`<div class="row"><div><label>Date</label><input id="hdDate" type="date" value="${today()}"></div><div><label>Packing batch</label><select id="hdRun">${runs.map(r=>`<option value="${r.id}">${esc(r.batchCode)} · ${fmt(r.remainingJars??r.jarCount)} jars left</option>`).join("")}</select></div><div><label>Recipient / stockist / market</label><input id="hdCustomer"></div><div><label>Jars supplied</label><input id="hdQty" type="number" min="1"></div></div><label>Notes</label><textarea id="hdNotes"></textarea><button onclick="addHoneyDispatch()">Record dispatch</button>`:'<div class="notice">No packed honey is currently available to dispatch.</div>'}
      ${db.honeyDispatches.length?`<table><tr><th>Date</th><th>Batch</th><th>Recipient</th><th>Jars</th><th>Notes</th></tr>${db.honeyDispatches.slice().reverse().map(d=>`<tr><td>${esc(d.date)}</td><td>${esc(packingRun(d.packingRunId)?.batchCode||"")}</td><td>${esc(d.customer)}</td><td>${fmt(d.qty)}</td><td>${esc(d.notes||"")}</td></tr>`).join("")}</table>`:""}
    </section>`;
  }

  function cleaningSection(){
    return `<section class="card"><h2>8. Honey Cleaning Record</h2>
      <div class="row"><div><label>Date</label><input id="hcDate" type="date" value="${today()}"></div><div><label>Completed by</label><input id="hcBy" value="${esc(db.settings?.defaultOperator||"James")}"></div><div><label>Result</label><select id="hcResult"><option>Pass</option><option>Fail</option></select></div></div>
      <div class="batch-choice">${checkHtml("hcExtractor","Extractor")}${checkHtml("hcUncapping","Uncapping knife / fork")}${checkHtml("hcTray","Uncapping tray")}${checkHtml("hcStrainers","Strainers")}${checkHtml("hcCollection","Collection buckets")}${checkHtml("hcSettling","Settling buckets / containers")}${checkHtml("hcGates","Honey gates")}${checkHtml("hcUtensils","Food-contact utensils")}${checkHtml("hcSurfaces","Work surfaces / floors")}</div>
      <label>Notes / observations</label><textarea id="hcNotes"></textarea><label>Corrective action</label><textarea id="hcAction"></textarea><button onclick="saveHoneyCleaning()">Save honey cleaning record</button>
    </section>`;
  }

  function historySection(){
    return `<section class="card"><h2>Honey Batch History</h2>
      <h3>Extractions</h3>${db.honeyExtractions.length?`<table><tr><th>Date</th><th>Batch</th><th>Apiary</th><th>Colonies</th><th>Supers</th><th>Condition</th></tr>${db.honeyExtractions.slice().reverse().map(e=>`<tr><td>${esc(e.date)}</td><td><b>${esc(e.batchCode)}</b></td><td>${esc(apiary(e.apiaryId)?.name||"")}</td><td>${(e.hiveIds||[]).map(id=>esc(hive(id)?.name||id)).join(", ")}</td><td>${fmt(e.superCount)}</td><td>${e.conditionPassed?'<span class="badge good">Pass</span>':'<span class="badge bad">Hold</span>'}</td></tr>`).join("")}</table>`:"<p>None yet.</p>"}
      <h3>Packing batches</h3>${db.honeyPackingRuns.length?`<table><tr><th>Date</th><th>Batch</th><th>Vessels</th><th>Jars</th><th>Remaining</th><th>BBE</th><th>Origin</th></tr>${db.honeyPackingRuns.slice().reverse().map(p=>`<tr><td>${esc(p.date)}</td><td><b>${esc(p.batchCode)}</b></td><td>${(p.vesselIds||[]).map(id=>esc(vessel(id)?.code||id)).join(", ")}</td><td>${fmt(p.jarCount)} × ${fmt(p.jarSizeG)}g</td><td>${fmt(p.remainingJars??p.jarCount)}</td><td>${esc(p.bbe||"")}</td><td>${esc(p.country||"")}</td></tr>`).join("")}</table>`:"<p>None yet.</p>"}
    </section>`;
  }

  function checkHtml(id,label){return `<label><input style="width:auto" type="checkbox" id="${id}"> ${esc(label)}</label>`}

  window.addHoneyApiary=()=>{
    const name=val("haName").trim();if(!name)return alert("Enter an apiary name.");
    db.honeyApiaries.push({id:uid("API"),name,location:val("haLocation").trim(),notes:val("haNotes").trim(),active:true});
    logActivity("Honey apiary added",name);save();render();
  };
  window.toggleHoneyApiary=id=>{const a=apiary(id);if(!a)return;a.active=a.active===false;save();render()};
  window.addHoneyHive=()=>{
    const name=val("hhName").trim(),apiaryId=val("hhApiary");if(!name||!apiaryId)return alert("Choose an apiary and enter a colony name.");
    db.honeyHives.push({id:uid("HIVE"),apiaryId,name,notes:val("hhNotes").trim(),active:true});
    logActivity("Honey colony added",`${apiary(apiaryId)?.name||""}: ${name}`);save();render();
  };
  window.toggleHoneyHive=id=>{const h=hive(id);if(!h)return;h.active=h.active===false;save();render()};
  window.addBeeTreatment=()=>{
    const hiveId=val("htHive"),product=val("htProduct").trim();if(!hiveId||!product)return alert("Choose a colony and enter the treatment/product.");
    const t={id:uid("TRT"),hiveId,product,dose:val("htDose").trim(),startDate:val("htStart"),endDate:val("htEnd"),harvestFrom:val("htHarvest"),supersPresent:val("htSupers")==="yes",restrictionFollowed:val("htRestriction")==="yes",notes:val("htNotes").trim()};
    db.beeTreatments.push(t);logActivity("Bee treatment recorded",`${hive(hiveId)?.name||""}: ${product}`,t.startDate||today());save();render();
  };
  window.addHoneyExtraction=()=>{
    const date=val("heDate"),apiaryId=val("heApiary"),hiveIds=selectedValues("heHives");
    if(!date||!apiaryId)return alert("Enter an extraction date and apiary.");
    if(!hiveIds.length)return alert("Select at least one colony included in this extraction.");
    const wrongApiary=hiveIds.some(id=>hive(id)?.apiaryId!==apiaryId);
    if(wrongApiary && !confirm("One or more selected colonies are recorded under a different apiary. Save anyway?"))return;
    const required=["heArea","heExtractor","heTools","heStrainers","heContainers","heFramesOk"];
    if(required.some(id=>!checked(id)) && !confirm("Not all pre-production checks are ticked. Save this extraction with incomplete checks?"))return;
    const warnings=hiveIds.flatMap(id=>hiveTreatmentWarnings(id,date));
    if(warnings.length && !confirm(`Treatment check warnings:\n\n${warnings.join("\n")}\n\nSave extraction anyway?`))return;
    const e={id:uid("HEX"),batchCode:honeyBatchCode("HEX",date,db.honeyExtractions),date,apiaryId,hiveIds,superCount:num("heSupers"),frameCount:num("heFrames"),conditionPassed:val("heCondition")==="pass",operator:val("heOperator").trim(),preChecks:{areaClean:checked("heArea"),extractorClean:checked("heExtractor"),toolsClean:checked("heTools"),strainersClean:checked("heStrainers"),containersClean:checked("heContainers"),framesAcceptable:checked("heFramesOk")},notes:val("heNotes").trim()};
    db.honeyExtractions.push(e);logActivity("Honey extraction recorded",`${e.batchCode}: ${hiveIds.length} colonies, ${e.superCount||0} supers`,date);save();render();
  };
  window.addHoneyVessel=()=>{
    const extractionId=val("hvExtraction"),code=val("hvCode").trim(),weightKg=num("hvWeight"),moisture=num("hvMoisture");
    if(!extractionId||!code)return alert("Choose an extraction and enter a vessel ID.");
    if(db.honeyVessels.some(v=>v.code.toLowerCase()===code.toLowerCase()))return alert("That vessel ID already exists. Use a unique vessel ID.");
    const readings=[];if(moisture>0)readings.push({date:today(),value:moisture});
    db.honeyVessels.push({id:uid("VES"),extractionId,code,weightKg,moistureReadings:readings,status:"Settling",notes:val("hvNotes").trim()});
    logActivity("Honey vessel added",`${code}: ${fmt(weightKg)} kg${moisture?`, ${fmt(moisture)}% moisture`:""}`);save();render();
  };
  window.addMoistureReading=id=>{
    const v=vessel(id);if(!v)return;
    const raw=prompt(`New moisture reading for ${v.code} (%)`);if(raw===null)return;
    const value=Number(raw);if(!(value>0&&value<100))return alert("Enter a valid moisture percentage.");
    const date=prompt("Reading date (YYYY-MM-DD)",today());if(date===null)return;
    v.moistureReadings=v.moistureReadings||[];v.moistureReadings.push({date:date||today(),value});
    logActivity("Honey moisture recorded",`${v.code}: ${fmt(value)}%`,date||today());save();render();
  };
  window.addHoneyPackingRun=()=>{
    const date=val("hpDate"),vesselIds=selectedValues("hpVessels"),jarSizeG=num("hpJarSize"),jarCount=num("hpJarCount"),totalPackedKg=num("hpWeight");
    if(!date||!vesselIds.length)return alert("Enter the packing date and select at least one vessel.");
    if(jarSizeG<=0||jarCount<=0)return alert("Enter a valid jar size and number of jars.");
    const required=["hpJars","hpWeights","hpClosed","hpLabel","hpBatch","hpBbeCheck","hpOrigin"];
    if(required.some(id=>!checked(id)) && !confirm("Not all packing/release checks are ticked. Save this batch with incomplete checks?"))return;
    const p={id:uid("HPK"),batchCode:honeyBatchCode("HNY",date,db.honeyPackingRuns),date,vesselIds,jarSizeG,jarCount,totalPackedKg,bbe:val("hpBbe"),country:val("hpCountry").trim(),moistureAtPacking:num("hpMoisture")||null,operator:val("hpOperator").trim(),remainingJars:jarCount,releaseChecks:{jarsLids:checked("hpJars"),fillWeights:checked("hpWeights"),closed:checked("hpClosed"),label:checked("hpLabel"),batchCode:checked("hpBatch"),bbe:checked("hpBbeCheck"),origin:checked("hpOrigin")},notes:val("hpNotes").trim()};
    db.honeyPackingRuns.push(p);vesselIds.forEach(id=>{const v=vessel(id);if(v)v.status="Packed"});
    const hrec={id:uid("HACCP"),date,type:"Honey Production",by:p.operator||db.settings?.defaultOperator||"James",result:required.every(checked)?"Pass":"N/A",notes:`${p.batchCode}: ${jarCount} x ${jarSizeG}g jars. Vessels: ${vesselIds.map(id=>vessel(id)?.code||id).join(", ")}. Origin: ${p.country||"not recorded"}.`,action:p.notes||"",createdAt:new Date().toISOString()};
    db.haccp.push(hrec);logActivity("Honey packed",`${p.batchCode}: ${jarCount} x ${jarSizeG}g`,date);save();render();
  };
  window.addHoneyDispatch=()=>{
    const run=packingRun(val("hdRun")),qty=num("hdQty"),customer=val("hdCustomer").trim();if(!run)return alert("Choose a packing batch.");
    if(!customer)return alert("Enter the recipient, stockist or market.");
    if(qty<=0||qty>Number(run.remainingJars??run.jarCount))return alert(`Enter a quantity up to ${run.remainingJars??run.jarCount}.`);
    run.remainingJars=Number(run.remainingJars??run.jarCount)-qty;
    const d={id:uid("HDSP"),date:val("hdDate"),packingRunId:run.id,customer,qty,notes:val("hdNotes").trim()};db.honeyDispatches.push(d);
    logActivity("Honey dispatched",`${run.batchCode}: ${qty} jars to ${customer}`,d.date);save();render();
  };
  window.saveHoneyCleaning=()=>{
    const items=[
      ["Extractor",checked("hcExtractor")],["Uncapping knife/fork",checked("hcUncapping")],["Uncapping tray",checked("hcTray")],["Strainers",checked("hcStrainers")],["Collection buckets",checked("hcCollection")],["Settling buckets/containers",checked("hcSettling")],["Honey gates",checked("hcGates")],["Food-contact utensils",checked("hcUtensils")],["Work surfaces/floors",checked("hcSurfaces")]
    ];
    const cleaned=items.filter(x=>x[1]).map(x=>x[0]);
    if(!cleaned.length && !confirm("No honey equipment is ticked as cleaned. Save this record anyway?"))return;
    const rec={id:uid("HACCP"),date:val("hcDate"),type:"Honey Cleaning",by:val("hcBy").trim(),result:val("hcResult"),notes:`Cleaned: ${cleaned.join(", ")||"none ticked"}${val("hcNotes").trim()?`. ${val("hcNotes").trim()}`:""}`,action:val("hcAction").trim(),createdAt:new Date().toISOString()};
    db.haccp.push(rec);logActivity("HACCP recorded",`Honey Cleaning: ${rec.result}`,rec.date);save();render();
  };

  // Re-render once so the dashboard and wrapped views are live immediately.
  render();
})();
