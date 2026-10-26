/* Negotiation call guide, inspired by Chris Voss's Never Split the Difference.
   Original practical wording, not reproduced book text. No customer data changes. */
(function(){
"use strict";
const steps=[
["1. Get the right person","Calm opening","Hiya, James here from Craic Larder. I'm a butcher myself and make seasonings for meat and everyday cooking. Who looks after new products for the shop?","Ask, then stop talking."],
["2. Understand their world","Tactical empathy + label","It sounds like you're juggling a lot of suppliers just now. How do you normally decide whether to try a new product?","Don't label a feeling unless you have a reason. Listen before pitching."],
["3. Let them talk","Mirror","Shop: ‘We don't have much shelf space.’\nYou: ‘Not much shelf space?’","Repeat 1–3 important words as a question, then pause. Avoid sounding like a parrot."],
["4. Find the real objection","Calibrated how/what question","What would you need to see for a wee trial to be worth the shelf space?","Learn whether the issue is demand, margin, shelf space, price or timing."],
["5. Give them control","No-oriented question","Would it be a bad idea to send over a short price list and a couple of serving ideas?","A comfortable no can open a conversation. Don't use it as a trick."],
["6. Present a relevant offer","Specific, low-risk trial","You sell a lot of chicken and steak, so Salt / Chilli and Garlic / Herb could be good starting points. Would a small mixed trial suit?","Wholesale £2.50/pouch. Current minimum 15 mixed; confirm delivery costs before promising."],
["7. Agree a next step","Commitment, not a vague yes","What would be the easiest way to get a small first order sorted? Or would you prefer I send the details and ring you on Thursday?","Confirm quantities, contact, delivery and date. ‘Sounds good’ is not an order."]
];
const objections=[
["Too expensive","Sounds like margin is the concern. What margin would you normally need on something like this?","Don't discount immediately. Ask about their retail price and expected return."],
["No space","Sounds like space is tight. Which products would a new seasoning have to outperform to earn a spot?","Offer a small trial only if it genuinely fits."],
["We already stock seasonings","You've already got seasonings? How are those selling for you?","Understand what's working before explaining Craic's difference."],
["Send me an email","Of course. What would be most useful in it so I'm not sending you a load of stuff you don't need?","Agree a specific follow-up day."],
["Not interested","No worries at all. Is it the category itself, or just not the right time?","Respect a clear no; don't badger."],
["Need to ask the owner","Absolutely. What does the owner usually want to know before deciding on a new supplier?","Get decision-maker name and permission to follow up."],
["We've been quiet","Aye, sounds like footfall's been a challenge. What tends to sell well for you even when it's quieter?","Don't assume Christmas guarantees sales."]
];
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function markup(){
return '<section class="card" style="margin:0"><h3>Negotiation cheat sheet · Craic Larder</h3><p class="muted">Inspired by Chris Voss. Your job is to understand the buyer, not win an argument. Keep it natural and never force a technique.</p><details open><summary><b>7-step call flow</b></summary>'+steps.map(s=>'<div style="padding:12px 0;border-bottom:1px solid #ddd"><b>'+esc(s[0])+'</b><p class="muted" style="margin:4px 0">'+esc(s[1])+'</p><p style="white-space:pre-line">'+esc(s[2])+'</p><small class="muted">'+esc(s[3])+'</small></div>').join("")+'</details><details><summary><b>Objection responses</b></summary>'+objections.map(o=>'<div style="padding:10px 0;border-bottom:1px solid #ddd"><b>'+esc(o[0])+'</b><p>'+esc(o[1])+'</p><small class="muted">'+esc(o[2])+'</small></div>').join("")+'</details><details><summary><b>Before you hang up</b></summary><p>Did I learn the real objection? Did I ask for a trial or agree a specific next step? Have I set a follow-up date?</p><p><b>Call outcomes:</b> No answer · Interested · Send information · Samples · Order agreed · Call back · Not interested.</p></details><p class="muted small">These are adapted selling prompts, not direct quotations or a substitute for reading the book.</p></section>';
}
document.addEventListener("click",function(e){
const btn=e.target.closest("#salesCheat, #whOpenCheat");if(!btn)return;
e.preventDefault();e.stopImmediatePropagation();
const target=document.getElementById(btn.id==="whOpenCheat"?"whScriptContent":"salesExtras");if(target)target.innerHTML=markup();
},true);
})();