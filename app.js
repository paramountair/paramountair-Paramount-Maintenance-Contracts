let contracts = demoContracts.map(enrichContract);
let selectedContractId = contracts[0].id;

const $ = (id) => document.getElementById(id);
const money = (v) => Number(v || 0).toLocaleString("en-AU", {style:"currency", currency:"AUD", maximumFractionDigits:0});
const today = () => new Date("2026-06-24T09:00:00+10:00");

function visitsFromFrequency(freq, fallback) {
  const f = String(freq || "").toLowerCase();
  if (f.includes("month")) return 12;
  if (f.includes("quarter")) return 4;
  if (f.includes("six")) return 2;
  if (f.includes("annual")) return 1;
  return fallback || 4;
}

function endDate(start, months) {
  const d = new Date(start);
  d.setMonth(d.getMonth() + Number(months));
  return d;
}

function daysUntil(date) {
  return Math.ceil((date - today()) / (1000 * 60 * 60 * 24));
}

function calculateAssets(assets, targetMargin) {
  const rows = assets.map((a) => {
    const rule = COSTING_RULES[a.type] || COSTING_RULES["Split System"];
    const visits = visitsFromFrequency(a.frequency, rule.visits);
    const quantity = Number(a.quantity || 1);
    const labour = quantity * rule.labourHours * visits * LABOUR_RATE;
    const materials = quantity * rule.baseMaterials * visits;
    const vehicle = visits * VEHICLE_RATE;
    const directCost = labour + materials + vehicle;
    const admin = directCost * ADMIN_PERCENT;
    const overhead = directCost * OVERHEAD_PERCENT;
    const projectedCost = directCost + admin + overhead;
    return {...a, visits, quantity, labour, materials, vehicle, admin, overhead, projectedCost};
  });
  const projectedCost = rows.reduce((s,r) => s + r.projectedCost, 0);
  const marginDecimal = Number(targetMargin || DEFAULT_MARGIN) / 100;
  const annualValue = projectedCost / (1 - marginDecimal);
  const profit = annualValue - projectedCost;
  return {rows, projectedCost, annualValue, profit, monthly: annualValue / 12, margin: profit / annualValue * 100};
}

function enrichContract(contract) {
  const calc = calculateAssets(contract.assets, contract.margin);
  return {...contract, ...calc, endDate: endDate(contract.startDate, contract.term)};
}

function setView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
  $(view).classList.add("active");
  document.querySelector(`[data-view="${view}"]`).classList.add("active");
  renderAll();
}

document.querySelectorAll(".nav-link").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));

function dashboard() {
  const active = contracts.filter(c => c.status === "Active");
  const totalValue = active.reduce((s,c) => s + c.annualValue, 0);
  const totalProfit = active.reduce((s,c) => s + c.profit, 0);
  const expiry = (n) => contracts.filter(c => daysUntil(c.endDate) <= n && daysUntil(c.endDate) >= 0).length;
  return `<div class="page-head"><div><span class="pill navy">INTERNAL DASHBOARD</span><h1>Maintenance Contract Dashboard</h1><p>Overview of active maintenance contracts, revenue, profit and expiry risk.</p></div><button class="primary" onclick="setView('new-contract')">Create New Contract</button></div>
  <div class="kpi-grid">
    ${kpi("Total active maintenance contracts", active.length)}
    ${kpi("Total contracts value", money(totalValue))}
    ${kpi("Monthly recurring revenue", money(totalValue/12))}
    ${kpi("Projected gross profit", money(totalProfit))}
    ${kpi("Expiring in 30 days", expiry(30), true)}
    ${kpi("Expiring in 60 days", expiry(60), true)}
    ${kpi("Expiring in 90 days", expiry(90), true)}
    ${kpi("Proposal pipeline", money(contracts.filter(c=>c.status!=="Active").reduce((s,c)=>s+c.annualValue,0)))}
  </div>
  <div class="panel two-col"><div><h2>Contracts by status</h2>${statusBar("Active")} ${statusBar("Outstanding")} ${statusBar("Draft")}</div><div><h2>Recent generated contracts</h2>${contracts.map(c=>`<button class="contract-mini" onclick="selectContract('${c.id}')"><strong>${c.customerName}</strong><span>${money(c.annualValue)} · ${c.status}</span></button>`).join("")}</div></div>`;
}

function kpi(label, value, accent=false) { return `<div class="kpi ${accent?'accent':''}"><span>${label}</span><strong>${value}</strong></div>`; }
function statusBar(status) { const count = contracts.filter(c=>c.status===status).length; return `<div class="bar-row"><b>${status} ${count}</b><div class="bar"><span style="width:${Math.max(18,count*28)}%"></span></div></div>`; }
function selectContract(id) { selectedContractId = id; setView("contracts"); }
function selectedContract() { return contracts.find(c=>c.id===selectedContractId) || contracts[0]; }

function contractsView() {
  const c = selectedContract();
  return `<div class="page-head"><div><span class="pill navy">INTERNAL REVIEW</span><h1>Maintenance Contracts Generated</h1><p>Review outstanding contracts, pricing, cost and margin before issue.</p></div><button class="primary" onclick="setView('proposal')">View Customer Proposal</button></div>
  <div class="contract-layout"><div class="panel"><h2>Generated contracts</h2>${contracts.map(x=>`<button class="contract-row ${x.id===c.id?'selected':''}" onclick="selectContract('${x.id}')"><span><b>${x.customerName}</b><small>${x.id} · ${x.status}</small></span><strong>${money(x.annualValue)}</strong></button>`).join("")}</div>
  <div class="panel"><h2>${c.customerName}</h2><p class="muted">${c.siteAddress}</p><div class="detail-grid">${kpi("Annual sell price", money(c.annualValue))}${kpi("Projected cost", money(c.projectedCost))}${kpi("Projected profit", money(c.profit))}${kpi("Gross margin", c.margin.toFixed(1)+"%")}</div><h3>Cost breakdown</h3><table><thead><tr><th>Asset</th><th>Qty</th><th>Visits</th><th>Labour</th><th>Materials</th><th>Cost</th></tr></thead><tbody>${c.rows.map(r=>`<tr><td>${r.type}</td><td>${r.quantity}</td><td>${r.visits}</td><td>${money(r.labour)}</td><td>${money(r.materials)}</td><td>${money(r.projectedCost)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function newContractView() {
  return `<div class="page-head"><div><span class="pill navy">NEW PROPOSAL</span><h1>New Contract Set Up</h1><p>Enter customer details and upload an asset list. This prototype uses fake Paramount costing rules.</p></div></div>
  <div class="form-panel"><div class="form-grid">
    <label>Customer name<input id="fCustomer" value="Metro Health Precinct"></label><label>Site address<input id="fAddress" value="250 Collins Street, Melbourne VIC"></label><label>Contact person<input id="fContact" value="Property Manager"></label><label>Email<input id="fEmail" value="property@metrohealth.com.au"></label><label>Phone<input id="fPhone" value="03 8888 5555"></label><label>Start date<input id="fStart" type="date" value="2026-08-01"></label><label>Term months<input id="fTerm" type="number" value="12"></label><label>Target margin %<input id="fMargin" type="number" value="38"></label><label>Status<select id="fStatus"><option>Draft</option><option>Outstanding</option><option>Active</option></select></label>
  </div><h2>Uploads</h2><div class="upload-grid"><div class="upload-box"><b>Upload asset list CSV</b><input id="assetUpload" type="file" accept=".csv,.json"><small>CSV columns: type, quantity, frequency. Upload works in browser for this demo.</small></div><div class="upload-box"><b>Upload customer documents</b><input type="file" multiple><small>Stored visually only in this static prototype.</small></div></div>
  <h2>Asset list</h2><div id="assetEditor"></div><button class="secondary" onclick="addAssetRow()">Add asset row</button><button class="primary" onclick="generateContract()">Generate Paramount Proposal</button></div>`;
}

let draftAssets = [{type:"Chiller", quantity:1, frequency:"Monthly"},{type:"Air Handling Unit", quantity:12, frequency:"Quarterly"},{type:"Exhaust Fan", quantity:15, frequency:"Six Monthly"}];
function renderAssetEditor() { const el = $("assetEditor"); if(!el) return; el.innerHTML = draftAssets.map((a,i)=>`<div class="asset-edit"><select onchange="draftAssets[${i}].type=this.value">${Object.keys(COSTING_RULES).map(t=>`<option ${t===a.type?'selected':''}>${t}</option>`).join("")}</select><input type="number" value="${a.quantity}" onchange="draftAssets[${i}].quantity=this.value"><select onchange="draftAssets[${i}].frequency=this.value"><option ${a.frequency==='Monthly'?'selected':''}>Monthly</option><option ${a.frequency==='Quarterly'?'selected':''}>Quarterly</option><option ${a.frequency==='Six Monthly'?'selected':''}>Six Monthly</option><option ${a.frequency==='Annual'?'selected':''}>Annual</option></select></div>`).join(""); }
function addAssetRow(){ draftAssets.push({type:"Split System", quantity:1, frequency:"Quarterly"}); renderAssetEditor(); }
function generateContract(){ const contract = enrichContract({id:`PMA-${26000+contracts.length+1}`, customerName:$("fCustomer").value, siteAddress:$("fAddress").value, contactPerson:$("fContact").value, email:$("fEmail").value, phone:$("fPhone").value, startDate:$("fStart").value, term:Number($("fTerm").value), margin:Number($("fMargin").value), status:$("fStatus").value, assets: draftAssets.map(a=>({...a}))}); contracts.unshift(contract); selectedContractId = contract.id; setView("proposal"); }

function settingsView(){ return `<div class="page-head"><div><span class="pill navy">PRICING ENGINE</span><h1>Costing Rules</h1><p>Prototype rates used to calculate labour, materials, overhead and target margin.</p></div></div><div class="panel"><table><thead><tr><th>Asset type</th><th>Labour hrs / visit</th><th>Default visits</th><th>Materials / visit</th></tr></thead><tbody>${Object.entries(COSTING_RULES).map(([k,v])=>`<tr><td>${k}</td><td>${v.labourHours}</td><td>${v.visits}</td><td>${money(v.baseMaterials)}</td></tr>`).join("")}</tbody></table><p class="muted">Labour rate ${money(LABOUR_RATE)}/hr · Vehicle ${money(VEHICLE_RATE)}/visit · Admin ${ADMIN_PERCENT*100}% · Overhead ${OVERHEAD_PERCENT*100}%</p></div>`; }

function proposalView(){ const c=selectedContract(); return `<div class="page-head no-print"><div><span class="pill navy">CUSTOMER OUTPUT</span><h1>Proposal Preview</h1><p>This is the client-facing proposal. Use the button below to save this as PDF.</p></div><div><button class="secondary" onclick="downloadProposal()">Download HTML</button><button class="primary" onclick="printProposal()">Print / Save as PDF</button></div></div>${proposalDocument(c)}`; }

function proposalDocument(c){ return `<article class="proposal-doc" id="proposalDoc">
<section class="proposal-page cover"><div class="proposal-top"><div><div class="proposal-logo"><span>P</span><b>Paramount</b></div><p>Comfort Engineered for Australia</p></div><div class="proposal-ref">${c.id}</div></div><div class="cover-title"><span class="pill orange">PREVENTATIVE MAINTENANCE PROPOSAL</span><h1>${c.customerName}</h1><p>${c.siteAddress}</p></div><div class="cover-summary"><div><span>Annual contract value</span><strong>${money(c.annualValue)}</strong></div><div><span>Contract term</span><strong>${c.term} months</strong></div><div><span>Prepared date</span><strong>24 June 2026</strong></div></div></section>
<section class="proposal-page"><h1>Executive Summary</h1><p>Paramount Airconditioning has prepared a preventative maintenance program for ${c.customerName}. The program is designed to maintain HVAC reliability, support asset life and reduce the likelihood of unplanned equipment downtime.</p><p>The proposed service schedule covers ${assetSentence(c.assets)}. Maintenance will be completed by qualified technicians and documented through service reports following each attendance.</p><div class="proposal-card-grid"><div><span>Total maintained assets</span><strong>${c.assets.reduce((s,a)=>s+Number(a.quantity),0)}</strong></div><div><span>Annual service visits</span><strong>${c.rows.reduce((s,r)=>s+r.visits,0)}</strong></div><div><span>Monthly equivalent</span><strong>${money(c.monthly)}</strong></div></div></section>
<section class="proposal-page"><h1>Asset Schedule</h1><table><thead><tr><th>Asset Type</th><th>Quantity</th><th>Frequency</th><th>Annual Visits</th></tr></thead><tbody>${c.rows.map(r=>`<tr><td>${r.type}</td><td>${r.quantity}</td><td>${r.frequency}</td><td>${r.visits}</td></tr>`).join("")}</tbody></table><p class="muted">A detailed equipment schedule may be attached as Appendix A where manufacturer, model, serial number and location details are available.</p></section>
<section class="proposal-page"><h1>Maintenance Methodology</h1>${c.assets.map(a=>methodBlock(a)).join("")}</section>
<section class="proposal-page"><h1>Annual Service Calendar</h1><p>The maintenance program is structured to provide regular attendance throughout the contract term.</p>${calendar(c)}</section>
<section class="proposal-page"><h1>Commercial Summary</h1><table><tbody><tr><th>Client</th><td>${c.customerName}</td></tr><tr><th>Site</th><td>${c.siteAddress}</td></tr><tr><th>Contract term</th><td>${c.term} months</td></tr><tr><th>Annual preventative maintenance value</th><td><strong>${money(c.annualValue)} + GST</strong></td></tr><tr><th>Monthly equivalent</th><td>${money(c.monthly)} + GST</td></tr></tbody></table><p>This proposal is based on the supplied asset schedule and excludes major repairs, replacement works, after-hours attendance and works outside the agreed preventative maintenance scope unless stated otherwise.</p></section>
<section class="proposal-page acceptance"><h1>Acceptance</h1><p>By signing below, the client confirms acceptance of this preventative maintenance proposal.</p><div class="sign-grid"><div><b>Client acceptance</b><span>Name</span><span>Position</span><span>Signature</span><span>Date</span></div><div><b>Paramount Airconditioning</b><span>Name</span><span>Position</span><span>Signature</span><span>Date</span></div></div><footer>Paramount Airconditioning (Aust) Pty Ltd · 39–41 Geddes Street, Mulgrave VIC 3170 · paramountair.com.au</footer></section>
</article>`; }

function assetSentence(assets){ return assets.map(a=>`${a.quantity} ${a.type}${Number(a.quantity)>1?'s':''}`).join(", "); }
function methodBlock(a){ const rule=COSTING_RULES[a.type] || COSTING_RULES["Split System"]; return `<div class="method"><h2>${a.type}</h2><p>${a.frequency} preventative maintenance for ${a.quantity} asset${Number(a.quantity)>1?'s':''}, including:</p><ul>${rule.scope.map(s=>`<li>${s}</li>`).join("")}</ul></div>`; }
function calendar(c){ const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `<div class="service-calendar">${months.map((m,i)=>`<div><b>${m}</b><span>${c.rows.filter(r => (r.frequency.includes('Monthly')) || (r.frequency.includes('Quarterly') && i%3===0) || (r.frequency.includes('Six') && i%6===0) || (r.frequency.includes('Annual') && i===0)).map(r=>r.type).join('<br>') || '—'}</span></div>`).join("")}</div>`; }

function printProposal(){ window.print(); }
function downloadProposal(){ const html = `<!doctype html><html><head><meta charset="UTF-8"><title>${selectedContract().customerName} Proposal</title><link rel="stylesheet" href="styles.css"></head><body>${proposalDocument(selectedContract())}</body></html>`; const blob=new Blob([html],{type:"text/html"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${selectedContract().customerName.replaceAll(' ','-')}-Maintenance-Proposal.html`; a.click(); }

function renderAll(){ $("dashboard").innerHTML=dashboard(); $("contracts").innerHTML=contractsView(); $("new-contract").innerHTML=newContractView(); $("proposal").innerHTML=proposalView(); $("settings").innerHTML=settingsView(); renderAssetEditor(); }
renderAll();
